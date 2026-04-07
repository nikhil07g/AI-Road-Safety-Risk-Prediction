import { useState, useRef, useEffect } from "react";
import { MapPin, Navigation, AlertTriangle, Info, CheckCircle, Clock, Users, Fuel, Loader } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { geocodeLocation, geocodeLocationWithSuggestions, type GeocodeResult } from "@/lib/geocoding";

interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

interface RiskSegment {
  start: RoutePoint;
  end: RoutePoint;
  risk: "low" | "medium" | "high";
  distance: number;
}

interface RouteResult {
  totalDistance: number;
  estimatedTime: number;
  segments: RiskSegment[];
  overallRisk: "low" | "medium" | "high";
}

const predefinedZones = [
  { id: "1", name: "National Highway 44", risk: "high" as const, lat: 17.385, lng: 78.486, radius: 2 },
  { id: "2", name: "Ring Road Junction", risk: "high" as const, lat: 17.445, lng: 78.391, radius: 1.5 },
  { id: "3", name: "Airport Road", risk: "medium" as const, lat: 17.240, lng: 78.429, radius: 2 },
  { id: "4", name: "Old City Area", risk: "medium" as const, lat: 17.361, lng: 78.474, radius: 1.8 },
  { id: "5", name: "IT Corridor", risk: "low" as const, lat: 17.427, lng: 78.342, radius: 2.5 },
  { id: "6", name: "Lake Drive Road", risk: "low" as const, lat: 17.423, lng: 78.458, radius: 2 },
  { id: "7", name: "Industrial Zone", risk: "high" as const, lat: 17.520, lng: 78.380, radius: 1.5 },
  { id: "8", name: "Suburban Bypass", risk: "medium" as const, lat: 17.300, lng: 78.550, radius: 3 },
];

const riskConfig = {
  low: {
    color: "#22c55e",
    borderColor: "rgb(34, 197, 94)",
    textColor: "text-risk-low",
    label: "Safe Zone",
    bgColor: "bg-risk-low/10"
  },
  medium: {
    color: "#f59e0b",
    borderColor: "rgb(245, 158, 11)",
    textColor: "text-risk-medium",
    label: "Moderate Risk",
    bgColor: "bg-risk-medium/10"
  },
  high: {
    color: "#ef4444",
    borderColor: "rgb(239, 68, 68)",
    textColor: "text-risk-high",
    label: "Danger Zone",
    bgColor: "bg-risk-high/10"
  },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPointRisk(lat: number, lng: number): "low" | "medium" | "high" {
  // Check if point is within any risk zone
  for (const zone of predefinedZones) {
    const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
    if (distance <= zone.radius) {
      return zone.risk;
    }
  }
  return "low";
}

function generateRouteSegments(start: RoutePoint, end: RoutePoint): RouteResult {
  // Calculate direct distance from start to end first
  const directDistance = calculateDistance(start.lat, start.lng, end.lat, end.lng);

  // Generate intermediate points for risk analysis
  const steps = 10;
  const segments: RiskSegment[] = [];
  let overallRiskScore = 0;

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const nextT = (i + 1) / steps;

    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;

    const nextLat = start.lat + (end.lat - start.lat) * nextT;
    const nextLng = start.lng + (end.lng - start.lng) * nextT;

    // Calculate segment distance proportional to total distance
    const segmentDistance = directDistance / steps;
    const risk = getPointRisk((lat + nextLat) / 2, (lng + nextLng) / 2);

    segments.push({
      start: { lat, lng, name: `Point ${i + 1}` },
      end: { lat: nextLat, lng: nextLng, name: `Point ${i + 2}` },
      risk,
      distance: segmentDistance,
    });

    // Weight risk scores
    overallRiskScore += risk === "high" ? 3 : risk === "medium" ? 2 : 1;
  }

  // Factor in distance-based risk
  // Longer distances increase risk due to driver fatigue and more time exposed to hazards
  let distanceRiskBonus = 0;
  if (directDistance > 200) {
    distanceRiskBonus = 3; // Very high risk for long distances
  } else if (directDistance > 150) {
    distanceRiskBonus = 2.5; // High risk
  } else if (directDistance > 100) {
    distanceRiskBonus = 2; // Medium-high risk
  } else if (directDistance > 50) {
    distanceRiskBonus = 1; // Small risk increase
  }

  // Calculate overall risk with distance factor
  const combinedRiskScore = overallRiskScore / steps + distanceRiskBonus * 0.3;

  let overallRisk: "low" | "medium" | "high";
  if (combinedRiskScore >= 2.2) {
    overallRisk = "high";
  } else if (combinedRiskScore >= 1.5) {
    overallRisk = "medium";
  } else {
    overallRisk = "low";
  }

  return {
    totalDistance: directDistance,
    estimatedTime: Math.round((directDistance / 60) * 60), // in minutes at 60 km/h avg
    segments,
    overallRisk,
  };
}

