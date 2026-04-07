import { Bell, RefreshCw, Cloud, CloudRain, Wind, Thermometer } from "lucide-react";
import { AlertCard, type Alert } from "@/components/AlertCard";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: "none" | "light" | "moderate" | "heavy";
  visibility: number; // in meters
  windSpeed: number; // in km/h
  fogLevel: "low" | "medium" | "high";
  timeOfDay: "morning" | "afternoon" | "night";
  trafficDensity: "low" | "medium" | "high";
  roadCondition: "dry" | "wet" | "icy" | "damaged";
}

// Simulate real-time weather data
const generateWeatherData = (): WeatherData => {
  const now = new Date();
  const hour = now.getHours();
  
  let timeOfDay: "morning" | "afternoon" | "night" = "afternoon";
  if (hour >= 6 && hour < 12) timeOfDay = "morning";
  else if (hour >= 18 || hour < 6) timeOfDay = "night";

  return {
    temperature: Math.random() * 35 + 5, // 5-40°C
    humidity: Math.random() * 100,
    rainfall: ["none", "light", "moderate", "heavy"][Math.floor(Math.random() * 4)] as any,
    visibility: Math.random() * 500 + 500, // 500-1000m
    windSpeed: Math.random() * 40 + 5, // 5-45 km/h
    fogLevel: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
    timeOfDay,
    trafficDensity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
    roadCondition: ["dry", "wet", "icy", "damaged"][Math.floor(Math.random() * 4)] as any,
  };
};

