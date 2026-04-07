"""
Working API Server for Safe Drive AI
Simple FastAPI implementation for testing
"""

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
import json

app = FastAPI(
    title="Safe Drive AI - Working API",
    description="Road safety and quality prediction system",
    version="3.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "message": "Safe Drive AI API is running",
        "version": "3.0"
    }

# Get dataset stats
@app.get("/api/dataset-stats")
async def dataset_stats():
    return {
        "totalAccidents": 4000000,
        "topCause": "Weather & Road Conditions",
        "weekdayRisk": "High (30% more accidents)",
        "nightRiskIncrease": "3x more accidents at night",
        "weatherImpact": {
            "rain": "increases risk by 45%",
            "fog": "increases risk by 55%",
            "snow": "increases risk by 120%",
            "extremeTemp": "increases risk by 25%"
        },
        "speedImpact": "accidents increase exponentially above 100 km/h"
    }

# Predct risk
@app.post("/api/predict")
async def predict_risk(
    weather: str = "clear",
    traffic: str = "light",
    road_quality: str = "good",
    time_of_day: str = "day",
    speed_mph: float = 50
):
    # Simple risk calculation
    risk_score = 0.3  # Base risk
    
    # Weather impact
    weather_impact = {
        "clear": 0.1,
        "rain": 0.4,
        "fog": 0.5,
        "snow": 0.8
    }
    risk_score += weather_impact.get(weather, 0.2)
    
    # Traffic impact
    traffic_impact = {
        "light": 0.1,
        "moderate": 0.3,
        "heavy": 0.5
    }
    risk_score += traffic_impact.get(traffic, 0.2)
    
    # Road quality impact
    quality_impact = {
        "good": 0.0,
        "fair": 0.2,
        "poor": 0.4
    }
    risk_score += quality_impact.get(road_quality, 0.1)
    
    # Time impact
    if time_of_day == "night":
        risk_score += 0.3
    
    # Speed impact
    if speed_mph > 100:
        risk_score += (speed_mph - 100) / 100 * 0.5
    
    final_risk = min(1.0, risk_score)
    
    if final_risk < 0.4:
        level = "LOW"
    elif final_risk < 0.7:
        level = "MEDIUM"
    else:
        level = "HIGH"
    
    return {
        "riskScore": float(final_risk),
        "riskLevel": level,
        "factors": {
            "weather": weather,
            "traffic": traffic,
            "roadQuality": road_quality,
            "timeOfDay": time_of_day,
            "speed": speed_mph
        },
        "recommendations": [
            "Reduce speed in adverse weather",
            "Avoid night driving if possible",
            "Stay alert on poor road conditions",
            "Maintain safe distance from other vehicles"
        ]
    }

# Road quality analysis
@app.post("/api/analyze-road-quality")
async def analyze_road_quality(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image"}, 400
        
        # Simple analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Estimate quality from variance
        if variance < 500:
            quality = "Poor"
            score = 0.3
        elif variance < 1000:
            quality = "Fair"
            score = 0.6
        else:
            quality = "Good"
            score = 0.9
        
        return {
            "quality": quality,
            "score": float(score),
            "variance": float(variance),
            "recommendation": f"Road quality is {quality.lower()}. Adjust speed accordingly."
        }
    except Exception as e:
        return {"error": str(e)}, 400

# Traffic image analysis
@app.post("/api/analyze-traffic")
async def analyze_traffic(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.fromstring(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image"}, 400
        
        # Simple traffic estimation
        h, w = img.shape[:2]
        area = h * w
        
        # Count dark pixels (vehicles)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        dark_pixels = np.sum(gray < 100)
        traffic_density = dark_pixels / area
        
        if traffic_density < 0.1:
            traffic_level = "Light"
        elif traffic_density < 0.3:
            traffic_level = "Moderate"
        else:
            traffic_level = "Heavy"
        
        return {
            "trafficLevel": traffic_level,
            "density": float(traffic_density),
            "recommendation": f"Traffic is {traffic_level.lower()}. Plan your route accordingly."
        }
    except Exception as e:
        return {"error": str(e)}, 400

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*70)
    print("🚀 Starting Safe Drive AI - Working API Server")
    print("="*70)
    print("✓ Server starting...")
    print("Local: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("="*70 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
