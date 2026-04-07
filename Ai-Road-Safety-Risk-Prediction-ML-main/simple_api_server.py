#!/usr/bin/env python3
"""
Simple HTTP API server for accident risk prediction.
Uses only Python standard library - no external dependencies required.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os

class PredictionHandler(BaseHTTPRequestHandler):
    """Handle HTTP requests for risk predictions"""
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {"status": "ok", "message": "Safe Drive AI API is running"}
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path == "/api/dataset-stats":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {
                "totalAccidents": 4000000,
                "topCause": "Weather & Road Conditions",
                "weekdayRisk": "High (30% more accidents)",
                "nightRiskIncrease": "3x more accidents at night",
                "weatherImpact": {
                    "rain": "increases accident risk by 45%",
                    "fog": "increases accident risk by 55%",
                    "snow": "increases accident risk by 120%",
                    "extremeTemp": "increases accidents by 25%"
                },
                "speedImpact": "accidents increase exponentially above 100 km/h"
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests for predictions"""
        if self.path == "/api/predict":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                input_data = json.loads(body)
                result = self.predict_risk(input_data)
                
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                error_response = {"error": str(e)}
                self.wfile.write(json.dumps(error_response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def end_headers(self):
        """Add CORS headers to all responses"""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()
    
    def log_message(self, format, *args):
        """Suppress noisy logs"""
        pass
    
    def predict_risk(self, input_data):
        """
        Calculate accident risk based on conditions using dataset insights.
        """
        score = 0
        factors = []
        
        # Rainfall impact
        rainfall = input_data.get("rainfall", "none")
        if rainfall == "heavy":
            score += 35
            factors.append("Heavy rainfall significantly increases hydroplaning risk - major cause of accidents")
        elif rainfall == "light":
            score += 15
            factors.append("Light rain reduces road grip and visibility")
        
        # Fog impact
        fog = input_data.get("fogLevel", "low")
        if fog == "high":
            score += 30
            factors.append("Dense fog severely limits visibility - critical safety hazard")
        elif fog == "medium":
            score += 15
            factors.append("Moderate fog reduces visibility and increases reaction distance")
        
        # Temperature
        temp = float(input_data.get("temperature", 25))
        if temp < 0:
            score += 25
            factors.append("Freezing temperature - significant risk of ice on road surface")
        elif temp < 5:
            score += 15
            factors.append("Near-freezing conditions - potential ice formation")
        elif temp > 45:
            score += 12
            factors.append("Extreme heat - risk of tire blowouts and road buckling")
        elif temp > 38:
            score += 8
            factors.append("High temperature may affect vehicle and road performance")
        
        # Traffic density
        traffic = input_data.get("trafficDensity", "low")
        if traffic == "high":
            score += 20
            factors.append("High traffic volume increases collision chain reaction risks")
        elif traffic == "medium":
            score += 10
            factors.append("Moderate traffic density increases interaction risks")
        
        # Vehicle speed
        speed = float(input_data.get("vehicleSpeed", 60))
        if speed > 120:
            score += 28
            factors.append("Excessive speed significantly reduces reaction time and control")
        elif speed > 100:
            score += 20
            factors.append("High speed drastically reduces reaction time - major risk factor")
        elif speed > 80:
            score += 10
            factors.append("Moderate-high speed reduces control margin")
        
        # Road surface
        surface = input_data.get("roadSurface", "dry")
        if surface == "damaged":
            score += 28
            factors.append("Damaged road surface - major structural and safety hazard")
        elif surface == "wet":
            score += 18
            factors.append("Wet road reduces braking efficiency by up to 50%")
        
        # Time of day
        time_of_day = input_data.get("timeOfDay", "morning")
        if time_of_day == "night":
            score += 15
            factors.append("Nighttime driving - significantly reduced visibility and increased fatigue")
        elif time_of_day == "morning":
            score += 3
            factors.append("Morning may have reduced visibility due to sun angle")
        
        # Normalize score
        score = min(100, max(0, score))
        
        # Determine risk level and recommendation
        if score >= 70:
            risk_level = "high"
            recommendation = "⚠️ HIGH RISK — Do NOT travel unless absolutely necessary. If traveling: reduce speed to < 40 km/h, increase following distance to 6+ seconds, ensure headlights on, carry emergency kit."
        elif score >= 45:
            risk_level = "medium"
            recommendation = "⚡ MODERATE RISK — Drive carefully and cautiously. Reduce speed by 10-15%, maintain 4-second following distance, stay alert for hazard changes, consider alternate routes."
        else:
            risk_level = "low"
            recommendation = "✅ LOW RISK — Safe to travel. Maintain normal precautions, follow speed limits, keep 2-3 second following distance, and stay aware of weather."
        
        return {
            "riskLevel": risk_level,
            "score": round(score, 1),
            "recommendation": recommendation,
            "factors": factors if factors else ["No specific risk factors identified"]
        }

def run_server(port=8000):
    """Start the HTTP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, PredictionHandler)
    print(f"🚗 Safe Drive AI API Server running on http://localhost:{port}")
    print(f"📊 Health check: http://localhost:{port}/api/health")
    print(f"📈 Dataset stats: http://localhost:{port}/api/dataset-stats")
    print(f"🎯 Predict risk: POST to http://localhost:{port}/api/predict")
    print("\nPress Ctrl+C to stop the server...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
