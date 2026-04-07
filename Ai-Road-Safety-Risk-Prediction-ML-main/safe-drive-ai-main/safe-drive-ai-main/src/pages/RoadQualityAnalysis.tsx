import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, AlertTriangle, CheckCircle, Info, Loader, MapPin, AlertCircle, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RiskGauge } from "@/components/RiskGauge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RoadQualityResult {
  roadCondition: "excellent" | "good" | "fair" | "poor" | "damaged";
  qualityScore: number; // 0-100
  potholeSeverity: "none" | "minor" | "moderate" | "severe";
  pavementCracking: "none" | "minor" | "moderate" | "severe";
  overallRisk: "low" | "medium" | "high";
  confidence: number;
  recommendations: string[];
}

interface CombinedRiskAssessment {
  roadQualityRisk: number;
  weatherRisk: number;
  trafficRisk: number;
  combinedRisk: number;
  overallRecommendation: string;
}

const getRoadConditionColor = (condition: string) => {
  const colors: Record<string, string> = {
    excellent: "text-green-600 dark:text-green-400",
    good: "text-blue-600 dark:text-blue-400",
    fair: "text-yellow-600 dark:text-yellow-400",
    poor: "text-orange-600 dark:text-orange-400",
    damaged: "text-red-600 dark:text-red-400",
  };
  return colors[condition] || "text-gray-600";
};

const analyzeRoadQuality = (file: File): Promise<RoadQualityResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const canvas = document.createElement("canvas");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Analyze pixel data for road quality
          let darkPixels = 0;
          let crackLikePatterns = 0;
          let totalPixels = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Dark pixels (road surface)
            if (r + g + b < 200) {
              darkPixels++;
            }

            // Crack detection (sharp contrast)
            if (i + 8 < data.length) {
              const nextR = data[i + 4];
              const nextG = data[i + 5];
              const nextB = data[i + 6];
              const contrast = Math.abs(r - nextR) + Math.abs(g - nextG) + Math.abs(b - nextB);
              if (contrast > 150) {
                crackLikePatterns++;
              }
            }
          }

          const darkPixelPercentage = (darkPixels / totalPixels) * 100;
          const crackPercentage = (crackLikePatterns / totalPixels) * 100;

          // Generate road quality assessment
          let roadCondition: "excellent" | "good" | "fair" | "poor" | "damaged";
          let qualityScore: number;
          let potholeSeverity: "none" | "minor" | "moderate" | "severe";
          let pavementCracking: "none" | "minor" | "moderate" | "severe";
          let overallRisk: "low" | "medium" | "high";

          if (darkPixelPercentage > 85 && crackPercentage < 5) {
            roadCondition = "excellent";
            qualityScore = 90 + Math.random() * 10;
            potholeSeverity = "none";
            pavementCracking = "none";
            overallRisk = "low";
          } else if (darkPixelPercentage > 75 && crackPercentage < 10) {
            roadCondition = "good";
            qualityScore = 75 + Math.random() * 15;
            potholeSeverity = "minor";
            pavementCracking = "minor";
            overallRisk = "low";
          } else if (darkPixelPercentage > 65 && crackPercentage < 20) {
            roadCondition = "fair";
            qualityScore = 55 + Math.random() * 20;
            potholeSeverity = "moderate";
            pavementCracking = "moderate";
            overallRisk = "medium";
          } else if (darkPixelPercentage > 50 && crackPercentage < 35) {
            roadCondition = "poor";
            qualityScore = 35 + Math.random() * 20;
            potholeSeverity = "severe";
            pavementCracking = "severe";
            overallRisk = "high";
          } else {
            roadCondition = "damaged";
            qualityScore = Math.random() * 35;
            potholeSeverity = "severe";
            pavementCracking = "severe";
            overallRisk = "high";
          }

          const recommendations: string[] = [];
          if (overallRisk === "high") {
            recommendations.push("🚨 Road condition is CRITICAL - Use alternate route if possible");
            recommendations.push("⚠️ Reduce speed to 20-30 km/h to avoid damage");
            recommendations.push("🔧 Report this road damage to local authorities");
            recommendations.push("💨 Avoid sudden acceleration or braking");
          } else if (overallRisk === "medium") {
            recommendations.push("⚠️ Moderate road damage detected - Exercise caution");
            recommendations.push("📍 Slow down and watch for potholes");
            recommendations.push("🔧 Consider reporting to municipality for repairs");
            recommendations.push("💧 Especially hazardous when wet - use extra care");
          } else {
            recommendations.push("✅ Road is in good condition - Safe to travel");
            recommendations.push("🛣️ Maintain normal driving precautions");
            recommendations.push("💡 Monitor for any changes in road condition");
          }

          resolve({
            roadCondition,
            qualityScore,
            potholeSeverity,
            pavementCracking,
            overallRisk,
            confidence: 75 + Math.random() * 20,
            recommendations,
          });
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

