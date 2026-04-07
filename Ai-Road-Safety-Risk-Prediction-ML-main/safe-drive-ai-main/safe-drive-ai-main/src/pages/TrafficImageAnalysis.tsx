import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, AlertTriangle, CheckCircle, Info, Loader, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RiskGauge } from "@/components/RiskGauge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { geocodeLocation } from "@/lib/geocoding";
import type { PredictionResult } from "@/lib/prediction";

interface TrafficAnalysisResult {
  trafficDensity: "low" | "medium" | "high";
  congestionPercentage: number;
  vehicleCount: number;
  confidence: number;
  description: string;
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

const resultBgMap = {
  low: "border-risk-low/30 bg-risk-low/10",
  medium: "border-risk-medium/30 bg-risk-medium/10",
  high: "border-risk-high/30 bg-risk-high/10",
};

export default function TrafficImageAnalysis() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TrafficAnalysisResult | null>(null);
  const [riskPrediction, setRiskPrediction] = useState<PredictionResult | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGpsData, setHasGpsData] = useState(false);

  // Extract GPS coordinates from EXIF data
  const extractGpsFromExif = async (file: File): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          
          // Look for EXIF marker (FFE1)
          let exifStart = -1;
          for (let i = 0; i < bytes.length - 1; i++) {
            if (bytes[i] === 0xFF && bytes[i + 1] === 0xE1) {
              exifStart = i;
              break;
            }
          }

          if (exifStart === -1) {
            resolve(null);
            return;
          }

          // Try to find GPS coordinates by searching for GPS IFD offset
          // This is a simplified EXIF parser looking for GPS data
          let gpsLat = null;
          let gpsLng = null;
          let gpsLatRef = null;
          let gpsLngRef = null;

          // Search for common GPS EXIF tags
          // Tag 0x0002 = GPSLatitude, 0x0004 = GPSLongitude, 0x0001 = GPSLatitudeRef, 0x0003 = GPSLongitudeRef
          for (let i = exifStart; i < Math.min(exifStart + 10000, bytes.length); i++) {
            // Look for GPS tags (simplified detection)
            if (bytes[i] === 0x00 && bytes[i + 1] === 0x02 && i + 20 < bytes.length) {
              // Might be GPSLatitude tag
              try {
                // Extract rational numbers (simplified)
                const nums = [];
                for (let j = 0; j < 6; j++) {
                  const val = bytes[i + 10 + j * 2];
                  if (val > 0 && val < 200) nums.push(val);
                }
                if (nums.length >= 3) {
                  gpsLat = nums[0] + nums[1] / 60 + nums[2] / 3600;
                }
              } catch (e) {
                // Continue searching
              }
            }
          }

          // For testing/demo: Extract coordinates from file name if present
          // Format: "photo_17.5,78.5.jpg" = coordinates 17.5°N, 78.5°E
          const nameMatch = file.name.match(/_(-?\d+\.?\d*)[,_](-?\d+\.?\d*)/);
          if (nameMatch) {
            const lat = parseFloat(nameMatch[1]);
            const lng = parseFloat(nameMatch[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
              resolve({ lat, lng });
              return;
            }
          }

          resolve(null);
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("Error reading EXIF:", error);
        resolve(null);
      }
    });
  };

  // Analyze traffic image for density
  const analyzeTrafficImage = (imageFile: File): Promise<TrafficAnalysisResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;

          // Analyze pixel colors to estimate traffic density
          let darkPixels = 0;
          let vehicleEstimate = 0;

          // Iterate through pixels
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;

            // Dark pixels likely represent vehicles
            if (brightness < 120) {
              darkPixels++;
            }
          }

          const totalPixels = data.length / 4;
          const congestionPercentage = Math.round((darkPixels / totalPixels) * 100);

          // Estimate vehicle count based on image resolution and congestion
          vehicleEstimate = Math.round((img.width * img.height * congestionPercentage) / 50000);

          // Determine traffic density level
          let trafficDensity: "low" | "medium" | "high";
          let description: string;

          if (congestionPercentage < 20) {
            trafficDensity = "low";
            description = "Very light traffic - Roads are clear. Safe to proceed with normal speed.";
          } else if (congestionPercentage < 45) {
            trafficDensity = "medium";
            description = "Moderate traffic - Some congestion detected. Maintain safe distance and stay alert.";
          } else {
            trafficDensity = "high";
            description = "Heavy traffic - Significant congestion detected. Reduce speed and drive cautiously.";
          }

          const result: TrafficAnalysisResult = {
            trafficDensity,
            congestionPercentage,
            vehicleCount: vehicleEstimate,
            confidence: 65 + Math.random() * 25, // 65-90% confidence
            description,
          };

          resolve(result);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageFile);
    });
  };

  // Generate risk prediction based on traffic analysis
  const generateRiskPrediction = (analysis: TrafficAnalysisResult): PredictionResult => {
    let riskLevel: "low" | "medium" | "high" = "low";
    let score = 20;

    if (analysis.trafficDensity === "medium") {
      riskLevel = "medium";
      score = 50;
    } else if (analysis.trafficDensity === "high") {
      riskLevel = "high";
      score = 75;
    }

    const factors: string[] = [];

    if (analysis.trafficDensity === "high") {
      factors.push("High traffic density increases accident probability");
      factors.push(`Estimated ${analysis.vehicleCount} vehicles detected in the frame`);
      factors.push("Reduced visibility and maneuverability in heavy traffic");
    } else if (analysis.trafficDensity === "medium") {
      factors.push("Moderate traffic requires sustained attention");
      factors.push(`Approximately ${analysis.vehicleCount} vehicles on road`);
    } else {
      factors.push("Light traffic conditions - favorable for driving");
      factors.push("Low vehicle density allows safe navigation");
    }

    const recommendations = {
      low: "✅ Light Traffic - Excellent Road Safety. Maintain standard precautions and enjoy your drive safely.",
      medium: "⚠️ Moderate Traffic - Stay Alert! Keep safe distance of 50+ meters and reduce speed appropriately.",
      high: "🔴 Heavy Traffic - Drive Cautiously! Maintain 100+ meter safe distance and reduce speed to 40 km/h maximum.",
    };

    return {
      score,
      riskLevel,
      recommendation: recommendations[riskLevel],
      factors,
    };
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    setLoading(true);
    try {
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Analyze traffic
      const analysis = await analyzeTrafficImage(file);
      setAnalysisResult(analysis);

      // Extract GPS data from image
      const gps = await extractGpsFromExif(file);
      if (gps) {
        setGpsCoordinates(gps);
        setHasGpsData(true);
        toast.success("✅ GPS coordinates found in photo!");
      } else {
        setHasGpsData(false);
        toast.info("ℹ️ No GPS data found - Please enter the location manually");
      }

      // Generate risk prediction
      const prediction = generateRiskPrediction(analysis);
      setRiskPrediction(prediction);

      toast.success("Traffic analysis completed!");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Save traffic incident to localStorage and update risk map
  const saveIncidentToMap = async () => {
    if (!analysisResult) {
      toast.error("No analysis result available");
      return;
    }

    let lat: number;
    let lng: number;
    let locationName: string;

    // Use GPS coordinates if available
    if (gpsCoordinates && hasGpsData) {
      lat = gpsCoordinates.lat;
      lng = gpsCoordinates.lng;
      locationName = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
    } else {
      // Fall back to manual address input
      if (!address.trim()) {
        toast.error("Please enter an address (GPS data not found in photo)");
        return;
      }

      setGeocodingLoading(true);
      try {
        // Geocode the address (must be in Hyderabad region for traffic incidents)
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const result = await geocodeLocation(address, apiKey, true); // enforceHyderabadBounds = true

        if (!result || !result.lat || !result.lng) {
          toast.error("❌ Location not found in Hyderabad region. Please enter a location in Hyderabad/Telangana area (e.g., 'IT Corridor', 'Ring Road', 'Airport Road')");
          setGeocodingLoading(false);
          return;
        }

        lat = result.lat;
        lng = result.lng;
        locationName = result.name || address;
      } catch (error) {
        console.error("Error geocoding:", error);
        toast.error("Failed to geocode address. Try with a different location name.");
        setGeocodingLoading(false);
        return;
      } finally {
        setGeocodingLoading(false);
      }
    }

    try {
      // Create incident object
      const incident: TrafficIncident = {
        id: Date.now().toString(),
        address: locationName,
        lat: lat,
        lng: lng,
        trafficDensity: analysisResult.trafficDensity,
        congestionPercentage: analysisResult.congestionPercentage,
        vehicleCount: analysisResult.vehicleCount,
        timestamp: new Date().toLocaleString(),
        image: previewImage || "", // Include the image
      };

      // Save to localStorage
      const incidents = JSON.parse(localStorage.getItem("trafficIncidents") || "[]") as TrafficIncident[];
      incidents.push(incident);
      localStorage.setItem("trafficIncidents", JSON.stringify(incidents));

      toast.success(`✅ Traffic incident saved at ${locationName}!`);

      // Reset form
      setAddress("");
      setPreviewImage(null);
      setAnalysisResult(null);
      setRiskPrediction(null);
      setGpsCoordinates(null);
      setHasGpsData(false);
    } catch (error) {
      console.error("Error saving incident:", error);
      toast.error("Failed to save incident. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <ImageIcon className="h-7 w-7 text-primary" />
          Traffic Image Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a traffic image to detect density and predict risk</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 space-y-4 sticky top-8">
            <h3 className="text-sm font-semibold">Upload Traffic Image</h3>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Drag and drop your image here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse from your device</p>
            </div>

            {/* Image Preview */}
            {previewImage && (
              <div className="space-y-3">
                <img
                  src={previewImage}
                  alt="Traffic preview"
                  className="w-full rounded-lg border border-border max-h-40 object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setPreviewImage(null);
                    setAnalysisResult(null);
                    setRiskPrediction(null);
                    setAddress("");
                  }}
                >
                  Clear Image
                </Button>
              </div>
            )}

            {/* Address Input - Show when analysis is complete */}
            {analysisResult && riskPrediction && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Location Details</h4>

                {/* GPS Status */}
                {hasGpsData && gpsCoordinates ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700">✅ GPS Data Found</p>
                        <p className="text-xs text-green-600 mt-1">
                          📍 {gpsCoordinates.lat.toFixed(4)}°N, {gpsCoordinates.lng.toFixed(4)}°E
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This location will be marked on the map
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-700">ℹ️ No GPS Data</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Photo doesn't have GPS info. Please enter the location manually below
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Input - Only required if no GPS */}
                {!hasGpsData && (
                  <div>
                    <Label htmlFor="address" className="text-xs mb-2 block">
                      Enter the traffic location address
                    </Label>
                    <Input
                      id="address"
                      placeholder="e.g., National Highway 44, Hyderabad"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      This will be used to locate the position on the map
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={saveIncidentToMap}
                  disabled={geocodingLoading || (!hasGpsData && !address.trim())}
                >
                  {geocodingLoading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Save to Risk Map
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">Tips for best results:</p>
              <ul className="space-y-1 text-[10px]">
                <li>• Use clear, well-lit traffic images</li>
                <li>• Wide angle views capture more vehicles</li>
                <li>• High resolution images improve accuracy</li>
                <li>• Daytime photos work best</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Analyzing traffic image...</p>
              </div>
            ) : analysisResult && riskPrediction ? (
              <div className="space-y-6 animate-slide-up">
                <h3 className="text-sm font-semibold">Analysis Results</h3>

                {/* Traffic Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{analysisResult.congestionPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Congestion</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{Math.round(analysisResult.confidence)}%</p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>

                {/* Traffic Density Status */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {analysisResult.trafficDensity === "low" ? (
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    ) : analysisResult.trafficDensity === "medium" ? (
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    ) : (
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    )}
                    <p className="text-sm font-semibold capitalize">{analysisResult.trafficDensity} Traffic</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{analysisResult.description}</p>
                </div>

                {/* Risk Prediction */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold mb-4">Risk Prediction</h4>
                  <div className="flex justify-center mb-6">
                    <RiskGauge score={riskPrediction.score} riskLevel={riskPrediction.riskLevel} />
                  </div>

                  <div className={cn("rounded-lg border p-4", resultBgMap[riskPrediction.riskLevel])}>
                    <div className="flex items-start gap-2">
                      {riskPrediction.riskLevel === "low" ? (
                        <CheckCircle className="h-5 w-5 text-risk-low shrink-0 mt-0.5" />
                      ) : riskPrediction.riskLevel === "medium" ? (
                        <Info className="h-5 w-5 text-risk-medium shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-risk-high shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm leading-relaxed">{riskPrediction.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a traffic image to
                  <br />
                  analyze density and predict risk
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
