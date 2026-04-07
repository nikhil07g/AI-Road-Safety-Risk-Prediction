import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Activity, Map, Bell, Brain, Lightbulb, Calendar, Clock, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { useDatasetStats } from "@/hooks/useDatasetStats";

const safetyTips = [
  "Always reduce speed during rain — wet roads increase stopping distance by up to 50%.",
  "In foggy conditions, use low-beam headlights and maintain extra distance from other vehicles.",
  "Check tire pressure regularly — under-inflated tires are more prone to hydroplaning.",
  "Avoid cruise control on wet roads — manual control helps you react faster to hazards.",
  "Plan your route before traveling in severe weather to avoid accident-prone areas.",
  "Keep your windshield clean and wipers functional for optimal visibility.",
  "During storms, pull over safely and wait if visibility drops below 100 meters.",
];

const quickLinks = [
  { to: "/predict", icon: Activity, label: "Predict Risk", desc: "Run a new prediction" },
  { to: "/map", icon: Map, label: "Risk Map", desc: "View danger zones" },
  { to: "/route-planner", icon: Navigation, label: "Route Planner", desc: "Plan safe route" },
  { to: "/alerts", icon: Bell, label: "Alerts", desc: "Check warnings" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { stats } = useDatasetStats();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % safetyTips.length;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your road safety overview</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        </div>
      </div>

      {/* Safety tip */}
      <div className="glass-card rounded-xl p-5 sm:p-6 border-l-4 border-l-primary glow-box">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Safety Tip of the Day</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{safetyTips[tipIndex]}</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="glass-card rounded-xl p-5 text-left hover:glow-box hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
              <link.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{link.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
          </button>
        ))}
      </div>

      {/* Weather overview cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { 
            label: "Dataset Total", 
            value: stats ? `${(stats.totalAccidents / 1000000).toFixed(1)}M` : "4M", 
            sub: "US Accident Records", 
            color: "text-primary" 
          },
          { 
            label: "Top Risk Factor", 
            value: stats?.topCause || "Weather", 
            sub: stats?.weekdayRisk || "Weekday Impact", 
            color: "text-risk-medium" 
          },
          { 
            label: "Night Risk", 
            value: stats?.nightRiskIncrease || "3x Higher", 
            sub: "Compared to daytime", 
            color: "text-risk-high" 
          },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
            <p className={`text-xl font-bold mt-2 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
