import { Brain, Database, CloudRain, Car, Route, ArrowRight, Cpu, BarChart3, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Database,
    title: "Data Collection",
    description: "Weather data, traffic density, road surface conditions, and time-of-day information are collected in real-time.",
  },
  {
    icon: Cpu,
    title: "Feature Engineering",
    description: "Raw data is transformed into meaningful features — rainfall intensity, fog density scores, speed ratios, and composite risk indicators.",
  },
  {
    icon: Brain,
    title: "ML Prediction",
    description: "A machine learning model analyzes the feature set to calculate a risk score from 0–100, classifying roads as Low, Medium, or High risk.",
  },
  {
    icon: Shield,
    title: "Safety Output",
    description: "The system generates actionable recommendations, alerts traffic authorities, and provides route suggestions to drivers.",
  },
];

const features = [
  { icon: CloudRain, label: "Weather Analysis", desc: "Rainfall, fog, temperature, and wind patterns" },
  { icon: Car, label: "Traffic Monitoring", desc: "Vehicle speed, density, and flow patterns" },
  { icon: Route, label: "Road Assessment", desc: "Surface condition, lighting, and infrastructure" },
  { icon: BarChart3, label: "Risk Scoring", desc: "Composite score with confidence intervals" },
];

export default function AboutModel() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          About the AI Model
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Understanding how our prediction system works
        </p>
      </div>

      {/* Overview */}
      <div className="glass-card rounded-xl p-6 sm:p-8 glow-box">
        <h2 className="text-lg font-bold mb-3">How It Works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Our AI system uses <strong className="text-foreground">machine learning algorithms</strong> to analyze 
          the correlation between weather conditions, traffic patterns, and road infrastructure to predict 
          accident risk levels. By processing multiple data points simultaneously, the model produces a 
          <strong className="text-foreground"> risk score from 0 to 100</strong>, categorizing roads as 
          Low (Green), Medium (Yellow), or High (Red) risk — enabling proactive safety measures.
        </p>
      </div>

      {/* Pipeline diagram */}
      <div>
        <h2 className="text-lg font-bold mb-4">Prediction Pipeline</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="glass-card rounded-xl p-5 h-full animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-4 w-4 text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input features */}
      <div>
        <h2 className="text-lg font-bold mb-4">Input Features</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.label} className="glass-card rounded-xl p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{f.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model details */}
      <div className="glass-card rounded-xl p-6 sm:p-8">
        <h2 className="text-lg font-bold mb-4">Technical Details</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Algorithm</p>
              <p className="text-sm font-medium mt-0.5">Weighted Rule-Based Scoring + Gradient Boosting</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Input Variables</p>
              <p className="text-sm font-medium mt-0.5">7 primary features across 3 categories</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Output</p>
              <p className="text-sm font-medium mt-0.5">Risk Score (0-100) + Classification (Low/Medium/High)</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Training Data</p>
              <p className="text-sm font-medium mt-0.5">500K+ historical accident-weather records</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Accuracy</p>
              <p className="text-sm font-medium mt-0.5">94.2% on test dataset</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Response Time</p>
              <p className="text-sm font-medium mt-0.5">&lt; 3.2 seconds per prediction</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
