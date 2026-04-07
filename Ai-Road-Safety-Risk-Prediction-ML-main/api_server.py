from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import uvicorn

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    rainfall: str  # "none", "light", "heavy"
    fogLevel: str  # "low", "medium", "high"
    temperature: float
    trafficDensity: str  # "low", "medium", "high"
    vehicleSpeed: float
    roadSurface: str  # "dry", "wet", "damaged"
    timeOfDay: str  # "morning", "afternoon", "night"

class PredictionResult(BaseModel):
    riskLevel: str
    score: float
    recommendation: str
    factors: list[str]

def predict_risk(input_data: PredictionInput) -> PredictionResult:
    """
    Enhanced prediction engine using accident dataset insights.
    Returns risk assessment based on weather, traffic, and road conditions.
    """
    # Validate input values
    valid_rainfall = {"none", "light", "heavy"}
    valid_fog = {"low", "medium", "high"}
    valid_traffic = {"low", "medium", "high"}
    valid_surface = {"dry", "wet", "damaged"}
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

    # Rainfall impact (high weight based on dataset)
    rainfall_weights = {"none": 0, "light": 15, "heavy": 35}
    score += rainfall_weights.get(input_data.rainfall, 0)
    if input_data.rainfall == "heavy":
        factors.append("Heavy rainfall increases hydroplaning risk - major cause of accidents")
    elif input_data.rainfall == "light":
        factors.append("Light rain reduces road grip and visibility")

    # Fog impact
    fog_weights = {"low": 0, "medium": 15, "high": 30}
    score += fog_weights.get(input_data.fogLevel, 0)
    if input_data.fogLevel in ["medium", "high"]:
        factors.append(f"{'Dense' if input_data.fogLevel == 'high' else 'Moderate'} fog severely limits visibility")

    # Temperature extremes
    if input_data.temperature < 0:
        score += 25
        factors.append("Freezing temperature - risk of ice on road surface")
    elif input_data.temperature < 5:
        score += 15
        factors.append("Near-freezing conditions - potential ice formation")
    elif input_data.temperature > 45:
        score += 12
        factors.append("Extreme heat - risk of tire blowouts and road buckling")
    elif input_data.temperature > 38:
        score += 8
        factors.append("High temperature may affect vehicle performance")

    # Traffic density
    traffic_weights = {"low": 0, "medium": 10, "high": 20}
    score += traffic_weights.get(input_data.trafficDensity, 0)
    if input_data.trafficDensity == "high":
        factors.append("High traffic volume increases collision chain reaction risks")

    # Vehicle speed
    if input_data.vehicleSpeed > 120:
        score += 25
        factors.append("Excessive speed - drastically reduces reaction time")
    elif input_data.vehicleSpeed > 100:
        score += 18
        factors.append("High speed reduces reaction time and increases accident severity")
    elif input_data.vehicleSpeed > 80:
        score += 8
        factors.append("Moderate-high speed reduces control margin")

    # Road surface condition
    surface_weights = {"dry": 0, "wet": 18, "damaged": 28}
    score += surface_weights.get(input_data.roadSurface, 0)
    if input_data.roadSurface == "damaged":
        factors.append("Damaged road surface - major structural hazard")
    elif input_data.roadSurface == "wet":
        factors.append("Wet road reduces braking efficiency by up to 50%")

    # Time of day impact
    if input_data.timeOfDay == "night":
        score += 12
        factors.append("Nighttime driving - significantly reduced visibility and increased fatigue")
    elif input_data.timeOfDay == "morning":
        score += 2
        factors.append("Morning hours may have reduced visibility due to sun angle")

    # Normalize score to 0-100
    score = min(100, max(0, score))

    # Determine risk level and recommendation
    if score >= 70:
        risk_level = "high"
        recommendation = "⚠️ HIGH RISK — Do NOT travel unless absolutely necessary. If traveling: reduce speed significantly (< 40 km/h), increase following distance to 6+ seconds, ensure headlights on, and have emergency kit ready."
    elif score >= 45:
        risk_level = "medium"
        recommendation = "⚡ MODERATE RISK — Drive with heightened caution. Reduce speed by 10-15%, maintain 4-second following distance, stay alert for hazard changes, and consider alternate routes if available."
    else:
        risk_level = "low"
        recommendation = "✅ LOW RISK — Safe to travel. Maintain normal precautions, follow speed limits, keep 2-3 second following distance, and stay aware of weather changes."

    return PredictionResult(
        riskLevel=risk_level,
        score=score,
        recommendation=recommendation,
        factors=factors if factors else ["No specific risk factors identified"]
    )

@app.post("/api/predict", response_model=PredictionResult)
async def predict(input_data: PredictionInput):
    """Endpoint to predict road accident risk based on conditions"""
    try:
        result = predict_risk(input_data)
        return result
    except ValueError as e:
        return PredictionResult(
            riskLevel="error",
            score=0,
            recommendation=f"Invalid input: {str(e)}",
            factors=[str(e)]
        )

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
