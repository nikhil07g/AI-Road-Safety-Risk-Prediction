import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Chatbot from "@/components/Chatbot";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RiskPrediction from "./pages/RiskPrediction";
import RiskMap from "./pages/RiskMap";
import RoutePlanner from "./pages/RoutePlanner";
import TrafficImageAnalysis from "./pages/TrafficImageAnalysis";
import RoadQualityAnalysis from "./pages/RoadQualityAnalysis";
import Alerts from "./pages/Alerts";
import AboutModel from "./pages/AboutModel";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";

const queryClient = new QueryClient();
const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "957547550669-egtdkmh4lbdbjujos362j3br3pt2nb3g.apps.googleusercontent.com";

const App = () => (
  <ThemeProvider>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Chatbot />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/debug" element={<Debug />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/predict" element={<RiskPrediction />} />
                    <Route path="/map" element={<RiskMap />} />
                    <Route path="/route-planner" element={<RoutePlanner />} />
                    <Route path="/traffic-image" element={<TrafficImageAnalysis />} />
                    <Route path="/road-quality" element={<RoadQualityAnalysis />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/about" element={<AboutModel />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