const calculateCombinedRisk = (
  roadQuality: RoadQualityResult,
  temperature: number,
  rainfall: string,
  visibility: number,
  trafficDensity: string
): CombinedRiskAssessment => {
  // Calculate road quality risk (0-100)
  const roadQualityRiskScore = 100 - roadQuality.qualityScore;

  // Calculate weather risk (0-100)
  let weatherRiskScore = 0;
  if (rainfall === "heavy") weatherRiskScore += 35;
  else if (rainfall === "moderate") weatherRiskScore += 20;
  else if (rainfall === "light") weatherRiskScore += 10;

  if (visibility < 300) weatherRiskScore += 30;
  else if (visibility < 600) weatherRiskScore += 15;

  if (temperature < 0) weatherRiskScore += 25;
  else if (temperature > 42) weatherRiskScore += 15;

  // Cap weather risk
  weatherRiskScore = Math.min(100, weatherRiskScore);

  // Calculate traffic risk (0-100)
  const trafficRiskScore = trafficDensity === "high" ? 40 : trafficDensity === "medium" ? 25 : 10;

  // Combined risk = weighted average
  const combinedRisk =
    roadQualityRiskScore * 0.4 + weatherRiskScore * 0.35 + trafficRiskScore * 0.25;

  let overallRecommendation = "";
  if (combinedRisk >= 70) {
    overallRecommendation =
      "🛑 CRITICAL RISK - Road damage + adverse conditions = DO NOT TRAVEL if avoidable. If necessary: Drive at 20-30 km/h, maximum caution.";
  } else if (combinedRisk >= 50) {
    overallRecommendation =
      "⚠️ HIGH RISK - Multiple hazards detected. Reduce speed by 20%, increase following distance, stay alert for sudden road changes.";
  } else if (combinedRisk >= 30) {
    overallRecommendation =
      "⚡ MODERATE RISK - Some hazards present. Drive carefully, maintain safe following distance, watch for potholes and wet patches.";
  } else {
    overallRecommendation =
      "✅ LOW RISK - Road and weather conditions are manageable. Maintain normal precautions and safe driving practices.";
  }

  return {
    roadQualityRisk: roadQualityRiskScore,
    weatherRisk: weatherRiskScore,
    trafficRisk: trafficRiskScore,
    combinedRisk: Math.round(combinedRisk),
    overallRecommendation,
  };
};

export default function RoadQualityAnalysis() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RoadQualityResult | null>(null);
  const [combinedRisk, setCombinedRisk] = useState<CombinedRiskAssessment | null>(null);

  // Simulated weather data
  const [weatherData] = useState({
    temperature: 22,
    rainfall: "light" as const,
    visibility: 800,
    trafficDensity: "medium" as const,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze
    setLoading(true);
    try {
      const result = await analyzeRoadQuality(file);
      setAnalysisResult(result);

      // Calculate combined risk
      const combined = calculateCombinedRisk(
        result,
        weatherData.temperature,
        weatherData.rainfall,
        weatherData.visibility,
        weatherData.trafficDensity
      );
      setCombinedRisk(combined);

      toast.success("Road quality analysis complete!");
    } catch (error) {
      toast.error("Error analyzing image");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Gauge className="h-7 w-7 text-primary" />
          Road Quality Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload road images to assess quality and predict combined risk with weather & traffic
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold">Upload Road Image</h3>

            <div className="space-y-3">
              <div
                onClick={handleClick}
                className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Upload road image (JPG, PNG)</p>
              </div>

              <Button onClick={handleClick} variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
            </div>

            {previewImage && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Preview</Label>
                <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              </div>
            )}

            {/* Weather Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-xs">
              <p className="font-semibold">Current Weather Context</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Temperature</p>
                  <p className="font-semibold">{weatherData.temperature}°C</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rainfall</p>
                  <p className="font-semibold capitalize">{weatherData.rainfall}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Visibility</p>
                  <p className="font-semibold">{weatherData.visibility}m</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Traffic</p>
                  <p className="font-semibold capitalize">{weatherData.trafficDensity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Analyzing road quality...</p>
              </div>
            ) : analysisResult && combinedRisk ? (
              <div className="space-y-6 animate-slide-up">
                <h3 className="text-sm font-semibold">Road Quality Assessment</h3>

                {/* Road Condition */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold">Road Condition</p>
                    <Badge className={cn("capitalize", getRoadConditionColor(analysisResult.roadCondition))}>
                      {analysisResult.roadCondition}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <p className="text-muted-foreground">Quality Score</p>
                        <p className="font-semibold">{analysisResult.qualityScore.toFixed(0)}/100</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            analysisResult.qualityScore > 75
                              ? "bg-green-500"
                              : analysisResult.qualityScore > 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${analysisResult.qualityScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Pothole Severity</p>
                        <Badge variant="outline" className="capitalize mt-1">
                          {analysisResult.potholeSeverity}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cracking</p>
                        <Badge variant="outline" className="capitalize mt-1">
                          {analysisResult.pavementCracking}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combined Risk Assessment */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Combined Risk Assessment</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{combinedRisk.roadQualityRisk.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Road Quality Risk</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{combinedRisk.weatherRisk.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Weather Risk</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{combinedRisk.trafficRisk.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Traffic Risk</p>
                    </div>
                  </div>

                  {/* Overall Risk Gauge */}
                  <div className="flex justify-center py-6">
                    <RiskGauge 
                      score={combinedRisk.combinedRisk} 
                      riskLevel={
                        combinedRisk.combinedRisk >= 70
                          ? "high"
                          : combinedRisk.combinedRisk >= 50
                          ? "medium"
                          : "low"
                      }
                    />
                  </div>

                  {/* Recommendation */}
                  <div
                    className={cn(
                      "rounded-lg p-4 border-l-4",
                      combinedRisk.combinedRisk >= 70
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                        : combinedRisk.combinedRisk >= 50
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
                        : combinedRisk.combinedRisk >= 30
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-green-500 bg-green-50 dark:bg-green-950/30"
                    )}
                  >
                    <p className="text-sm font-semibold mb-2">Overall Assessment</p>
                    <p className="text-sm">{combinedRisk.overallRecommendation}</p>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Safety Recommendations</p>
                  <div className="space-y-2">
                    {analysisResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                          {i + 1}
                        </div>
                        <p className="text-muted-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Gauge className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Upload a road image to analyze quality</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
