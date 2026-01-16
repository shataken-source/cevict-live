import { ArrowRight, CheckCircle, Heart, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - PetReunion',
  description: 'Learn about PetReunion - Our mission to reunite lost pets with their families using AI technology.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            About PetReunion
          </h1>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
            Every pet deserves to come home. We use AI-powered technology to help reunite lost pets with their families,
            24/7, completely free. Forever.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {/* Mission */}
        <div className="glass-card rounded-2xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Our Mission
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-4">
            Every pet deserves to come home. PetReunion uses AI-powered technology to help reunite lost pets with their families,
            24/7, completely free.
          </p>
          <p className="text-slate-600 text-lg leading-relaxed">
            We believe that no family should have to pay to find their lost pet. That's why PetReunion is and always will be 100% free.
          </p>
        </div>

        {/* How We're Different */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            How We're Different
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-5">
                <Zap size={32} color="white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                AI-Powered Matching
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Our advanced AI scans photos and descriptions 24/7, providing confidence scores and explainable matches.
              </p>
            </div>

            <div
              className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-5">
                <Shield size={32} color="white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Privacy-First
              </h3>
              <p className="text-slate-600 leading-relaxed">
                We use fuzzy geolocation to protect your safety. Your exact address is never exposed.
              </p>
            </div>

            <div
              className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-5">
                <Heart size={32} color="white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Free Forever
              </h3>
              <p className="text-slate-600 leading-relaxed">
                No fees, no subscriptions, no hidden costs. Reuniting pets should be free.
              </p>
            </div>

            <div
              className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center mb-5">
                <Users size={32} color="white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Community-Driven
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Built by pet lovers, for pet lovers. Every report helps the entire community.
              </p>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          marginBottom: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <Sparkles size={28} color="#667eea" />
            <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#333", margin: 0 }}>
              Our Technology
            </h2>
          </div>
          <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8", marginBottom: "24px" }}>
            PetReunion uses state-of-the-art AI models (including Claude 3.5 Sonnet) to analyze pet photos, match breeds,
            and identify similarities. Every match includes:
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Confidence scores (0-100%) for transparency</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Explainable AI reasoning (why this match was made)</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Risk assessment and verification requirements</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Full audit trails for accountability</span>
            </div>
          </div>
        </div>

        {/* Trust & Safety */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          marginBottom: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <Shield size={28} color="#667eea" />
            <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#333", margin: 0 }}>
              Trust & Safety
            </h2>
          </div>
          <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8", marginBottom: "24px" }}>
            We take your privacy and security seriously:
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>GDPR and CCPA compliant</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>HTTPS encryption for all data</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Fuzzy geolocation to protect addresses</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Transparent AI confidence scores</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <CheckCircle size={20} color="#10b981" style={{ marginTop: "4px", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: "16px" }}>Human verification for high-risk matches</span>
            </div>
          </div>
        </div>

        {/* Get Involved */}
        <div style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
          borderRadius: "20px",
          padding: "40px",
          marginBottom: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <Users size={28} color="#667eea" />
            <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#333", margin: 0 }}>
              Get Involved
            </h2>
          </div>
          <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8", marginBottom: "24px" }}>
            Want to help? Here's how:
          </p>
          <div style={{ display: "grid", gap: "12px", marginBottom: "30px" }}>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <div style={{ fontSize: "20px" }}>🐾</div>
              <span style={{ color: "#374151", fontSize: "16px" }}>Report lost or found pets in your area</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <div style={{ fontSize: "20px" }}>📢</div>
              <span style={{ color: "#374151", fontSize: "16px" }}>Share PetReunion with your community</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <div style={{ fontSize: "20px" }}>🤝</div>
              <span style={{ color: "#374151", fontSize: "16px" }}>Volunteer with local shelters</span>
            </div>
            <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
              <div style={{ fontSize: "20px" }}>💝</div>
              <span style={{ color: "#374151", fontSize: "16px" }}>
                <Link href="/donate" style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}>
                  Donate
                </Link> to keep the service free
              </span>
            </div>
          </div>
          <Link href="/donate">
            <button
              className="transition-transform hover:-translate-y-0.5"
              style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s"
              }}
            >
              Support PetReunion
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>

        {/* Contact Section */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", marginBottom: "16px" }}>
            Contact Us
          </h2>
          <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8", marginBottom: "24px" }}>
            Questions? Suggestions? We'd love to hear from you.
          </p>
          <Link href="/contact">
            <button
              className="transition-colors hover:bg-[#667eea] hover:text-white"
              style={{
                padding: "14px 28px",
                background: "white",
                color: "#667eea",
                border: "2px solid #667eea",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
            >
              Visit our Contact Page
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>

        {/* Back to Home */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link href="/" style={{
            color: "#667eea",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}
