import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/prediction";

interface RiskGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: number;
}

export function RiskGauge({ score, riskLevel, size = 200 }: RiskGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const colorMap = {
    low: "stroke-risk-low",
    medium: "stroke-risk-medium",
    high: "stroke-risk-high",
  };

  const bgColorMap = {
    low: "text-risk-low",
    medium: "text-risk-medium",
    high: "text-risk-high",
  };

  const labelMap = {
    low: "LOW RISK",
    medium: "MEDIUM RISK",
    high: "HIGH RISK",
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="transform -rotate-90"
        style={{ width: size, height: size }}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={cn(colorMap[riskLevel], "animate-gauge-fill")}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
        {/* Glow effect */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={cn(colorMap[riskLevel], "animate-pulse-glow opacity-30")}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: "blur(4px)" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold", bgColorMap[riskLevel])}>{score}</span>
        <span className={cn("text-xs font-semibold tracking-wider uppercase mt-1", bgColorMap[riskLevel])}>
          {labelMap[riskLevel]}
        </span>
      </div>
    </div>
  );
}
