import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Route,
  Users,
  CloudSun,
  ArrowRight,
  CloudRain,
  Activity,
} from "lucide-react";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Accident Prevention",
    description: "AI analyzes weather patterns to predict and prevent road accidents before they happen.",
  },
  {
    icon: Route,
    title: "Smart Route Planning",
    description: "Get real-time route recommendations based on current weather and road conditions.",
  },
  {
    icon: Users,
    title: "Traffic Police Support",
    description: "Empower traffic authorities with predictive data to deploy resources effectively.",
  },
  {
    icon: CloudSun,
    title: "Climate Adaptive Safety",
    description: "Dynamic risk assessment that adapts to changing weather conditions in real-time.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#000000',
    }}>
      {/* Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              height: '40px',
              width: '40px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
            }}>
              <CloudRain style={{ height: '24px', width: '24px', color: 'white' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>RoadRisk AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            {isAuthenticated ? (
              <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
                Dashboard
                <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Get Started
                <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        backgroundColor: '#f9fafb',
        overflow: 'hidden'
      }}>
        <div style={{
          maxWidth: '1024px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '40px 24px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '24px',
            padding: '12px 16px',
            marginBottom: '24px'
          }}>
            <Activity style={{ height: '16px', width: '16px', color: '#3b82f6' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e40af' }}>
              AI-Powered Safety Analysis
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 8vw, 64px)',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: '#000000',
            lineHeight: '1.2'
          }}>
            AI Powered <span style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Road Safety</span> Prediction
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#4b5563',
            maxWidth: '640px',
            margin: '0 auto 32px',
            lineHeight: '1.6'
          }}>
            Weather conditions cause 21% of all road accidents. Our AI system predicts risk levels in real-time to keep drivers safe and help traffic authorities make smarter decisions.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '48px'
          }}>
            <Button
              size="lg"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Get Started
              <ArrowRight style={{ height: '20px', width: '20px', marginLeft: '12px' }} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/debug")}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              View Debug Info
            </Button>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            maxWidth: '500px',
            margin: '32px auto 0',
            paddingTop: '32px',
            borderTop: '1px solid #e5e7eb'
          }}>
            {[
              { value: "21%", label: "Weather-caused accidents" },
              { value: "3.2s", label: "Prediction speed" },
              { value: "94%", label: "Model accuracy" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '8px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{
        padding: '80px 24px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#000000',
              marginBottom: '16px'
            }}>
              Why Choose RoadRisk AI?
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#4b5563'
            }}>
              Our advanced AI system provides comprehensive road safety analysis
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px'
          }}>
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} style={{
                  padding: '32px 24px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <Icon style={{
                    height: '40px',
                    width: '40px',
                    color: '#3b82f6',
                    marginBottom: '16px'
                  }} />
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#000000',
                    marginBottom: '12px'
                  }}>
                    {benefit.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    lineHeight: '1.6'
                  }}>
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '80px 24px',
        backgroundColor: '#f3f4f6',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '48px 32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '24px'
          }}>
            Ready to Make Roads Safer?
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#4b5563',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            Join thousands of drivers and traffic authorities using AI-powered predictions to stay safe on the roads.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
            style={{
              padding: '12px 40px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Start Now
            <ArrowRight style={{ height: '20px', width: '20px', marginLeft: '12px' }} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 24px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <CloudRain style={{ height: '20px', width: '20px', color: '#3b82f6' }} />
            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#000' }}>RoadRisk AI</span>
          </div>
          <p style={{
            color: '#4b5563',
            fontSize: '14px'
          }}>
            © 2026 RoadRisk AI. All rights reserved. Making roads safer with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
