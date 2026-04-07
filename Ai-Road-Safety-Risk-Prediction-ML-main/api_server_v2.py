from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import io
import numpy as np
import cv2
from PIL import Image
import httpx

# Import prediction modules (lazy load to avoid startup errors)
# import predict_road_quality

app = FastAPI(title="Safe Drive AI API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Pydantic Models ==============

class PredictionInput(BaseModel):
    rainfall: str
    fogLevel: str
    temperature: float
    trafficDensity: str
    vehicleSpeed: float
    roadSurface: str
    timeOfDay: str

class PredictionResult(BaseModel):
    riskLevel: str
    score: float
    recommendation: str
    factors: list[str]

class RoadQualityPredictionResult(BaseModel):
    classification: str
    confidence: float
    risk_level: str
    is_pothole: bool
    quality_assessment: str
    recommendations: list[str]

class ChatRequest(BaseModel):
    message: str
    risk_level: str | None = None
    weather: str | None = None
    speed: str | None = None
    road: str | None = None

class ChatResponse(BaseModel):
    reply: str

# ============== Road Risk Prediction ==============

def predict_risk(input_data: PredictionInput) -> PredictionResult:
    """
    Enhanced prediction engine using accident dataset insights
    """
    # Validate input values
    valid_rainfall = {"none", "light", "moderate", "heavy"}
    valid_fog = {"low", "medium", "high"}
    valid_traffic = {"low", "medium", "high"}
    valid_surface = {"dry", "wet", "icy", "damaged"}
    valid_time = {"morning", "afternoon", "night"}
    
    if input_data.rainfall not in valid_rainfall:
        raise ValueError(f"rainfall must be one of {valid_rainfall}")
    if input_data.fogLevel not in valid_fog:
        raise ValueError(f"fogLevel must be one of {valid_fog}")
    if input_data.trafficDensity not in valid_traffic:
        raise ValueError(f"trafficDensity must be one of {valid_traffic}")
    if input_data.roadSurface not in valid_surface:
        raise ValueError(f"roadSurface must be one of {valid_surface}")
    if input_data.timeOfDay not in valid_time:
        raise ValueError(f"timeOfDay must be one of {valid_time}")
    if not (0 <= input_data.temperature <= 60):
        raise ValueError("temperature must be between 0 and 60 Celsius")
    if not (0 <= input_data.vehicleSpeed <= 200):
        raise ValueError("vehicleSpeed must be between 0 and 200 km/h")
    
    score = 0
    factors = []

    # Rainfall impact
    rainfall_weights = {"none": 0, "light": 15, "moderate": 25, "heavy": 35}
    score += rainfall_weights.get(input_data.rainfall, 0)
    if input_data.rainfall == "heavy":
        factors.append("Heavy rainfall increases hydroplaning risk")
    elif input_data.rainfall == "moderate":
        factors.append("Moderate rain reduces road grip")
    elif input_data.rainfall == "light":
        factors.append("Light rain reduces visibility slightly")

    # Fog impact
    fog_weights = {"low": 0, "medium": 15, "high": 30}
    score += fog_weights.get(input_data.fogLevel, 0)
    if input_data.fogLevel in ["medium", "high"]:
        factors.append(f"{'Dense' if input_data.fogLevel == 'high' else 'Moderate'} fog limits visibility")

    # Temperature extremes
    if input_data.temperature < 0:
        score += 25
        factors.append("Freezing temperature - ice on road surface")
    elif input_data.temperature < 5:
        score += 15
        factors.append("Near-freezing conditions - potential ice formation")
    elif input_data.temperature > 45:
        score += 12
        factors.append("Extreme heat - risk of tire blowouts")

    # Traffic density
    traffic_weights = {"low": 0, "medium": 10, "high": 20}
    score += traffic_weights.get(input_data.trafficDensity, 0)
    if input_data.trafficDensity == "high":
        factors.append("High traffic - collision chain reaction risks")

    # Vehicle speed
    if input_data.vehicleSpeed > 120:
        score += 25
        factors.append("Excessive speed - drastically reduces reaction time")
    elif input_data.vehicleSpeed > 100:
        score += 18
        factors.append("High speed reduces reaction time")
    elif input_data.vehicleSpeed > 80:
        score += 8
        factors.append("Moderate-high speed reduces control margin")

    # Road surface condition
    surface_weights = {"dry": 0, "wet": 18, "icy": 35, "damaged": 28}
    score += surface_weights.get(input_data.roadSurface, 0)
    if input_data.roadSurface == "icy":
        factors.append("Icy road - extreme hazard")
    elif input_data.roadSurface == "damaged":
        factors.append("Damaged road - major structural hazard")
    elif input_data.roadSurface == "wet":
        factors.append("Wet road reduces braking efficiency")

    # Time of day impact
    if input_data.timeOfDay == "night":
        score += 12
        factors.append("Nighttime - visibility and fatigue risks")

    score = min(100, max(0, score))

    if score >= 70:
        risk_level = "high"
        recommendation = "⚠️ HIGH RISK — Reduce speed below 40 km/h, increase following distance, ensure headlights on."
    elif score >= 45:
        risk_level = "medium"
        recommendation = "⚡ MODERATE RISK — Drive cautiously, reduce speed by 10-15%, maintain 4-second distance."
    else:
        risk_level = "low"
        recommendation = "✅ LOW RISK — Safe to travel, maintain normal precautions."

    return PredictionResult(
        riskLevel=risk_level,
        score=score,
        recommendation=recommendation,
        factors=factors if factors else ["No specific risk factors identified"]
    )

# ============== Road Quality Prediction ==============

def assess_road_quality_description(confidence: float, is_pothole: bool) -> tuple[str, list[str]]:
    """
    Generate assessment description and recommendations based on prediction
    """
    if is_pothole:
        if confidence > 90:
            assessment = "🚨 SEVERE POTHOLE DETECTED - Road condition is critical"
            recommendations = [
                "Use alternate route if available",
                "Reduce speed to 15-20 km/h",
                "Report to local authorities for repair",
                "Avoid sudden steering movements",
                "Check tire condition after crossing"
            ]
        elif confidence > 75:
            assessment = "⚠️ POTHOLE DETECTED - Significant road damage"
            recommendations = [
                "Reduce speed to 25-30 km/h",
                "Watch for additional potholes nearby",
                "Report to municipality",
                "Consider alternate route"
            ]
        else:
            assessment = "⚠️ MINOR POTHOLE DETECTED - Small road damage"
            recommendations = [
                "Drive carefully, watch for potholes",
                "Reduce speed slightly (30-40 km/h)",
                "Report if it worsens"
            ]
    else:
        if confidence > 90:
            assessment = "✅ EXCELLENT CONDITION - Road surface is in excellent condition"
            recommendations = [
                "Safe to drive normally",
                "Maintain standard safety precautions",
                "Monitor for weather changes",
                "Enjoy smooth driving experience"
            ]
        elif confidence > 75:
            assessment = "✅ GOOD CONDITION - Road is well-maintained"
            recommendations = [
                "Safe to drive with normal precautions",
                "Maintain standard speed limits",
                "Watch for any changes in road condition"
            ]
        else:
            assessment = "✓ ACCEPTABLE CONDITION - Road is manageable"
            recommendations = [
                "Drive normally but stay alert",
                "Minor wear visible but acceptable",
                "Monitor for deterioration"
            ]
    
    return assessment, recommendations


# ============== API Endpoints ==============

@app.post("/api/predict", response_model=PredictionResult)
async def predict(input_data: PredictionInput):
    """Endpoint to predict road accident risk based on conditions"""
    try:
        result = predict_risk(input_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/predict-road-quality", response_model=RoadQualityPredictionResult)
async def predict_road_quality_endpoint(file: UploadFile = File(...)):
    """
    Endpoint to predict road quality from uploaded image
    
    Returns:
    - classification: Normal Road or Pothole
    - confidence: Confidence percentage
    - risk_level: low or high
    - recommendations: List of safety recommendations
    """
    try:
        # Lazy load the predictor
        import predict_road_quality
        
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read image file
        contents = await file.read()
        image_array = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not process image")

        # Get prediction
        prediction = predict_road_quality.predict_road_quality(img)

        if "error" in prediction:
            raise HTTPException(status_code=500, detail=prediction["error"])

        # Generate assessment
        assessment, recommendations = assess_road_quality_description(
            prediction["confidence"],
            prediction["is_pothole"]
        )

        return RoadQualityPredictionResult(
            classification=prediction["classification"],
            confidence=prediction["confidence"],
            risk_level=prediction["risk_level"],
            is_pothole=prediction["is_pothole"],
            quality_assessment=assessment,
            recommendations=recommendations
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "message": "Safe Drive AI API is running"}


@app.get("/api/dataset-stats")
async def dataset_stats():
    """Return stats from the US Accidents dataset"""
    return {
        "totalAccidents": 4000000,
        "topCause": "Weather & Road Conditions",
        "weekdayRisk": "High (30% more accidents)",
        "nightRiskIncrease": "3x more accidents at night",
        "weatherImpact": {
            "rain": "increases accidents by 45%",
            "fog": "increases accidents by 55%",
            "snow": "increases accidents by 120%",
            "extremeTemp": "increases accidents by 25%"
        },
        "speedImpact": "accidents increase exponentially above 100 km/h"
    }


@app.get("/api/model-info")
async def model_info():
    """Return information about trained models"""
    return {
        "roadQualityModel": {
            "type": "CNN with TensorFlow or Random Forest",
            "classes": ["Normal Road", "Pothole"],
            "inputSize": "224x224 RGB",
            "capabilities": [
                "Detect potholes in road images",
                "Assess road surface quality",
                "Provide safety recommendations",
                "Calculate confidence scores"
            ]
        },
        "riskPredictionModel": {
            "type": "Rule-based ML",
            "inputs": [
                "Weather conditions (rainfall, fog)",
                "Temperature",
                "Traffic density",
                "Vehicle speed",
                "Road surface",
                "Time of day"
            ],
            "output": "Risk score (0-100) and level (low/medium/high)"
        }
    }


# ============== Chatbot Endpoint ==============

def build_chat_prompt(payload: ChatRequest) -> str:
    context_lines = []
    if payload.risk_level and payload.risk_level.lower() != "unknown":
        context_lines.append(f"Current risk level: {payload.risk_level}.")
    if payload.weather and payload.weather.lower() != "unknown":
        context_lines.append(f"Weather: {payload.weather}.")
    if payload.speed and payload.speed.lower() != "unknown":
        context_lines.append(f"Speed: {payload.speed}.")
    if payload.road and payload.road.lower() != "unknown":
        context_lines.append(f"Road: {payload.road}.")

    context_block = "\n".join(context_lines)
    if context_block:
        context_block = f"Context:\n{context_block}\n\n"

    return f"{context_block}Driver: {payload.message}\n\nProvide brief safety advice."


def fallback_reply(payload: ChatRequest) -> str:
    hints = []
    if payload.risk_level and payload.risk_level.lower() == "high":
        hints.append("Reduce speed and increase following distance.")
    if payload.weather and payload.weather.lower() in {"rain", "storm", "heavy"}:
        hints.append("Use headlights and avoid sudden movements.")
    if payload.road and "pothole" in payload.road.lower():
        hints.append("Slow down and report damaged road sections.")
    if not hints:
        hints.append("Stay alert and follow posted speed limits.")
    return " ".join(hints)


async def call_chat_completion(payload: ChatRequest) -> str:
    api_key = "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"
    
    prompt = build_chat_prompt(payload)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://safe-drive-ai.com",
        "X-Title": "Safe Drive AI"
    }
    body = {
        "model": "deepseek/deepseek-r1-0528:free",
        "messages": [
            {
                "role": "system",
                "content": "You are Safety AI, a road safety assistant. Give clear, brief advice."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 256,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=body
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if choices:
                content = choices[0].get("message", {}).get("content")
                if content:
                    return content.strip()
    except:
        pass
    return fallback_reply(payload)


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    reply = await call_chat_completion(payload)
    return ChatResponse(reply=reply)


if __name__ == "__main__":
    import uvicorn
    print("🚗 Starting Safe Drive AI API Server on http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("💬 Chatbot endpoint: POST /chat")
    uvicorn.run(app, host="0.0.0.0", port=8000)
