import { useState, useEffect } from "react";
import { MapPin, AlertTriangle, CheckCircle, Info, Camera } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";

interface Zone {
  id: string;
  name: string;
  risk: "low" | "medium" | "high";
  lat: number;
  lng: number;
  description: string;
  image?: string; // Optional image for traffic incidents
}

interface TrafficIncident {
  id: string;
  address: string;
  lat: number;
  lng: number;
  trafficDensity: "low" | "medium" | "high";
  congestionPercentage: number;
  vehicleCount: number;
  timestamp: string;
  image: string; // Base64 image data
}

const zones: Zone[] = [
  { id: "1", name: "National Highway 44", risk: "high", lat: 17.385, lng: 78.486, description: "Frequent accidents during monsoon. Poor drainage." },
  { id: "2", name: "Ring Road Junction", risk: "high", lat: 17.445, lng: 78.391, description: "High-speed collisions common at night." },
  { id: "3", name: "Airport Road", risk: "medium", lat: 17.240, lng: 78.429, description: "Moderate risk — foggy mornings during winter." },
  { id: "4", name: "Old City Area", risk: "medium", lat: 17.361, lng: 78.474, description: "Congested traffic, narrow roads." },
  { id: "5", name: "IT Corridor", risk: "low", lat: 17.427, lng: 78.342, description: "Well-maintained road with smart signals." },
  { id: "6", name: "Lake Drive Road", risk: "low", lat: 17.423, lng: 78.458, description: "Low traffic, good visibility." },
  { id: "7", name: "Industrial Zone Highway", risk: "high", lat: 17.520, lng: 78.380, description: "Heavy truck traffic, damaged road surface." },
  { id: "8", name: "Suburban Bypass", risk: "medium", lat: 17.300, lng: 78.550, description: "Moderate speed, unlit stretches at night." },
];

const riskConfig = {
  low: {
    color: "bg-risk-low",
    markerColor: "#22c55e",
    border: "border-risk-low/30",
    bg: "bg-risk-low/5",
    text: "text-risk-low",
    icon: CheckCircle,
    label: "Safe Zone",
  },
  medium: {
    color: "bg-risk-medium",
    markerColor: "#f59e0b",
    border: "border-risk-medium/30",
    bg: "bg-risk-medium/5",
    text: "text-risk-medium",
    icon: Info,
    label: "Moderate Risk",
  },
  high: {
    color: "bg-risk-high",
    markerColor: "#ef4444",
    border: "border-risk-high/30",
    bg: "bg-risk-high/5",
    text: "text-risk-high",
    icon: AlertTriangle,
    label: "Danger Zone",
  },
};

