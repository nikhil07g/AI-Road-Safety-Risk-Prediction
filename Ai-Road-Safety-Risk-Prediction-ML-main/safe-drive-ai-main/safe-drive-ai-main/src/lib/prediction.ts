export interface PredictionInput {
  rainfall: "none" | "light" | "heavy";
  fogLevel: "low" | "medium" | "high";
  temperature: number;
  trafficDensity: "low" | "medium" | "high";
  vehicleSpeed: number;
  roadSurface: "dry" | "wet" | "damaged";
  timeOfDay: "morning" | "afternoon" | "night";
  driverCondition: "alert" | "tired" | "impaired";
  eyeVisibility: "clear" | "moderate" | "limited";
}

export type RiskLevel = "low" | "medium" | "high";

export interface PredictionResult {
  riskLevel: RiskLevel;
  score: number; // 0-100
  recommendation: string;
  factors: string[];
}

const API_BASE_URL = "http://localhost:8000/api";

export async function predictRisk(input: PredictionInput): Promise<PredictionResult> {
  // Use local prediction directly (fast and reliable)
  return predictRiskLocal(input);
}

// Fallback local prediction function
function predictRiskLocal(input: PredictionInput): PredictionResult {
  let score = 0;
  const factors: string[] = [];

  // ========== WEATHER FACTORS (Max 35 points) ==========
  if (input.rainfall === "heavy") { 
    score += 25; 
    factors.push("⛈️ Heavy rainfall causes hydroplaning and reduced visibility"); 
  } else if (input.rainfall === "light") { 
    score += 12; 
    factors.push("🌧️ Light rain reduces road grip and visibility"); 
  }

  if (input.fogLevel === "high") { 
    score += 20; 
    factors.push("🌫️ Dense fog severely limits visibility to <50m"); 
  } else if (input.fogLevel === "medium") { 
    score += 10; 
    factors.push("🌫️ Moderate fog reduces visibility"); 
  }

  // Temperature extremes
  if (input.temperature < 0) { 
    score += 18; 
    factors.push("❄️ Freezing temperature - ice on roads highly likely"); 
  } else if (input.temperature < 3) { 
    score += 12; 
    factors.push("🧊 Near-freezing - potential ice hazard"); 
  } else if (input.temperature > 45) { 
    score += 15; 
    factors.push("🔥 Extreme heat - tire blowout risk"); 
  } else if (input.temperature > 40) { 
    score += 8; 
    factors.push("☀️ High temperature affects road grip"); 
  }

  // ========== TRAFFIC & SPEED FACTORS (Max 40 points) ==========
  // Enhanced: More granular traffic density scoring
  if (input.trafficDensity === "high") { 
    score += 22; 
    factors.push("🚗 HIGH TRAFFIC - Collision and rear-end crash risk significantly elevated"); 
  } else if (input.trafficDensity === "medium") { 
    score += 11; 
    factors.push("🚗 MEDIUM TRAFFIC - Moderate collision risk"); 
  }

  // Speed-based risk (exponential)
  if (input.vehicleSpeed > 130) { 
    score += 28; 
    factors.push("🏎️ EXTREME SPEED >130km/h - Braking distance 200m+, critical risk"); 
  } else if (input.vehicleSpeed > 120) { 
    score += 24; 
    factors.push("⚡ Excessive speed (120-130 km/h) - reaction time critically reduced"); 
  } else if (input.vehicleSpeed > 100) { 
    score += 18; 
    factors.push("⚡ High speed (100-120 km/h) - reaction time significantly reduced"); 
  } else if (input.vehicleSpeed > 70) { 
    score += 10; 
    factors.push("⚡ Moderate speed (70-100 km/h) - maintain caution"); 
  }

  // ========== ROAD CONDITIONS (Max 40 points - CRITICAL) ==========
  // Enhanced: Detailed road hazard assessment
  if (input.roadSurface === "damaged") { 
    score += 32; 
    factors.push("🚨 DAMAGED ROAD SURFACE - Significant hazard: potholes, cracks, uneven surface"); 
  } else if (input.roadSurface === "wet") { 
    score += 18; 
    factors.push("💧 WET ROAD - Braking efficiency reduced 30-40%, hydroplaning risk"); 
  }

  // ========== TIME OF DAY (Max 15 points) ==========
  if (input.timeOfDay === "night") { 
    score += 15; 
    factors.push("🌙 NIGHT DRIVING - 3x more accident risk, visibility severely limited, fatigue factor"); 
  } else if (input.timeOfDay === "afternoon") { 
    score += 4; 
    factors.push("☀️ AFTERNOON - Watch for sun glare and driver fatigue"); 
  }

  // ========== DRIVER CONDITION (Max 45 points - CRITICAL) ==========
  if (input.driverCondition === "impaired") { 
    score += 42; 
    factors.push("🚫 IMPAIRED DRIVING - DO NOT DRIVE! Reaction time +50%, risk multiplied 5-10x, illegal"); 
  } else if (input.driverCondition === "tired") { 
    score += 32; 
    factors.push("😴 SEVERE FATIGUE - Microsleep risk, reaction time -40%, primary cause of single-vehicle crashes"); 
  }

  // ========== EYE VISIBILITY / VISION (Max 40 points - CRITICAL) ==========
  if (input.eyeVisibility === "limited") { 
    score += 38; 
    factors.push("👁️ CRITICAL: LIMITED VISION - Cannot identify hazards, extreme collision risk, DO NOT DRIVE"); 
  } else if (input.eyeVisibility === "moderate") { 
    score += 20; 
    factors.push("👁️ MODERATE VISION IMPAIRMENT - Delayed hazard detection"); 
  }

  // ========== INTERACTIVE RISK MULTIPLIERS ==========
  // Storm conditions: Heavy rain + high wind/fog + night
  if (input.rainfall === "heavy" && input.fogLevel === "high" && input.timeOfDay === "night") {
    score += 25;
    factors.push("🌪️ CRITICAL WEATHER: Perfect storm conditions - extreme hazard");
  } else if (input.rainfall === "heavy" && input.timeOfDay === "night") {
    score += 18;
    factors.push("🌧️🌙 DANGEROUS COMBO: Heavy rain at night - visibility <5m possible");
  }

  // Ice risk: Near-freezing + wet
  if (input.temperature < 3 && input.roadSurface === "wet") {
    score += 18;
    factors.push("🧊 ICE HAZARD: Wet + cold = black ice likely, hydroplaning + skidding risk");
  }

  // Dangerous combo: Damaged road + high speed
  if (input.roadSurface === "damaged" && input.vehicleSpeed > 100) {
    score += 20;
    factors.push("⚠️ CRITICAL COMBO: High speed on damaged road - potholes at speed are deadly");
  }

  // Reckless driving: Impaired + high speed
  if (input.driverCondition === "impaired" && input.vehicleSpeed > 100) {
    score += 20;
    factors.push("🚫 RECKLESS: Impaired + excessive speed - crashes at high probability");
  }

  // Exhausted driving: Fatigue + night + heavy traffic
  if (input.driverCondition === "tired" && input.timeOfDay === "night" && input.trafficDensity === "high") {
    score += 15;
    factors.push("😴🚗 EXHAUSTION: Sleep-deprived + night + traffic - primary accident trigger");
  }

  // Vision impairment + darkness
  if (input.eyeVisibility === "limited" && input.timeOfDay === "night") {
    score += 18;
    factors.push("👁️🌙 DANGEROUS: Limited vision + night - cannot drive safely");
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  let riskLevel: RiskLevel;
  let recommendation: string;

  if (score >= 80) {
    riskLevel = "high";
    recommendation = "🚨 DO NOT DRIVE - EXTREME HAZARD! If trapped in these conditions: Pull over to safe area, turn on hazards, wait for conditions to improve.";
  } else if (score >= 65) {
    riskLevel = "high";
    recommendation = "🚨 CRITICAL RISK — Reduce speed to 30 km/h immediately, enable all lights, increase following distance to 100m+, stay hyper-alert, consider delaying travel.";
  } else if (score >= 50) {
    riskLevel = "medium";
    recommendation = "⚠️ HIGH RISK — Reduce speed by 30%, increase following distance to 60m, enable low beams, avoid aggressive maneuvers, take 15min rest every 45min.";
  } else if (score >= 30) {
    riskLevel = "medium";
    recommendation = "⚡ MODERATE RISK — Drive carefully: reduce speed by 10%, maintain 40m following distance, stay alert for changing conditions.";
  } else {
    riskLevel = "low";
    recommendation = "✅ LOW RISK — Safe to travel. Maintain standard precautions and stay aware of conditions.";
  }

  return { riskLevel, score, recommendation, factors };
}

export interface PredictionRecord {
  id: string;
  timestamp: string;
  userName: string;
  input: PredictionInput;
  result: PredictionResult;
}

const PREDICTIONS_KEY = "wrp_predictions";

export function savePrediction(userName: string, input: PredictionInput, result: PredictionResult) {
  const records: PredictionRecord[] = JSON.parse(localStorage.getItem(PREDICTIONS_KEY) || "[]");
  records.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userName,
    input,
    result,
  });
  localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(records));
}

export function getPredictions(): PredictionRecord[] {
  return JSON.parse(localStorage.getItem(PREDICTIONS_KEY) || "[]");
}
