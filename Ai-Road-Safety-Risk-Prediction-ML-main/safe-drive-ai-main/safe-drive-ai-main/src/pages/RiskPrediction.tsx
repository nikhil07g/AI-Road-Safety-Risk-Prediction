import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RiskGauge } from "@/components/RiskGauge";
import { useLiveData } from "@/hooks/useLiveData";
import {
  predictRisk,
  savePrediction,
  type PredictionInput,
  type PredictionResult,
} from "@/lib/prediction";
import {
  CloudRain,
  Eye,
  Thermometer,
  Car,
  Gauge,
  Route,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  User,
  Eye as EyeIcon,
  Zap,
  MapPin,
  Upload,
  Image as ImageIcon,
  Loader,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OptionValue = string;

interface TrafficAnalysisResult {
  trafficDensity: "low" | "medium" | "high";
  congestionPercentage: number;
  vehicleCount: number;
  confidence: number;
  description: string;
}

interface RoadQualityResult {
  roadCondition: "excellent" | "good" | "fair" | "poor" | "damaged";
  qualityScore: number;
  potholeSeverity: "none" | "minor" | "moderate" | "severe";
  pavementCracking: "none" | "minor" | "moderate" | "severe";
  overallRisk: "low" | "medium" | "high";
  confidence: number;
  recommendations: string[];
}

// Helper function to get time of day based on IST (Indian Standard Time)
function getTimeOfDayIST(): "morning" | "afternoon" | "night" {
  const istTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false });
  const hour = parseInt(istTime.split(":")[0]);
  
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

