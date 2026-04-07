import { AlertTriangle, CloudRain, Eye, Zap, Thermometer, Car } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  type: "rain" | "fog" | "speed" | "temperature" | "general";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: string;
}

const iconMap = {
  rain: CloudRain,
  fog: Eye,
  speed: Car,
  temperature: Thermometer,
  general: Zap,
};

const severityStyles = {
  info: "border-l-primary bg-primary/5",
  warning: "border-l-risk-medium bg-risk-medium/5",
  critical: "border-l-risk-high bg-risk-high/5",
};

const severityBadge = {
  info: "bg-primary/10 text-primary",
  warning: "bg-risk-medium/10 text-risk-medium",
  critical: "bg-risk-high/10 text-risk-high",
};

export function AlertCard({ alert }: { alert: Alert }) {
  const Icon = iconMap[alert.type];

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 border-l-4 p-4 transition-all hover:shadow-md animate-slide-up",
        severityStyles[alert.severity]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold">{alert.title}</h4>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", severityBadge[alert.severity])}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">{alert.timestamp}</p>
        </div>
      </div>
    </div>
  );
}
