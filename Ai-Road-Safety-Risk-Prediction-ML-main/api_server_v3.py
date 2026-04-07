from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
import joblib
import os
import httpx

# Initialize FastAPI
app = FastAPI(title="Safe Drive AI - Road Quality API", version="2.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
MODEL_DIR = "road_quality_models"

try:
    ensemble_model = joblib.load(os.path.join(MODEL_DIR, "road_quality_ensemble_final.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler_final.pkl"))
    metadata = joblib.load(os.path.join(MODEL_DIR, "model_metadata_final.pkl"))
    MODEL_LOADED = True
    print("✓ Model loaded successfully!")
    print(f"  Accuracy: {metadata['test_accuracy']*100:.2f}%")
except Exception as e:
    MODEL_LOADED = False
    print(f"⚠ Model loading failed: {e}")

class ChatRequest(BaseModel):
    message: str
    risk_level: str | None = None
    weather: str | None = None
    speed: str | None = None
    road: str | None = None


class ChatResponse(BaseModel):
    reply: str


CHATBOT_API_KEY_ENV_VAR = "CHATBOT_API_KEY"
CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

def extract_image_features(img):
    """Extract features from image"""
    gray = np.mean(img, axis=2)
    
    features = [
        np.mean(gray),
        np.std(gray),
        np.min(gray),
        np.max(gray),
        np.median(gray),
        np.percentile(gray, 25),
        np.percentile(gray, 75),
        np.max(gray) - np.min(gray),
        np.std(gray) / (np.mean(gray) + 1e-5),
    ]
    
    edges_x = np.abs(gray[:, :-1] - gray[:, 1:]).mean()
    edges_y = np.abs(gray[:-1, :] - gray[1:, :]).mean()
    features.extend([edges_x, edges_y, edges_x + edges_y])
    
    lbp_binary = []
    for i in range(1, gray.shape[0] - 1):
        for j in range(1, gray.shape[1] - 1):
            center = gray[i, j]
            neighbors = gray[i-1:i+2, j-1:j+2].flatten()
            lbp_binary.append(np.sum(neighbors > center))
    
    features.append(np.mean(lbp_binary))
    features.append(np.std(lbp_binary))
    
    r_channel = img[:, :, 0]
    g_channel = img[:, :, 1]
    b_channel = img[:, :, 2]
    
    features.extend([
        np.std(r_channel),
        np.std(g_channel),
        np.std(b_channel),
        np.mean(np.abs(r_channel - g_channel)),
        np.mean(np.abs(g_channel - b_channel)),
        np.mean(np.abs(r_channel - b_channel)),
    ])
    
    very_dark = np.sum(gray < 0.2) / gray.size
    dark = np.sum(gray < 0.4) / gray.size
    features.extend([very_dark, dark])
    
    hist, _ = np.histogram(gray, bins=32, range=(0, 1))
    hist = hist / np.sum(hist)
    entropy = -np.sum((hist[hist > 0]) * np.log2(hist[hist > 0]))
    features.append(entropy)
    
    top_half = gray[:gray.shape[0]//2, :].mean()
    bottom_half = gray[gray.shape[0]//2:, :].mean()
    left_half = gray[:, :gray.shape[1]//2].mean()
    right_half = gray[:, gray.shape[1]//2:].mean()
    features.extend([top_half, bottom_half, left_half, right_half])
    
    laplacian = np.zeros_like(gray)
    for i in range(1, gray.shape[0]-1):
        for j in range(1, gray.shape[1]-1):
            laplacian[i, j] = (4 * gray[i, j] - 
                              gray[i-1, j] - gray[i+1, j] - 
                              gray[i, j-1] - gray[i, j+1])
    
    features.append(np.mean(np.abs(laplacian)))
    features.append(np.std(laplacian))
    
    hist, _ = np.histogram(gray, bins=16, range=(0, 1))
    hist = hist / np.sum(hist)
    features.extend(hist.tolist())
    
    return np.array(features)

def preprocess_image(image_data):
    """Convert uploaded image to normalized array"""
    # Read image
    img = Image.open(BytesIO(image_data)).convert('RGB')
    
    # Resize to 224x224
    img = img.resize((224, 224), Image.Resampling.LANCZOS)
    
    # Convert to numpy array and normalize
    img_array = np.array(img) / 255.0
    
    return img_array

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": MODEL_LOADED,
        "accuracy": metadata['test_accuracy'] * 100 if MODEL_LOADED else None
    }

@app.post("/api/predict-road-quality")
async def predict_road_quality(file: UploadFile = File(...)):
    """
    Predict road quality from uploaded image
    
    Returns:
    - classification: "Normal Road" or "Pothole"
    - confidence: 0-100
    - is_pothole: boolean
    - risk_level: "high" or "low"
    - assessment: detailed description
    - recommendations: list of recommendations
    """
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Read image
        image_data = await file.read()
        img_array = preprocess_image(image_data)
        
        # Extract features
        features = extract_image_features(img_array).reshape(1, -1)
        
        # Normalize
        features_scaled = scaler.transform(features)
        
        # Predict
        prediction = ensemble_model.predict(features_scaled)[0]
        probability = ensemble_model.predict_proba(features_scaled)[0]
        
        confidence = max(probability) * 100
        is_pothole = prediction == 1
        
        # Generate assessment
        if is_pothole:
            assessment = "Pothole detected! This area requires road maintenance."
            recommendations = [
                "Schedule immediate road repair",
                "Inform local authorities",
                "Avoid this route if possible",
                "Drive slowly and carefully in this area",
            ]
            risk_level = "high"
        else:
            assessment = "Road condition is normal. Safe to proceed."
            recommendations = [
                "Road is in good condition",
                "Normal driving is safe",
                "Continue with standard precautions",
            ]
            risk_level = "low"
        
        return {
            "classification": "Pothole" if is_pothole else "Normal Road",
            "confidence": float(confidence),
            "is_pothole": bool(is_pothole),
            "risk_level": risk_level,
            "probability_normal": float(probability[0] * 100),
            "probability_pothole": float(probability[1] * 100),
            "assessment": assessment,
            "recommendations": recommendations,
            "model_accuracy": metadata['test_accuracy'] * 100,
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

@app.post("/api/predict")
async def predict_risk():
    """Risk prediction endpoint (weather, traffic, road combined)"""
    return {
        "status": "ready",
        "model_available": MODEL_LOADED,
    }


def build_chat_prompt(payload: ChatRequest) -> str:
    context_lines = []
    if payload.risk_level and payload.risk_level.lower() != "unknown":
        context_lines.append(f"Current risk level reported by system: {payload.risk_level}.")
    if payload.weather and payload.weather.lower() != "unknown":
        context_lines.append(f"Weather conditions: {payload.weather}.")
    if payload.speed and payload.speed.lower() != "unknown":
        context_lines.append(f"Vehicle speed: {payload.speed}.")
    if payload.road and payload.road.lower() != "unknown":
        context_lines.append(f"Road surface details: {payload.road}.")

    context_block = "\n".join(context_lines)
    if context_block:
        context_block = f"Context from telemetry:\n{context_block}\n\n"

    return (
        f"{context_block}Driver message: {payload.message}\n\n"
        "Provide a concise, practical safety response."
    )


def fallback_reply(payload: ChatRequest) -> str:
    hints = []
    if payload.risk_level and payload.risk_level.lower() == "high":
        hints.append("Reduce speed immediately and increase following distance.")
    if payload.weather and payload.weather.lower() in {"rain", "storm", "heavy"}:
        hints.append("Use headlights and maintain gentle steering to avoid hydroplaning.")
    if payload.road and "pothole" in payload.road.lower():
        hints.append("Slow down before the damaged section and report it if possible.")
    if not hints:
        hints.append("Stay alert, follow posted limits, and adjust driving for current conditions.")

    return " ".join(hints)


async def call_chat_completion(payload: ChatRequest) -> str:
    api_key = os.getenv(CHATBOT_API_KEY_ENV_VAR)
    if not api_key:
        return fallback_reply(payload)

    prompt = build_chat_prompt(payload)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body = {
        "model": "mixtral-8x7b-32768",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Safety AI, an assistant that gives clear, actionable road safety guidance. "
                    "Respond with short paragraphs and bullet-like sentences when helpful."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.3,
        "max_tokens": 256,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(CHAT_COMPLETIONS_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                content = message.get("content")
                if content:
                    return content.strip()
    except httpx.HTTPError:
        pass

    return fallback_reply(payload)


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    reply = await call_chat_completion(payload)
    return ChatResponse(reply=reply)

@app.get("/api/model-info")
async def model_info():
    """Get model information"""
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_type": metadata.get('model_type', 'Unknown'),
        "base_models": metadata.get('base_models', []),
        "test_accuracy": metadata['test_accuracy'] * 100,
        "sensitivity": metadata['sensitivity'] * 100,
        "specificity": metadata['specificity'] * 100,
        "f1_score": metadata['f1_score'],
        "training_date": metadata.get('training_date', 'Unknown'),
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Safe Drive AI - Road Quality Detection API",
        "version": "2.0",
        "accuracy": f"{metadata['test_accuracy']*100:.2f}%" if MODEL_LOADED else "N/A",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict-road-quality",
            "model_info": "/api/model-info",
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*70)
    print("🚀 Starting Safe Drive AI - Road Quality API Server")
    print("="*70)
    if MODEL_LOADED:
        print(f"✓ Model loaded (Accuracy: {metadata['test_accuracy']*100:.2f}%)")
    else:
        print("⚠ Model not loaded - predictions will fail")
    print("Server running on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("="*70 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
