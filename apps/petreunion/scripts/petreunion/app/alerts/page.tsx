"use client";

import { useState } from "react";
import Link from "next/link";

export default function PetAlertsPage() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    pet_type: "",
    breed: "",
    location_city: "",
    location_state: "",
    size: "",
    age_range: "",
    gender: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/petreunion/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          email: "",
          name: "",
          pet_type: "",
          breed: "",
          location_city: "",
          location_state: "",
          size: "",
          age_range: "",
          gender: ""
        });
      } else {
        setError(data.error || "Failed to create alert");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px", color: "white" }}>
          <h1 style={{ 
            fontSize: "48px", 
            fontWeight: "bold", 
            marginBottom: "10px",
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
          }}>
            🔔 New Pet Alerts
          </h1>
          <p style={{ fontSize: "20px", opacity: 0.9 }}>
            Get notified when new pets matching your criteria are added
          </p>
        </div>

        {/* Form Card */}
        <div style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "40px", 
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
        }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
              <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>
                Alert Created!
              </h2>
              <p style={{ color: "#666", fontSize: "16px", marginBottom: "30px" }}>
                We'll email you when new pets matching your criteria are added.
              </p>
              <button
                onClick={() => setSuccess(false)}
                style={{
                  padding: "12px 24px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Create Another Alert
              </button>
            </div>
          ) : (
            <>
              <p style={{ 
                color: "#666", 
                fontSize: "16px", 
                marginBottom: "30px",
                textAlign: "center"
              }}>
                You tell us your criteria. We email you newly added pets that match it. Easy as that.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Email (Required) */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px"
                    }}
                  />
                </div>

                {/* Name (Optional) */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px"
                    }}
                  />
                </div>

                {/* Pet Type */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Pet Type
                  </label>
                  <select
                    value={formData.pet_type}
                    onChange={(e) => setFormData({ ...formData, pet_type: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      background: "white"
                    }}
                  >
                    <option value="">Any Type</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>

                {/* Breed */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Breed (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g., Golden Retriever, Persian, Mixed"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px"
                    }}
                  />
                </div>

                {/* Location */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "bold",
                      color: "#333"
                    }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.location_city}
                      onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                      placeholder="Boaz"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "16px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "bold",
                      color: "#333"
                    }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.location_state}
                      onChange={(e) => setFormData({ ...formData, location_state: e.target.value.toUpperCase() })}
                      placeholder="AL"
                      maxLength={2}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "16px"
                      }}
                    />
                  </div>
                </div>

                {/* Size */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      background: "white"
                    }}
                  >
                    <option value="">Any Size</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                {/* Age Range */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Age Range
                  </label>
                  <select
                    value={formData.age_range}
                    onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      background: "white"
                    }}
                  >
                    <option value="">Any Age</option>
                    <option value="puppy">Puppy/Kitten</option>
                    <option value="young">Young (1-3 years)</option>
                    <option value="adult">Adult (4-7 years)</option>
                    <option value="senior">Senior (8+ years)</option>
                  </select>
                </div>

                {/* Gender */}
                <div style={{ marginBottom: "30px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "bold",
                    color: "#333"
                  }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      background: "white"
                    }}
                  >
                    <option value="">Any Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {error && (
                  <div style={{
                    padding: "12px 16px",
                    background: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: "8px",
                    marginBottom: "20px"
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: loading ? "#9ca3af" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Creating Alert..." : "Create Alert"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "30px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {error && error.includes('table not set up') && (
            <Link 
              href="/petreunion/admin/setup"
              style={{
                color: "white",
                textDecoration: "underline",
                fontSize: "16px",
                background: "rgba(255,255,255,0.2)",
                padding: "10px 20px",
                borderRadius: "8px",
                display: "inline-block"
              }}
            >
              🔧 Setup Database (Fix This Error)
            </Link>
          )}
          <Link 
            href="/petreunion"
            style={{
              color: "white",
              textDecoration: "underline",
              fontSize: "16px"
            }}
          >
            ← Back to PetReunion
          </Link>
        </div>
      </div>
    </div>
  );
}