// Analyze weather and generate alerts
const analyzeWeather = (weather: WeatherData): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();

  // Check rainfall
  if (weather.rainfall === "heavy") {
    alerts.push({
      id: `rain-${Date.now()}`,
      type: "rain",
      severity: "critical",
      title: "⚠️ Heavy Rain - CRITICAL RISK",
      message: `Heavy rain detected (${weather.humidity.toFixed(0)}% humidity). Accident probability increased by 45%. Reduce speed immediately to below 40 km/h and maintain 8+ second following distance.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.rainfall === "moderate") {
    alerts.push({
      id: `rain-${Date.now()}`,
      type: "rain",
      severity: "warning",
      title: "🌧️ Moderate Rain - WARNING",
      message: `Moderate rainfall detected. Wet roads reduce braking efficiency by 25%. Reduce speed by 10-15%, maintain safe distance.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.rainfall === "light") {
    alerts.push({
      id: `rain-${Date.now()}`,
      type: "rain",
      severity: "info",
      title: "☔ Light Rain - Low Risk",
      message: `Light rain in progress. Road conditions are manageable. Maintain normal precautions.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  // Check fog/visibility
  if (weather.visibility < 300) {
    alerts.push({
      id: `fog-${Date.now()}`,
      type: "fog",
      severity: "critical",
      title: "🌫️ Dense Fog - VISIBILITY CRITICAL",
      message: `Visibility severely reduced (${weather.visibility.toFixed(0)}m). Use fog lights, reduce speed to 30 km/h, honk horn at curves.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.visibility < 600) {
    alerts.push({
      id: `fog-${Date.now()}`,
      type: "fog",
      severity: "warning",
      title: "🌫️ Dense Fog - WARNING",
      message: `Visibility reduced to ${weather.visibility.toFixed(0)}m. Use headlights and maintain 4-5 second following distance.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  // Check temperature extremes
  if (weather.temperature < 0) {
    alerts.push({
      id: `temp-${Date.now()}`,
      type: "temperature",
      severity: "critical",
      title: "❄️ Freezing - ICE RISK",
      message: `Temperature at ${weather.temperature.toFixed(1)}°C. High risk of black ice formation on bridges and elevated areas. Reduce speed drastically.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.temperature < 3) {
    alerts.push({
      id: `temp-${Date.now()}`,
      type: "temperature",
      severity: "warning",
      title: "❄️ Near-Freezing - ICE RISK",
      message: `Temperature at ${weather.temperature.toFixed(1)}°C. Potential ice formation. Drive with caution.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.temperature > 42) {
    alerts.push({
      id: `temp-${Date.now()}`,
      type: "temperature",
      severity: "warning",
      title: "🔥 Extreme Heat - WARNING",
      message: `Temperature at ${weather.temperature.toFixed(1)}°C. Risk of tire blowouts and road buckling. Check tire pressure.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  // Check wind speed
  if (weather.windSpeed > 35) {
    alerts.push({
      id: `wind-${Date.now()}`,
      type: "wind",
      severity: "warning",
      title: "💨 Strong Wind - WARNING",
      message: `Wind speed at ${weather.windSpeed.toFixed(0)} km/h. Risk to high-profile vehicles. Maintain firm grip on steering wheel.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  // Check road condition
  if (weather.roadCondition === "icy") {
    alerts.push({
      id: `road-${Date.now()}`,
      type: "general",
      severity: "critical",
      title: "⛸️ Road Icy - EXTREME CAUTION",
      message: `Icy road surface detected. Reduce speed to 20-30 km/h, avoid sudden acceleration/braking, increase following distance.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.roadCondition === "damaged") {
    alerts.push({
      id: `road-${Date.now()}`,
      type: "general",
      severity: "warning",
      title: "🚧 Road Damage - WARNING",
      message: `Damaged road surface ahead. Slow down and watch for potholes. Report condition if severe.`,
      timestamp: now.toLocaleTimeString(),
    });
  } else if (weather.roadCondition === "wet" && weather.rainfall === "none") {
    alerts.push({
      id: `road-${Date.now()}`,
      type: "general",
      severity: "info",
      title: "💧 Wet Roads",
      message: `Road surface is wet from recent moisture. Maintain caution, roads may still be slippery.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  // Night time warning
  if (weather.timeOfDay === "night" && alerts.length === 0) {
    alerts.push({
      id: `night-${Date.now()}`,
      type: "general",
      severity: "info",
      title: "🌙 Night Driving",
      message: `Currently nighttime. Visibility reduced, fatigue risk higher. Ensure headlights are on, stay alert.`,
      timestamp: now.toLocaleTimeString(),
    });
  }

  return alerts;
};

const baseAlerts: Alert[] = [];

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load weather data and generate alerts
  const loadWeatherAlerts = () => {
    setLoading(true);
    setTimeout(() => {
      const weatherData = generateWeatherData();
      setWeather(weatherData);
      const generatedAlerts = analyzeWeather(weatherData);
      setAlerts(generatedAlerts);
      setLoading(false);
      toast.success("Weather data updated");
    }, 500);
  };

  // Load on component mount and set up auto-refresh
  useEffect(() => {
    loadWeatherAlerts();
    const interval = setInterval(loadWeatherAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadWeatherAlerts();
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;
  const hasRisk = criticalCount > 0 || warningCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Weather Alerts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time safety warnings and notifications</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Updating..." : "Refresh"}
        </Button>
      </div>

      {/* Weather Metrics */}
      {weather && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Live Weather Conditions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <Thermometer className="h-5 w-5 text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{weather.temperature.toFixed(1)}°C</p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <CloudRain className="h-5 w-5 text-blue-500 mb-2" />
              <p className="text-2xl font-bold capitalize">{weather.rainfall}</p>
              <p className="text-xs text-muted-foreground">Rainfall</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <Wind className="h-5 w-5 text-cyan-500 mb-2" />
              <p className="text-2xl font-bold">{weather.windSpeed.toFixed(0)} km/h</p>
              <p className="text-xs text-muted-foreground">Wind Speed</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <Cloud className="h-5 w-5 text-gray-500 mb-2" />
              <p className="text-2xl font-bold">{weather.visibility.toFixed(0)}m</p>
              <p className="text-xs text-muted-foreground">Visibility</p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`glass-card rounded-xl p-4 text-center transition-colors ${
          criticalCount > 0 ? "border border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : ""
        }`}>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {criticalCount}
          </p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
        <div className={`glass-card rounded-xl p-4 text-center transition-colors ${
          warningCount > 0 ? "border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" : ""
        }`}>
          <p className={`text-2xl font-bold ${warningCount > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
            {warningCount}
          </p>
          <p className="text-xs text-muted-foreground">Warnings</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{infoCount}</p>
          <p className="text-xs text-muted-foreground">Info</p>
        </div>
      </div>

      {/* No Risk Message */}
      {!hasRisk && alerts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-500/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-lg font-semibold text-green-700 dark:text-green-400">No Major Weather Risk</p>
          <p className="text-sm text-green-600 dark:text-green-300 mt-1">Current weather conditions are safe for driving. Maintain normal precautions.</p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Loading weather alerts...</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <div key={alert.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <AlertCard alert={alert} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
