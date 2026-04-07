import { Shield, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPredictions, type PredictionRecord } from "@/lib/prediction";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const riskColors = {
  low: "text-risk-low bg-risk-low/10",
  medium: "text-risk-medium bg-risk-medium/10",
  high: "text-risk-high bg-risk-high/10",
};

export default function Admin() {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);

  useEffect(() => {
    setPredictions(getPredictions());
  }, []);

  const handleDownload = () => {
    if (predictions.length === 0) {
      toast.error("No predictions to download");
      return;
    }
    const headers = ["Timestamp", "User", "Rainfall", "Fog", "Temp(°C)", "Traffic", "Speed(km/h)", "Road", "Time", "Risk", "Score"];
    const rows = predictions.map((p) => [
      new Date(p.timestamp).toLocaleString(),
      p.userName,
      p.input.rainfall,
      p.input.fogLevel,
      p.input.temperature,
      p.input.trafficDensity,
      p.input.vehicleSpeed,
      p.input.roadSurface,
      p.input.timeOfDay,
      p.result.riskLevel.toUpperCase(),
      p.result.score,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prediction_history.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const handleClear = () => {
    localStorage.removeItem("wrp_predictions");
    setPredictions([]);
    toast.success("Prediction history cleared");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all prediction records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{predictions.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-risk-low">{predictions.filter((p) => p.result.riskLevel === "low").length}</p>
          <p className="text-xs text-muted-foreground">Low Risk</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-risk-medium">{predictions.filter((p) => p.result.riskLevel === "medium").length}</p>
          <p className="text-xs text-muted-foreground">Medium Risk</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-risk-high">{predictions.filter((p) => p.result.riskLevel === "high").length}</p>
          <p className="text-xs text-muted-foreground">High Risk</p>
        </div>
      </div>

      {/* Table */}
      {predictions.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rain</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fog</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Speed</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Road</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Risk</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={p.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 0 && "bg-muted/10")}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{p.userName}</td>
                    <td className="px-4 py-3 capitalize">{p.input.rainfall}</td>
                    <td className="px-4 py-3 capitalize">{p.input.fogLevel}</td>
                    <td className="px-4 py-3">{p.input.vehicleSpeed} km/h</td>
                    <td className="px-4 py-3 capitalize">{p.input.roadSurface}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-bold uppercase px-2 py-1 rounded-full", riskColors[p.result.riskLevel])}>
                        {p.result.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">{p.result.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No predictions yet. Run a prediction to see data here.</p>
        </div>
      )}
    </div>
  );
}