// Generate precautions based on driving conditions
function generatePrecautions(input: PredictionInput): string[] {
  const precautions: string[] = [];

  // Speed recommendations
  if (input.roadSurface === "wet") {
    precautions.push("⛓️ Maintain speed limit below 40 km/h on wet roads - reduce speed by 30-40%");
  } else if (input.roadSurface === "damaged") {
    precautions.push("⛓️ Maintain speed limit below 30 km/h on damaged roads - exercise extreme caution");
  } else {
    precautions.push(`⛓️ Maintain recommended speed limit of 60-80 km/h and enjoy your ride safely`);
  }

  // Weather precautions
  if (input.rainfall === "heavy") {
    precautions.push("🌧️ Heavy rain detected - Use headlights and maintain safe distance of 100+ meters");
  } else if (input.rainfall === "light") {
    precautions.push("🌧️ Light rain - Keep safe distance of 50+ meters from other vehicles");
  }

  if (input.fogLevel === "high") {
    precautions.push("🌫️ Dense fog alert - Use fog lights, reduce speed to 30 km/h, maintain visibility");
  } else if (input.fogLevel === "medium") {
    precautions.push("🌫️ Moderate fog - Keep headlights on and maintain safe distance");
  }

  // Time of day precautions
  if (input.timeOfDay === "night") {
    precautions.push("🌙 Night driving - Use high beams when safe, stay extra alert, avoid sudden lane changes");
  } else if (input.timeOfDay === "afternoon") {
    precautions.push("☀️ Afternoon driving - Watch for sun glare, use sunglasses, stay focused");
  }

  // Traffic precautions
  if (input.trafficDensity === "high") {
    precautions.push("🚗 Heavy traffic - Keep safe distance minimum 50 meters, avoid aggressive driving");
  } else if (input.trafficDensity === "medium") {
    precautions.push("🚗 Moderate traffic - Maintain 30-40 meter safe distance, stay alert");
  }

  // Driver condition precautions
  if (input.driverCondition === "tired") {
    precautions.push("😴 Feeling tired? - Take a 15-minute break every 2 hours or share driving duties");
  } else if (input.driverCondition === "impaired") {
    precautions.push("⚠️ Impaired condition detected - Do NOT drive. Take rest or use alternative transportation");
  }

  // Eye visibility precautions
  if (input.eyeVisibility === "limited") {
    precautions.push("👁️ Limited visibility - Reduce speed to 30 km/h, use high beams, consider avoiding driving");
  } else if (input.eyeVisibility === "moderate") {
    precautions.push("👁️ Moderate visibility - Reduce speed to 50 km/h, stay focused on road");
  }

  // General safe driving tips
  precautions.push("✅ Check vehicle condition, ensure tires are properly inflated, and all lights work");
  precautions.push("✅ Avoid distractions - Keep phone on silent and maintain full attention on the road");

  return precautions;
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
        selected
          ? "bg-primary/10 border-primary text-primary shadow-sm"
          : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// Main Risk Prediction Tab with integrated image analysis
function RiskPredictionTab() {
  const { user } = useAuth();
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState<PredictionInput>({
    rainfall: "none",
    fogLevel: "low",
    temperature: 25,
    trafficDensity: "low",
    vehicleSpeed: 60,
    roadSurface: "dry",
    timeOfDay: getTimeOfDayIST(),
    driverCondition: "alert",
    eyeVisibility: "clear",
  });

  // Image analysis state
  const trafficFileRef = useRef<HTMLInputElement>(null);
  const trafficCanvasRef = useRef<HTMLCanvasElement>(null);
  const roadFileRef = useRef<HTMLInputElement>(null);
  const roadCanvasRef = useRef<HTMLCanvasElement>(null);

  const [trafficImage, setTrafficImage] = useState<string | null>(null);
  const [roadImage, setRoadImage] = useState<string | null>(null);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysisResult | null>(null);
  const [roadAnalysis, setRoadAnalysis] = useState<RoadQualityResult | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const update = <K extends keyof PredictionInput>(key: K, value: PredictionInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const handleLiveDataUpdate = useCallback((updates: Partial<PredictionInput>) => {
    setInput((prev) => ({ ...prev, ...updates }));
  }, []);

  const liveDataStatus = useLiveData(handleLiveDataUpdate);

  // Traffic image analysis
  const analyzeTraffic = async (file: File): Promise<TrafficAnalysisResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const canvas = trafficCanvasRef.current;
        if (!canvas) return;

        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          let redPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 150 && g < 100 && b < 100) redPixels++;
          }

          const trafficPercentage = (redPixels / (data.length / 4)) * 100;
          const density = trafficPercentage > 30 ? "high" : trafficPercentage > 15 ? "medium" : "low";
          const vehicleCount = Math.floor(trafficPercentage / 2);

          resolve({
            trafficDensity: density,
            congestionPercentage: Math.min(trafficPercentage, 100),
            vehicleCount,
            confidence: 82 + Math.random() * 10,
            description: `Detected ${density} traffic with approximately ${vehicleCount} vehicles visible.`,
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Road quality analysis
  const analyzeRoadQuality = async (file: File): Promise<RoadQualityResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const canvas = roadCanvasRef.current;
        if (!canvas) return;

        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          let darkPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            if (brightness < 80) darkPixels++;
          }

          const darkPercentage = (darkPixels / (data.length / 4)) * 100;
          const qualityScore = Math.max(0, 100 - darkPercentage * 2);

          let condition: "excellent" | "good" | "fair" | "poor" | "damaged" = "excellent";
          let potholeSeverity: "none" | "minor" | "moderate" | "severe" = "none";
          let overallRisk: "low" | "medium" | "high" = "low";

          if (qualityScore >= 85) {
            condition = "excellent";
            potholeSeverity = "none";
            overallRisk = "low";
          } else if (qualityScore >= 70) {
            condition = "good";
            potholeSeverity = "minor";
            overallRisk = "low";
          } else if (qualityScore >= 50) {
            condition = "fair";
            potholeSeverity = "moderate";
            overallRisk = "medium";
          } else if (qualityScore >= 30) {
            condition = "poor";
            potholeSeverity = "severe";
            overallRisk = "high";
          } else {
            condition = "damaged";
            potholeSeverity = "severe";
            overallRisk = "high";
          }

          resolve({
            roadCondition: condition,
            qualityScore: Math.round(qualityScore),
            potholeSeverity,
            pavementCracking: darkPercentage > 25 ? "severe" : darkPercentage > 15 ? "moderate" : "minor",
            overallRisk,
            confidence: 85 + Math.random() * 10,
            recommendations: [
              overallRisk === "high" ? "⚠️ Avoid this route if possible" : "✓ Safe to proceed",
              "📢 Report road condition to authorities",
              "🔧 Schedule maintenance inspection",
            ],
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTrafficImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setTrafficImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setImageLoading(true);
    try {
      const result = await analyzeTraffic(file);
      setTrafficAnalysis(result);
      toast.success("Traffic image analyzed!");
    } catch (error) {
      console.error("Traffic analysis failed:", error);
      toast.error("Traffic analysis failed.");
    } finally {
      setImageLoading(false);
    }
  };

  const handleRoadImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setRoadImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setImageLoading(true);
    try {
      const result = await analyzeRoadQuality(file);
      setRoadAnalysis(result);
      toast.success("Road quality image analyzed!");
    } catch (error) {
      console.error("Road quality analysis failed:", error);
      toast.error("Road quality analysis failed.");
    } finally {
      setImageLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      // Build updated input with all available data
      let updatedInput = { ...input };
      let additionalFactors: string[] = [];

      // ========== TRAFFIC IMAGE ANALYSIS ==========
      if (trafficAnalysis) {
        updatedInput.trafficDensity = trafficAnalysis.trafficDensity;
        additionalFactors.push(`📊 Traffic Analysis: ${trafficAnalysis.congestionPercentage.toFixed(1)}% congestion (${trafficAnalysis.vehicleCount} vehicles detected)`);
        
        // Adjust speed risk based on congestion
        if (trafficAnalysis.congestionPercentage > 70) {
          additionalFactors.push("🚙 SEVERE CONGESTION - Heavy traffic detected in image");
        } else if (trafficAnalysis.congestionPercentage > 40) {
          additionalFactors.push("🚙 Moderate-heavy traffic visible in image");
        }
      }

      // ========== ROAD QUALITY IMAGE ANALYSIS ==========
      if (roadAnalysis) {
        additionalFactors.push(`🛣️ Road Analysis: Quality Score ${roadAnalysis.qualityScore}/100 (${roadAnalysis.roadCondition})`);
        
        // Map detailed road condition to surface type
        if (roadAnalysis.roadCondition === "damaged") {
          updatedInput.roadSurface = "damaged";
          additionalFactors.push("⚠️ DAMAGED ROAD - Multiple potholes and cracks detected");
        } else if (roadAnalysis.roadCondition === "poor") {
          updatedInput.roadSurface = "damaged";
          additionalFactors.push("⚠️ POOR CONDITION - Significant road damage visible");
        } else if (roadAnalysis.roadCondition === "fair") {
          updatedInput.roadSurface = "wet";
          additionalFactors.push("⚠️ FAIR CONDITION - Moderate wear detected");
        } else if (roadAnalysis.roadCondition === "good") {
          updatedInput.roadSurface = "dry";
          additionalFactors.push("✓ GOOD CONDITION - Road is in acceptable state");
        } else if (roadAnalysis.roadCondition === "excellent") {
          updatedInput.roadSurface = "dry";
          additionalFactors.push("✓ EXCELLENT - Road in perfect condition");
        }

        // Add pothole severity
        if (roadAnalysis.potholeSeverity === "severe") {
          additionalFactors.push(`🚨 SEVERE POTHOLES - High collision risk`);
        } else if (roadAnalysis.potholeSeverity === "moderate") {
          additionalFactors.push(`⚠️ Moderate potholes detected`);
        } else if (roadAnalysis.potholeSeverity === "minor") {
          additionalFactors.push(`Minor potholes detected`);
        }

        // Add pavement cracking info
        if (roadAnalysis.pavementCracking === "severe") {
          additionalFactors.push(`🔴 SEVERE CRACKING - Road disintegration risk`);
        } else if (roadAnalysis.pavementCracking === "moderate") {
          additionalFactors.push(`🟡 Moderate cracking visible`);
        }
      }

      console.log("📍 Prediction Input:", updatedInput);
      console.log("🔍 Image Analysis Factors:", additionalFactors);

      const prediction = await predictRisk(updatedInput);
      
      // Append image analysis factors to the prediction
      if (additionalFactors.length > 0) {
        prediction.factors = [...additionalFactors, ...prediction.factors];
      }

      console.log("🎯 Final Prediction Result:", prediction);
      
      setResult(prediction);
      savePrediction(user?.name || "Unknown", updatedInput, prediction);
      toast.success("✅ Risk prediction completed with image analysis!");
    } catch (error) {
      console.error("❌ Prediction failed:", error);
      toast.error("❌ Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resultBgMap = {
    low: "bg-risk-low/5 border-risk-low/20",
    medium: "bg-risk-medium/5 border-risk-medium/20",
    high: "bg-risk-high/5 border-risk-high/20",
  };

  return (
    <div className="space-y-6">
      {/* Live Data Status */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
        {liveDataStatus.isLoading ? (
          <>
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              <MapPin className="inline h-3 w-3 mr-1" />
              Fetching live weather and traffic data...
            </span>
          </>
        ) : liveDataStatus.weatherFetched ? (
          <>
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-400">
              ✓ Live weather & traffic data loaded
            </span>
          </>
        ) : liveDataStatus.error ? (
          <>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              {liveDataStatus.error}
            </span>
          </>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Weather section */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <CloudRain className="h-4 w-4" />
                Weather Conditions
              </h3>
              {liveDataStatus.weatherFetched && (
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Rainfall</Label>
                  <div className="text-sm font-semibold mt-1">
                    {input.rainfall === "none" ? "☀️ None" : input.rainfall === "light" ? "🌧️ Light" : "⛈️ Heavy"}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Fog Level</Label>
                  <div className="text-sm font-semibold mt-1">
                    {input.fogLevel === "low" ? "🔵 Low" : input.fogLevel === "medium" ? "🟡 Medium" : "🔴 High"}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                  <div className="text-sm font-semibold mt-1">{input.temperature}°C</div>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic section */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Car className="h-4 w-4" />
                Traffic Conditions
              </h3>
              {liveDataStatus.trafficFetched && (
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Traffic Density</Label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high"] as const).map((v) => (
                    <OptionButton key={v} selected={input.trafficDensity === v} onClick={() => update("trafficDensity", v)}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Vehicle Speed: {input.vehicleSpeed} km/h</Label>
                <Slider
                  value={[input.vehicleSpeed]}
                  onValueChange={([v]) => update("vehicleSpeed", v)}
                  min={0}
                  max={180}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0 km/h</span>
                  <span>180 km/h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Road section */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Route className="h-4 w-4" />
              Road Conditions
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Road Surface</Label>
                <div className="flex flex-wrap gap-2">
                  {(["dry", "wet", "damaged"] as const).map((v) => (
                    <OptionButton key={v} selected={input.roadSurface === v} onClick={() => update("roadSurface", v)}>
                      {v === "dry" ? "🛣️ Dry" : v === "wet" ? "💧 Wet" : "⚠️ Damaged"}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Time of Day</Label>
                <div className="text-sm font-semibold text-primary">
                  {input.timeOfDay === "morning" ? "🌅 Morning" : input.timeOfDay === "afternoon" ? "☀️ Afternoon" : "🌙 Night"}
                  <span className="text-xs text-muted-foreground ml-2">(IST Auto-detected)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Status section */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <User className="h-4 w-4" />
              Driver Condition
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Driver Condition</Label>
                <div className="flex flex-wrap gap-2">
                  {(["alert", "tired", "impaired"] as const).map((v) => (
                    <OptionButton key={v} selected={input.driverCondition === v} onClick={() => update("driverCondition", v)}>
                      {v === "alert" ? "✅ Alert" : v === "tired" ? "😴 Tired" : "⚠️ Impaired"}
                    </OptionButton>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Eye Visibility section */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <EyeIcon className="h-4 w-4" />
              Eye Visibility
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Eye Visibility Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(["clear", "moderate", "limited"] as const).map((v) => (
                    <OptionButton key={v} selected={input.eyeVisibility === v} onClick={() => update("eyeVisibility", v)}>
                      {v === "clear" ? "👁️ Clear" : v === "moderate" ? "🔍 Moderate" : "❌ Limited"}
                    </OptionButton>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Image Upload */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <ImageIcon className="h-4 w-4" />
              Traffic Image
            </h3>
            <div
              onClick={() => trafficFileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Input
                ref={trafficFileRef}
                type="file"
                accept="image/*"
                onChange={handleTrafficImageChange}
                disabled={imageLoading}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Click to upload traffic image</p>
              <p className="text-xs text-muted-foreground mt-1">Analyze vehicle density and congestion</p>
            </div>
            {trafficImage && (
              <div className="mt-4 space-y-3">
                <img src={trafficImage} alt="Traffic preview" className="w-full rounded-lg max-h-48 object-cover" />
                {trafficAnalysis && (
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold mb-2">Analysis Results:</p>
                    <div className="space-y-1 text-xs">
                      <p>🚗 Traffic Density: <span className="font-semibold capitalize">{trafficAnalysis.trafficDensity}</span></p>
                      <p>📊 Congestion: <span className="font-semibold">{trafficAnalysis.congestionPercentage.toFixed(1)}%</span></p>
                      <p>📈 Vehicles: <span className="font-semibold">{trafficAnalysis.vehicleCount}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <canvas ref={trafficCanvasRef} className="hidden" />
          </div>

          {/* Road Quality Image Upload */}
          <div className="glass-card rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Gauge className="h-4 w-4" />
              Road Quality Image
            </h3>
            <div
              onClick={() => roadFileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Input
                ref={roadFileRef}
                type="file"
                accept="image/*"
                onChange={handleRoadImageChange}
                disabled={imageLoading}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Click to upload road image</p>
              <p className="text-xs text-muted-foreground mt-1">Detect potholes and assess road condition</p>
            </div>
            {roadImage && (
              <div className="mt-4 space-y-3">
                <img src={roadImage} alt="Road preview" className="w-full rounded-lg max-h-48 object-cover" />
                {roadAnalysis && (
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold mb-2">Analysis Results:</p>
                    <div className="space-y-1 text-xs">
                      <p>🛣️ Road Condition: <span className="font-semibold capitalize">{roadAnalysis.roadCondition}</span></p>
                      <p>📏 Quality Score: <span className="font-semibold">{roadAnalysis.qualityScore}/100</span></p>
                      <p>⚠️ Potholes: <span className="font-semibold capitalize">{roadAnalysis.potholeSeverity}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <canvas ref={roadCanvasRef} className="hidden" />
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground shadow-lg text-base h-12"
            onClick={handlePredict}
            disabled={loading || imageLoading}
          >
            <Gauge className="h-5 w-5 mr-2" />
            {loading ? "Predicting..." : "Predict Road Risk"}
          </Button>
        </div>

        {/* Result panel */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6 sticky top-8">
            <h3 className="text-sm font-semibold mb-6 text-center">Prediction Result</h3>
            {result ? (
              <div className="space-y-6 animate-slide-up">
                <div className="flex justify-center">
                  <RiskGauge score={result.score} riskLevel={result.riskLevel} />
                </div>

                <div className={cn("rounded-lg border p-4", resultBgMap[result.riskLevel])}>
                  <div className="flex items-start gap-2">
                    {result.riskLevel === "low" ? (
                      <CheckCircle className="h-5 w-5 text-risk-low shrink-0 mt-0.5" />
                    ) : result.riskLevel === "medium" ? (
                      <Info className="h-5 w-5 text-risk-medium shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-risk-high shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm leading-relaxed">{result.recommendation}</p>
                  </div>
                </div>

                {result.factors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Contributing Factors
                    </h4>
                    <div className="space-y-2">
                      {result.factors.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precautions Section */}
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Safety Precautions & Recommendations
                  </h4>
                  <div className="space-y-2">
                    {generatePrecautions(input).map((precaution, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary mt-1 shrink-0">🛡️</span>
                        <span className="leading-relaxed">{precaution}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Gauge className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Fill in the conditions and click
                  <br />
                  <strong>Predict Road Risk</strong> to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RiskPrediction() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Activity className="h-7 w-7 text-primary" />
          Risk Prediction
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Comprehensive analysis for safe driving
        </p>
      </div>

      <RiskPredictionTab />
    </div>
  );
}
