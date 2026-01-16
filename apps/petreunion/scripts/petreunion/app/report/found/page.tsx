"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, MapPin, Calendar, User, Mail, Phone, Heart, CheckCircle, ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";

interface FormData {
  found_pet_name: string;
  species: string;
  breed: string;
  color: string;
  size: string;
  age: string;
  distinctive_features: string;
  medical_needs: string;
  temperament: string;
  description: string;
  found_date: string;
  found_time: string;
  found_city: string;
  found_state: string;
  found_location: string;
  current_location: string;
  finder_name: string;
  finder_email: string;
  finder_phone: string;
}

export default function ReportFound() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    found_pet_name: "",
    species: "",
    breed: "",
    color: "",
    size: "",
    age: "",
    distinctive_features: "",
    medical_needs: "",
    temperament: "",
    description: "",
    found_date: "",
    found_time: "",
    found_city: "",
    found_state: "AL",
    found_location: "",
    current_location: "",
    finder_name: "",
    finder_email: "",
    finder_phone: ""
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setError(null);
    setPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!form.species || !form.breed || !form.color || !form.found_date || !form.found_city || !form.found_state || !form.found_location || !form.finder_name || !form.finder_email || !form.finder_phone) {
      const missing = [];
      if (!form.species) missing.push('Species');
      if (!form.breed) missing.push('Breed');
      if (!form.color) missing.push('Color');
      if (!form.found_date) missing.push('Found Date');
      if (!form.found_city) missing.push('City');
      if (!form.found_state) missing.push('State');
      if (!form.found_location) missing.push('Found Location');
      if (!form.finder_name) missing.push('Your Name');
      if (!form.finder_email) missing.push('Email');
      if (!form.finder_phone) missing.push('Phone');
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.finder_email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Use FormData for file uploads (matching lost pet form)
      const formData = new FormData();
      formData.append("found_pet_name", form.found_pet_name || "Unknown");
      formData.append("species", form.species);
      formData.append("pet_type", form.species === 'dog' ? 'dog' : form.species === 'cat' ? 'cat' : '');
      formData.append("breed", form.breed.trim());
      formData.append("color", form.color.trim());
      formData.append("size", form.size || "medium");
      if (form.age) formData.append("age", form.age.trim());
      if (form.distinctive_features) formData.append("distinctive_features", form.distinctive_features);
      if (form.description) formData.append("description", form.description);
      if (form.medical_needs) formData.append("medical_needs", form.medical_needs);
      if (form.temperament) formData.append("temperament", form.temperament);
      formData.append("found_date", form.found_date);
      formData.append("date_found", form.found_date);
      formData.append("location_city", form.found_city.trim());
      formData.append("location_state", form.found_state);
      formData.append("location_detail", form.found_location.trim());
      formData.append("finder_name", form.finder_name.trim());
      formData.append("finder_email", form.finder_email.trim());
      formData.append("finder_phone", form.finder_phone.trim());
      if (photo) formData.append("photo", photo);
      if (photoPreview && !photo) {
        // If we have preview but no file, send as base64
        formData.append("photo_url", photoPreview);
      }

      const response = await fetch("/api/petreunion/report-found-pet", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        let errorMessage = "Failed to submit report";
        try {
          const data = await response.json();
          errorMessage = data.error || data.message || errorMessage;
          if (data.required) {
            errorMessage += `. Missing: ${data.required.join(", ")}`;
          }
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success || response.ok) {
        setSubmitted(true);
      } else {
        throw new Error(data.error || "Failed to submit report");
      }
    } catch (e: any) {
      console.error("Submit error:", e);
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(e.message || "Failed to submit report. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ fontFamily: "system-ui", minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 20px", textAlign: "center", color: "white" }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            padding: "60px 40px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "80px", marginBottom: "30px" }}>🎉</div>
            <CheckCircle size={64} style={{ margin: "0 auto 30px", color: "#4ade80" }} />
            <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "20px", lineHeight: "1.2" }}>
              Thank You for Helping!
            </h1>
            <p style={{ fontSize: "20px", marginBottom: "40px", opacity: 0.95, lineHeight: "1.6" }}>
              Your found pet report has been submitted successfully. Our AI is now searching for potential matches,
              and we'll help reunite this pet with their family as soon as possible.
            </p>

            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "30px",
              marginBottom: "40px",
              textAlign: "left"
            }}>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Bell size={24} />
                What Happens Next?
              </h3>
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>🔍</div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>AI Matching Activated</div>
                    <div style={{ opacity: "0.9", fontSize: "15px" }}>Our AI is comparing this pet with lost pet reports in your area</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>📧</div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Instant Email Alerts</div>
                    <div style={{ opacity: "0.9", fontSize: "15px" }}>You'll receive email notifications when potential matches are found</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>❤️</div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Reuniting Families</div>
                    <div style={{ opacity: "0.9", fontSize: "15px" }}>We'll connect you with the pet's family if we find a match</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/search"
                style={{
                  background: "white",
                  color: "#667eea",
                  padding: "16px 32px",
                  borderRadius: "12px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "transform 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <Heart size={20} />
                Search for Matching Lost Pets
              </Link>
              <Link
                href="/"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "16px 32px",
                  borderRadius: "12px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  border: "2px solid white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <ArrowLeft size={20} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "60px 20px 40px",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "16px", lineHeight: "1.2" }}>
            Report a Found Pet
          </h1>
          <p style={{ fontSize: "20px", opacity: 0.95, lineHeight: "1.6", maxWidth: "700px", margin: "0 auto" }}>
            You found a pet? That's amazing! Help us reunite them with their family by sharing the details below.
            Every detail helps our AI find the perfect match.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section style={{ padding: "40px 20px", maxWidth: "900px", margin: "0 auto" }}>
      {error && (
        <div style={{
            background: "#fee2e2",
            border: "2px solid #fca5a5",
            color: "#991b1b",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px",
            fontSize: "16px",
            lineHeight: "1.5"
          }}>
            <strong>Please fix the following:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
          {/* Pet Photo Section */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <Camera size={24} color="#667eea" />
              <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", margin: 0 }}>
                Pet Photo
              </h2>
            </div>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "15px" }}>
              A clear photo helps our AI match this pet with lost pet reports. Any photo works!
            </p>

            {photoPreview ? (
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <img
                  src={photoPreview}
                  alt="Pet photo preview"
                  style={{
                    width: "100%",
                    maxHeight: "400px",
                    objectFit: "contain",
                    borderRadius: "12px",
                    border: "2px solid #e5e7eb"
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <label style={{
                display: "block",
                border: "2px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                background: "#f8fafc"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "#f0f4ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <Camera size={48} style={{ margin: "0 auto 16px", color: "#667eea" }} />
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#667eea", marginBottom: "8px" }}>
                  Click to upload a photo
                </div>
                <div style={{ fontSize: "14px", color: "#64748b" }}>
                  JPEG, PNG, or WebP (max 10MB)
                </div>
              </label>
            )}
          </div>

          {/* Basic Information */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", marginBottom: "24px" }}>
              Basic Information
            </h2>
            <p style={{ color: "#666", marginBottom: "24px", fontSize: "15px" }}>
              Tell us about the pet you found. Don't worry if you don't know everything - just share what you can!
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Pet Name (if known)
                </label>
        <input
          type="text"
                  placeholder="e.g., Max, Luna, or leave blank if unknown"
          value={form.found_pet_name}
          onChange={(e) => setForm({ ...form, found_pet_name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    Species <span style={{ color: "#dc2626" }}>*</span>
                  </label>
        <select
          value={form.species}
          onChange={(e) => setForm({ ...form, species: e.target.value })}
          required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      background: "white",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  >
                    <option value="">Select species...</option>
                    <option value="dog">🐕 Dog</option>
                    <option value="cat">🐱 Cat</option>
                    <option value="bird">🐦 Bird</option>
                    <option value="rabbit">🐰 Rabbit</option>
          <option value="other">Other</option>
        </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    Breed (best guess) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
        <input
          type="text"
                    placeholder="e.g., Golden Retriever, Siamese, Mixed"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    Color(s) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
          <input
            type="text"
                    placeholder="e.g., Brown and white, Black, Orange tabby"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    Size
                  </label>
          <select
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      background: "white",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  >
                    <option value="">Select size...</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="giant">Giant</option>
          </select>
                </div>
        </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Estimated Age
                </label>
        <input
          type="text"
                  placeholder="e.g., Puppy, Adult, Senior, or specific age"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Distinctive Features
                </label>
        <input
          type="text"
                  placeholder="e.g., Blue collar with no tags, white patch on chest, missing ear tip"
          value={form.distinctive_features}
          onChange={(e) => setForm({ ...form, distinctive_features: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Temperament
                </label>
        <select
          value={form.temperament}
          onChange={(e) => setForm({ ...form, temperament: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    background: "white",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <option value="">Select temperament...</option>
                  <option value="friendly">😊 Friendly</option>
                  <option value="scared">😰 Scared/Nervous</option>
                  <option value="aggressive">⚠️ Aggressive</option>
                  <option value="calm">😌 Calm</option>
                  <option value="playful">🎾 Playful</option>
        </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Medical Needs or Concerns
                </label>
                <input
                  type="text"
                  placeholder="e.g., Limping, needs medication, appears healthy"
                  value={form.medical_needs}
                  onChange={(e) => setForm({ ...form, medical_needs: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Additional Description
                </label>
        <textarea
                  placeholder="Any other details that might help identify this pet..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    resize: "vertical",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                    fontFamily: "inherit"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
          </div>

          {/* Location & Time Section */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <MapPin size={24} color="#667eea" />
              <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", margin: 0 }}>
                Where & When Found
              </h2>
            </div>
            <p style={{ color: "#666", marginBottom: "24px", fontSize: "15px" }}>
              Accurate location information helps us match with lost pet reports in the area.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    City <span style={{ color: "#dc2626" }}>*</span>
                  </label>
          <input
            type="text"
                    placeholder="e.g., Seattle, Los Angeles"
            value={form.found_city}
            onChange={(e) => setForm({ ...form, found_city: e.target.value })}
            required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    State <span style={{ color: "#dc2626" }}>*</span>
                  </label>
          <select
            value={form.found_state}
            onChange={(e) => setForm({ ...form, found_state: e.target.value })}
            required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      background: "white",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
          >
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
            <option value="DC">District of Columbia</option>
          </select>
                </div>
        </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Found Location <span style={{ color: "#dc2626" }}>*</span>
                </label>
        <input
          type="text"
                  placeholder="e.g., Oak Street near the park, 123 Main St, Near the library"
          value={form.found_location}
          onChange={(e) => setForm({ ...form, found_location: e.target.value })}
          required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    <Calendar size={16} />
                    Date Found <span style={{ color: "#dc2626" }}>*</span>
                  </label>
          <input
            type="date"
            value={form.found_date}
            onChange={(e) => setForm({ ...form, found_date: e.target.value })}
            required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    Time Found (optional)
                  </label>
          <input
            type="time"
            value={form.found_time}
            onChange={(e) => setForm({ ...form, found_time: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>
        </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Where is the pet now?
                </label>
        <input
          type="text"
                  placeholder="e.g., At my home, at the vet, at a local shelter"
          value={form.current_location}
          onChange={(e) => setForm({ ...form, current_location: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <User size={24} color="#667eea" />
              <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", margin: 0 }}>
                Your Contact Information
              </h2>
            </div>
            <p style={{ color: "#666", marginBottom: "24px", fontSize: "15px" }}>
              We'll use this to connect you with the pet's family if we find a match. Your information is kept private.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  <User size={16} />
                  Your Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
        <input
          type="text"
                  placeholder="Your full name"
          value={form.finder_name}
          onChange={(e) => setForm({ ...form, finder_name: e.target.value })}
          required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  <Mail size={16} />
                  Email Address <span style={{ color: "#dc2626" }}>*</span>
                </label>
        <input
          type="email"
                  placeholder="your.email@example.com"
          value={form.finder_email}
          onChange={(e) => setForm({ ...form, finder_email: e.target.value })}
          required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  <Phone size={16} />
                  Phone Number <span style={{ color: "#dc2626" }}>*</span>
                </label>
        <input
          type="tel"
                  placeholder="(555) 123-4567"
          value={form.finder_phone}
          onChange={(e) => setForm({ ...form, finder_phone: e.target.value })}
          required
            style={{
              width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                    transition: "border-color 0.2s",
              boxSizing: "border-box"
            }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
              padding: "18px",
              background: loading ? "#9ca3af" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
              borderRadius: "12px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(102, 126, 234, 0.4)",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {loading ? (
              <>
                <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Submitting...
              </>
            ) : (
              <>
                <Heart size={20} />
                Submit Found Pet Report
              </>
            )}
        </button>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
      </form>
      </section>
    </div>
  );
}