export default function RiskMap() {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  
  // Load traffic incidents from localStorage
  useEffect(() => {
    const incidents = JSON.parse(localStorage.getItem("trafficIncidents") || "[]");
    setTrafficIncidents(incidents);
  }, []);

  // Fallback map for when API is unavailable
  const hasMapsAPI = apiKey && apiKey.trim().length > 0;

  // Center of Hyderabad
  const center = { lat: 17.385, lng: 78.486 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-7 w-7 text-primary" />
          Risk Map
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Accident-prone zones marked by risk level
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(["low", "medium", "high"] as const).map((level) => {
          const cfg = riskConfig[level];
          return (
            <div key={level} className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", cfg.color)} />
              <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Google Map or Fallback */}
      <div className="glass-card rounded-xl p-4 sm:p-6 overflow-hidden">
        {hasMapsAPI ? (
          <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-sidebar">
            <APIProvider apiKey={apiKey}>
              <Map
                defaultCenter={center}
                defaultZoom={11}
                mapId="risk-map"
                style={{ width: "100%", height: "100%" }}
                gestureHandling="greedy"
              >
                {zones.map((zone) => {
                  const cfg = riskConfig[zone.risk];
                  return (
                    <AdvancedMarker
                      key={zone.id}
                      position={{ lat: zone.lat, lng: zone.lng }}
                      onClick={() => setSelectedZone(zone)}
                    >
                      <div
                        className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: cfg.markerColor }}
                      >
                        <span className="text-xs font-bold text-white">{zone.id}</span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Traffic Incidents from Image Analysis */}
                {trafficIncidents.map((incident) => {
                  const riskLevel = incident.trafficDensity;
                  const cfg = riskConfig[riskLevel];
                  return (
                    <AdvancedMarker
                      key={incident.id}
                      position={{ lat: incident.lat, lng: incident.lng }}
                      onClick={() => setSelectedZone({
                        id: incident.id,
                        name: `Traffic Report: ${incident.address}`,
                        risk: riskLevel,
                        lat: incident.lat,
                        lng: incident.lng,
                        description: `📸 Image Analysis Report\n${incident.congestionPercentage}% Congestion | ${incident.vehicleCount} vehicles\nReported: ${incident.timestamp}`,
                        image: incident.image,
                      })}
                    >
                      <div
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: cfg.markerColor }}
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {selectedZone && (
                  <InfoWindow
                    position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
                    onCloseClick={() => setSelectedZone(null)}
                  >
                    <div className="p-2 max-w-xs">
                      {/* Image preview if available */}
                      {selectedZone.image && (
                        <img
                          src={selectedZone.image}
                          alt="Traffic incident"
                          className="w-full rounded-md mb-2 max-h-32 object-cover"
                        />
                      )}
                      <p className="text-sm font-semibold text-gray-900">{selectedZone.name}</p>
                      <p className={cn("text-xs font-medium mt-1", riskConfig[selectedZone.risk].text)}>
                        {riskConfig[selectedZone.risk].label}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{selectedZone.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        📍 {selectedZone.lat.toFixed(4)}°N, {selectedZone.lng.toFixed(4)}°E
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </div>
        ) : (
          <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-col gap-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground font-semibold">Google Maps API Not Configured</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Set VITE_GOOGLE_MAPS_API_KEY in your .env file to display the interactive map. Showing risk zones below instead.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Zone list */}
      <div className="grid sm:grid-cols-2 gap-4">
        {zones.map((zone) => {
          const cfg = riskConfig[zone.risk];
          const Icon = cfg.icon;
          return (
            <div
              key={zone.id}
              className={cn("glass-card rounded-xl p-4 border-l-4 cursor-pointer hover:shadow-lg transition-shadow", cfg.border)}
              onClick={() => setSelectedZone(zone)}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", cfg.text)} />
                <div>
                  <h4 className="text-sm font-semibold">{zone.name}</h4>
                  <p className={cn("text-xs font-medium mt-0.5", cfg.text)}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{zone.description}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    📍 {zone.lat}°N, {zone.lng}°E
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Traffic Incidents List */}
        {trafficIncidents.map((incident) => {
          const cfg = riskConfig[incident.trafficDensity];
          return (
            <div
              key={incident.id}
              className={cn("glass-card rounded-xl p-4 border-l-4 cursor-pointer hover:shadow-lg transition-shadow", cfg.border)}
              onClick={() => setSelectedZone({
                id: incident.id,
                name: `Traffic Report: ${incident.address}`,
                risk: incident.trafficDensity,
                lat: incident.lat,
                lng: incident.lng,
                description: `📸 Image Analysis Report\n${incident.congestionPercentage}% Congestion | ${incident.vehicleCount} vehicles\nReported: ${incident.timestamp}`,
                image: incident.image,
              })}
            >
              <div className="flex items-start gap-3">
                <Camera className={cn("h-5 w-5 shrink-0 mt-0.5", cfg.text)} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    {incident.address}
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded">User Report</span>
                  </h4>
                  <p className={cn("text-xs font-medium mt-0.5", cfg.text)}>{cfg.label}</p>

                  {/* Image Thumbnail */}
                  {incident.image && (
                    <img
                      src={incident.image}
                      alt="Traffic incident"
                      className="w-full rounded-md mt-2 h-24 object-cover border border-border"
                    />
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Congestion: {incident.congestionPercentage}% | Vehicles: {incident.vehicleCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">📸 {incident.timestamp}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    📍 {incident.lat.toFixed(4)}°N, {incident.lng.toFixed(4)}°E
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
