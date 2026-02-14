"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddPetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    pet_name: "",
    pet_type: "dog",
    breed: "",
    color: "",
    size: "medium",
    photo_url: "",
    location_city: "",
    location_state: "",
    age: "",
    gender: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Get shelter_id from localStorage
    const shelterId = typeof window !== 'undefined' ? localStorage.getItem('shelter_id') : null;
    
    if (!shelterId) {
      setError("Please login as shelter first");
      setLoading(false);
      return;
    }

    // Resize image if URL is provided
    let photoUrl = formData.photo_url;
    if (photoUrl && !photoUrl.startsWith('data:')) {
      try {
        const resizeResponse = await fetch("/api/petreunion/resize-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: photoUrl, maxWidth: 800, maxHeight: 800, quality: 0.85, format: 'jpeg' })
        });
        if (resizeResponse.ok) {
          const resizeData = await resizeResponse.json();
          if (resizeData.success && resizeData.dataUrl) {
            photoUrl = resizeData.dataUrl;
          }
        }
      } catch (error) {
        console.warn('Failed to resize image, using original:', error);
      }
    }

    try {
      const response = await fetch("/api/petreunion/shelter/add-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          photo_url: photoUrl,
          shelter_id: shelterId,
          status: "found" // Available at shelter
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/petreunion/shelter/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Failed to add pet");
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
      background: "#f5f5f5",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          padding: "30px", 
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
            ➕ Add Pet to Database
          </h1>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Add a pet manually (like it was scraped from AdoptAPet)
          </p>
        </div>

        {success ? (
          <div style={{ 
            background: "white", 
            borderRadius: "12px", 
            padding: "60px", 
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
            <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>
              Pet Added Successfully!
            </h2>
            <p style={{ color: "#666", fontSize: "16px" }}>
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <div style={{ 
            background: "white", 
            borderRadius: "12px", 
            padding: "40px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <form onSubmit={handleSubmit}>
              {/* Pet Name */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Pet Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pet_name}
                  onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })}
                  placeholder="Buddy"
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
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Pet Type *
                </label>
                <select
                  required
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
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>

              {/* Breed */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Breed *
                </label>
                <input
                  type="text"
                  required
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="Golden Retriever, Mixed, etc."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Color *
                </label>
                <input
                  type="text"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Brown, Black, White, etc."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
              </div>

              {/* Size */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Size *
                </label>
                <select
                  required
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
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Photo URL */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Photo URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://example.com/pet-photo.jpg"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
                <p style={{ color: "#666", fontSize: "14px", marginTop: "5px" }}>
                  💡 Upload image to imgur.com or similar, then paste URL here
                </p>
              </div>

              {/* Location */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
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
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                    State *
                  </label>
                  <input
                    type="text"
                    required
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

              {/* Age */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Age
                </label>
                <input
                  type="text"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="5 yrs, 1 yr 7 mos, etc."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
              </div>

              {/* Gender */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
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
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Available for adoption. Friendly, good with kids..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "16px",
                    resize: "vertical"
                  }}
                />
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

              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: "1",
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
                  {loading ? "Adding Pet..." : "✅ Add Pet"}
                </button>
                <Link
                  href="/petreunion/shelter/dashboard"
                  style={{
                    padding: "16px 24px",
                    background: "#6b7280",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "18px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}













