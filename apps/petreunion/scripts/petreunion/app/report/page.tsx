'use client';

import { AlertCircle, ArrowRight, CheckCircle, Heart, Search } from 'lucide-react';
import Link from 'next/link';

export default function ReportPage() {
  return (
    <div style={{ fontFamily: "system-ui", minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "80px 20px 60px",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "20px", lineHeight: "1.2" }}>
            Report a Pet
          </h1>
          <p style={{ fontSize: "20px", opacity: 0.95, lineHeight: "1.6", maxWidth: "700px", margin: "0 auto" }}>
            Help reunite pets with their families. Whether you've lost a pet or found one, your report makes a difference.
            Our AI-powered system works 24/7 to find matches.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "30px",
          marginBottom: "60px"
        }}>
          {/* Lost Pet Card */}
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "transform 0.3s, box-shadow 0.3s",
            border: "2px solid transparent"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px)";
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(102, 126, 234, 0.3)";
            e.currentTarget.style.borderColor = "#667eea";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
            e.currentTarget.style.borderColor = "transparent";
          }}
          >
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 4px 15px rgba(248, 113, 113, 0.3)"
            }}>
              <Heart size={40} color="white" />
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#333", marginBottom: "12px", textAlign: "center" }}>
              I Lost a Pet
            </h2>
            <p style={{ color: "#666", marginBottom: "30px", textAlign: "center", lineHeight: "1.6", fontSize: "16px" }}>
              Report your lost pet to activate our AI search. We'll scan found reports, shelters, and social media 24/7.
            </p>

            <div style={{ marginBottom: "30px", display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Immediate AI search activation</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>24/7 monitoring of found reports</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Instant email alerts for matches</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Shelter notifications in your area</span>
              </div>
            </div>

            <Link href="/report/lost" style={{ textDecoration: "none", display: "block" }}>
              <button style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.3)";
              }}
              >
                Report Lost Pet
                <ArrowRight size={20} />
              </button>
            </Link>
          </div>

          {/* Found Pet Card */}
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "transform 0.3s, box-shadow 0.3s",
            border: "2px solid transparent"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px)";
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(16, 185, 129, 0.3)";
            e.currentTarget.style.borderColor = "#10b981";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
            e.currentTarget.style.borderColor = "transparent";
          }}
          >
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
            }}>
              <Search size={40} color="white" />
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#333", marginBottom: "12px", textAlign: "center" }}>
              I Found a Pet
            </h2>
            <p style={{ color: "#666", marginBottom: "30px", textAlign: "center", lineHeight: "1.6", fontSize: "16px" }}>
              Help a lost pet find their way home. Our AI will match your report with lost pet listings instantly.
            </p>

            <div style={{ marginBottom: "30px", display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Instant match with lost pet reports</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Safety guidelines and tips</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Connect with pet owners</span>
              </div>
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <CheckCircle size={20} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ color: "#374151", fontSize: "15px" }}>Local shelter resources</span>
              </div>
            </div>

            <Link href="/report/found" style={{ textDecoration: "none", display: "block" }}>
              <button style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
              }}
              >
                Report Found Pet
                <ArrowRight size={20} />
              </button>
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#333", marginBottom: "24px" }}>
            Need Help?
          </h2>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "center"
          }}>
            <Link href="/search">
              <button style={{
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
              }}
              >
                <Search size={18} />
                Search Lost & Found Pets
              </button>
            </Link>
            <Link href="/faq">
              <button style={{
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
              }}
              >
                <AlertCircle size={18} />
                FAQ & Tips
              </button>
            </Link>
            <Link href="/shelters">
              <button style={{
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
              }}
              >
                <Search size={18} />
                Contact Local Shelters
              </button>
            </Link>
          </div>
        </div>

        {/* Important Notice */}
        <div style={{
          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
          border: "2px solid #3b82f6",
          borderRadius: "16px",
          padding: "30px",
          display: "flex",
          alignItems: "start",
          gap: "20px"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <AlertCircle size={24} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af", marginBottom: "12px" }}>
              ⚡ Act Quickly
            </h3>
            <p style={{ color: "#1e3a8a", fontSize: "16px", lineHeight: "1.6", margin: 0 }}>
              Time is critical when a pet is lost. The sooner you report, the better the chances of a safe reunion.
              Our AI starts searching immediately after you submit your report.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