function MapController({ mapCenter, zoomLevel }: { mapCenter: { lat: number; lng: number }; zoomLevel: number }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setCenter(mapCenter);
      map.setZoom(zoomLevel);
    }
  }, [map, mapCenter, zoomLevel]);

  return null;
}

function RouteMapComponent({ route, fromPoint, toPoint }: { route: RouteResult | null; fromPoint: RoutePoint | null; toPoint: RoutePoint | null }) {
  return (
    <div className="w-full h-full">
      {/* From marker - Pickup Point */}
      {fromPoint && (
        <AdvancedMarker 
          key={`from-${fromPoint.lat}-${fromPoint.lng}`}
          position={{ lat: fromPoint.lat, lng: fromPoint.lng }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 border-4 border-white shadow-2xl hover:scale-125 transition-transform cursor-pointer"
                 title={`Pickup: ${fromPoint.lat.toFixed(4)}, ${fromPoint.lng.toFixed(4)}`}>
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <div className="bg-white px-2 py-1 rounded-md shadow-md border border-green-500 text-xs font-bold text-green-700 whitespace-nowrap">
              Pickup
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* To marker - Drop Point */}
      {toPoint && (
        <AdvancedMarker 
          key={`to-${toPoint.lat}-${toPoint.lng}`}
          position={{ lat: toPoint.lat, lng: toPoint.lng }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 border-4 border-white shadow-2xl hover:scale-125 transition-transform cursor-pointer"
                 title={`Drop-off: ${toPoint.lat.toFixed(4)}, ${toPoint.lng.toFixed(4)}`}>
              <Navigation className="h-7 w-7 text-white rotate-45" />
            </div>
            <div className="bg-white px-2 py-1 rounded-md shadow-md border border-red-500 text-xs font-bold text-red-700 whitespace-nowrap">
              Drop-off
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Risk zone markers */}
      {predefinedZones.map((zone) => {
        const cfg = riskConfig[zone.risk];
        return (
          <AdvancedMarker key={zone.id} position={{ lat: zone.lat, lng: zone.lng }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: cfg.color }}
              title={`${zone.name} - ${cfg.label}`}
            >
              <span className="text-xs font-bold text-white">{zone.id}</span>
            </div>
          </AdvancedMarker>
        );
      })}
    </div>
  );
}

export default function RoutePlanner() {
  const [fromPoint, setFromPoint] = useState<RoutePoint | null>(null);
  const [toPoint, setToPoint] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Geocoding states
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<GeocodeResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodeResult[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [geocodingFromLoading, setGeocodingFromLoading] = useState(false);
  const [geocodingToLoading, setGeocodingToLoading] = useState(false);

  // Suppress Google Maps error dialog
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .gm-err-container, 
      [aria-label="Google Maps"], 
      .gm-error-message,
      .ErrorBox {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fromTimeoutRef = useRef<NodeJS.Timeout>();
  const toTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-calculate route when both points are set
  useEffect(() => {
    if (fromPoint && toPoint) {
      console.log("Auto-calculating route...");
      setLoading(true);
      const timeoutId = setTimeout(() => {
        try {
          const result = generateRouteSegments(fromPoint, toPoint);
          setRoute(result);
        } catch (error) {
          console.error("Error auto-calculating route:", error);
        } finally {
          setLoading(false);
        }
      }, 400);
      return () => clearTimeout(timeoutId);
    }
  }, [fromPoint, toPoint]);

  // Debounced geocoding for "from" location
  const handleFromInput = (value: string) => {
    setFromInput(value);
    setShowFromSuggestions(true);

    if (fromTimeoutRef.current) clearTimeout(fromTimeoutRef.current);

    if (value.trim().length < 2) {
      setFromSuggestions([]);
      return;
    }

    setGeocodingFromLoading(true);
    fromTimeoutRef.current = setTimeout(async () => {
      const suggestions = await geocodeLocationWithSuggestions(value, apiKey);
      setFromSuggestions(suggestions);
      setGeocodingFromLoading(false);
    }, 500);
  };

  // Debounced geocoding for "to" location
  const handleToInput = (value: string) => {
    setToInput(value);
    setShowToSuggestions(true);

    if (toTimeoutRef.current) clearTimeout(toTimeoutRef.current);

    if (value.trim().length < 2) {
      setToSuggestions([]);
      return;
    }

    setGeocodingToLoading(true);
    toTimeoutRef.current = setTimeout(async () => {
      const suggestions = await geocodeLocationWithSuggestions(value, apiKey);
      setToSuggestions(suggestions);
      setGeocodingToLoading(false);
    }, 500);
  };

  const selectFromLocation = (location: GeocodeResult) => {
    const newFromPoint = {
      lat: location.lat,
      lng: location.lng,
      name: location.name,
    };
    setFromPoint(newFromPoint);
    setFromInput(location.name);
    setShowFromSuggestions(false);
    setFromSuggestions([]);
  };

  const selectToLocation = (location: GeocodeResult) => {
    const newToPoint = {
      lat: location.lat,
      lng: location.lng,
      name: location.name,
    };
    setToPoint(newToPoint);
    setToInput(location.name);
    setShowToSuggestions(false);
    setToSuggestions([]);
  };

  const handlePlanRoute = async () => {
    let finalFromPoint = fromPoint;
    let finalToPoint = toPoint;

    // If no points are selected but text is entered, try to geocode it
    if (!finalFromPoint && fromInput.trim()) {
      console.log("Geocoding from input:", fromInput);
      const location = await geocodeLocation(fromInput, apiKey);
      if (location) {
        finalFromPoint = {
          lat: location.lat,
          lng: location.lng,
          name: location.name,
        };
        setFromPoint(finalFromPoint);
      }
    }

    if (!finalToPoint && toInput.trim()) {
      console.log("Geocoding to input:", toInput);
      const location = await geocodeLocation(toInput, apiKey);
      if (location) {
        finalToPoint = {
          lat: location.lat,
          lng: location.lng,
          name: location.name,
        };
        setToPoint(finalToPoint);
      }
    }

    if (!finalFromPoint || !finalToPoint) {
      toast.error("Please enter valid pickup and drop-off locations");
      return;
    }

    console.log("Planning route from", finalFromPoint, "to", finalToPoint);
    setLoading(true);
    
    setTimeout(() => {
      try {
        const result = generateRouteSegments(finalFromPoint!, finalToPoint!);
        console.log("Route calculated:", result);
        setRoute(result);
        toast.success(`Route planned! ${result.totalDistance.toFixed(1)} km`);
      } catch (error) {
        console.error("Error calculating route:", error);
        toast.error("Error calculating route");
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const getRiskIcon = (risk: "low" | "medium" | "high") => {
    if (risk === "low") return <CheckCircle className="h-4 w-4" />;
    if (risk === "medium") return <Info className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const centerLat = 17.385;
  const centerLng = 78.486;

  // Calculate center based on selected points
  const mapCenter = 
    fromPoint && toPoint 
      ? {
          lat: (fromPoint.lat + toPoint.lat) / 2,
          lng: (fromPoint.lng + toPoint.lng) / 2,
        }
      : fromPoint
      ? { lat: fromPoint.lat, lng: fromPoint.lng }
      : toPoint
      ? { lat: toPoint.lat, lng: toPoint.lng }
      : { lat: centerLat, lng: centerLng };

  // Calculate zoom based on distance between points
  const calculateZoom = () => {
    if (!fromPoint || !toPoint) return 11;
    const distance = calculateDistance(fromPoint.lat, fromPoint.lng, toPoint.lat, toPoint.lng);
    if (distance > 100) return 8;
    if (distance > 50) return 9;
    if (distance > 20) return 10;
    if (distance > 10) return 11;
    return 12;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Navigation className="h-7 w-7 text-primary" />
          Smart Route Planner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Plan your route while avoiding high-risk accident zones</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-semibold">Route Details</h3>

            {/* From Point */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                Pickup Point
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search location (e.g., Vijaywada, Hyderabad)"
                  value={fromInput}
                  onChange={(e) => handleFromInput(e.target.value)}
                  onFocus={() => fromInput.trim().length > 0 && setShowFromSuggestions(true)}
                  className="text-xs"
                />
                {geocodingFromLoading && (
                  <Loader className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                
                {/* Suggestions dropdown */}
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
                    {fromSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectFromLocation(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary text-xs border-b last:border-b-0 hover:text-foreground transition-colors"
                      >
                        <div className="font-medium">{suggestion.name}</div>
                        <div className="text-muted-foreground text-xs">{suggestion.formattedAddress}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {fromPoint ? (
                <div className="text-xs flex items-center gap-1 bg-green-500/10 p-2 rounded border border-green-500/30">
                  <span className="text-green-600">✓</span>
                  <span className="text-muted-foreground font-mono">{fromPoint.lat.toFixed(4)}, {fromPoint.lng.toFixed(4)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/60">Search for or enter pickup location</div>
              )}
            </div>

            {/* To Point */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Navigation className="h-4 w-4 text-red-500" />
                Drop-off Point
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search location (e.g., Kurnool, Secunderabad)"
                  value={toInput}
                  onChange={(e) => handleToInput(e.target.value)}
                  onFocus={() => toInput.trim().length > 0 && setShowToSuggestions(true)}
                  className="text-xs"
                />
                {geocodingToLoading && (
                  <Loader className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}

                {/* Suggestions dropdown */}
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
                    {toSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectToLocation(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary text-xs border-b last:border-b-0 hover:text-foreground transition-colors"
                      >
                        <div className="font-medium">{suggestion.name}</div>
                        <div className="text-muted-foreground text-xs">{suggestion.formattedAddress}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {toPoint ? (
                <div className="text-xs flex items-center gap-1 bg-red-500/10 p-2 rounded border border-red-500/30">
                  <span className="text-red-600">✓</span>
                  <span className="text-muted-foreground font-mono">{toPoint.lat.toFixed(4)}, {toPoint.lng.toFixed(4)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/60">Search for or enter drop-off location</div>
              )}
            </div>

            <Button 
              onClick={handlePlanRoute} 
              disabled={loading || (!fromPoint && !fromInput.trim()) || (!toPoint && !toInput.trim())} 
              className="w-full"
            >
              {loading ? "Planning..." : "Plan Route"}
            </Button>

            {/* Route Stats */}
            {route && (
              <div className="border-t pt-4 space-y-3">
                <div className={cn("p-3 rounded-lg", riskConfig[route.overallRisk].bgColor)}>
                  <div className="flex items-center gap-2 mb-2">
                    {getRiskIcon(route.overallRisk)}
                    <span className={cn("text-xs font-semibold", riskConfig[route.overallRisk].textColor)}>
                      {riskConfig[route.overallRisk].label}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{route.totalDistance.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{route.estimatedTime} min (avg 60 km/h)</span>
                    </div>
                  </div>
                </div>

                {/* Distance-based risk info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400">
                  <div className="font-medium mb-1">Distance Factor:</div>
                  <div className="text-xs">
                    {route.totalDistance > 200 
                      ? "🔴 Very long distance (>200km) - High fatigue risk"
                      : route.totalDistance > 150 
                      ? "🟠 Long distance (150-200km) - Significant fatigue risk"
                      : route.totalDistance > 100 
                      ? "🟡 Medium-long distance (100-150km) - Moderate fatigue risk"
                      : route.totalDistance > 50 
                      ? "🟢 Short-medium distance (50-100km) - Low fatigue risk"
                      : "✅ Short distance (<50km) - Minimal fatigue risk"}
                  </div>
                </div>

                {/* Risk breakdown */}
                <div className="space-y-2">
                  {(["low", "medium", "high"] as const).map((riskLevel) => {
                    const count = route.segments.filter((s) => s.risk === riskLevel).length;
                    const percentage = ((count / route.segments.length) * 100).toFixed(0);
                    return (
                      <div key={riskLevel} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: riskConfig[riskLevel].color }}
                          />
                          <span className="text-muted-foreground capitalize">{riskLevel}</span>
                        </div>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-xl p-4 sm:p-6 overflow-hidden h-full">
            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
              {apiKey && !mapError ? (
                <APIProvider apiKey={apiKey} onLoad={() => setMapError(false)}>
                  <Map
                    defaultCenter={{ lat: 17.385, lng: 78.486 }}
                    defaultZoom={11}
                    mapId="route-planner-map"
                    style={{ width: "100%", height: "100%" }}
                    gestureHandling="greedy"
                    onError={() => setMapError(true)}
                  >
                    <MapController mapCenter={mapCenter} zoomLevel={calculateZoom()} />
                    <RouteMapComponent route={route} fromPoint={fromPoint} toPoint={toPoint} />
                  </Map>
                </APIProvider>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Map Preview Unavailable</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure Google Maps API key to view route on map
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            {route && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-3 gap-4">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: riskConfig[level].color }}
                      />
                      <span className="text-xs text-muted-foreground capitalize">{riskConfig[level].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route Segment Details */}
      {route && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Route Segments</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {route.segments.map((segment, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                  segment.risk === "high"
                    ? "border-risk-high bg-risk-high/5"
                    : segment.risk === "medium"
                    ? "border-risk-medium bg-risk-medium/5"
                    : "border-risk-low bg-risk-low/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {getRiskIcon(segment.risk)}
                    <span className="text-xs font-medium">Segment {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{segment.distance.toFixed(2)} km</span>
                    <span className={cn("font-semibold capitalize", riskConfig[segment.risk].textColor)}>
                      {riskConfig[segment.risk].label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
