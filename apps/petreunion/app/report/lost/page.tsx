"use client";
import { Bell, Calendar, Camera, CheckCircle, Heart, Mail, MapPin, Phone, Search, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import SocialPostButton from "@/components/SocialPostButton";
import ShareButton from "@/components/ShareButton";

interface FormData {
  petName: string;
  species: string;
  breed: string;
  color: string;
  lastSeen: string;
  location: string;
  phone: string;
  email: string;
}

export default function ReportLost() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    petName: "",
    species: "",
    breed: "",
    color: "",
    lastSeen: "",
    location: "",
    phone: "",
    email: ""
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPetId, setCreatedPetId] = useState<string | null>(null);
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

    if (!form.petName || !form.species || !form.lastSeen || !form.location || !form.phone || !form.email) {
      const missing = [];
      if (!form.petName) missing.push('Pet Name');
      if (!form.species) missing.push('Species');
      if (!form.lastSeen) missing.push('Last Seen Date');
      if (!form.location) missing.push('Location');
      if (!form.phone) missing.push('Phone');
      if (!form.email) missing.push('Email');
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      (Object.keys(form) as Array<keyof FormData>).forEach(key => {
        formData.append(key, form[key]);
      });
      if (photo) formData.append("photo", photo);

      const response = await fetch("/api/report-lost", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        let errorMessage = "Failed to submit report";
        try {
          const data = await response.json();
          errorMessage = data.error || data.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success || response.ok) {
        const newId = data?.pet?.id || data?.petId || null;
        if (newId && typeof newId === "string") setCreatedPetId(newId);
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
            <div style={{ fontSize: "80px", marginBottom: "30px" }}>🔍</div>
            <CheckCircle size={64} style={{ margin: "0 auto 30px", color: "#4ade80" }} />
            <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "20px", lineHeight: "1.2" }}>
              We're Searching for {form.petName}!
            </h1>
            <p style={{ fontSize: "20px", marginBottom: "40px", opacity: 0.95, lineHeight: "1.6" }}>
              Your lost pet alert has been created. Our AI is now scanning found pet reports, shelters, and social media 24/7 to find {form.petName}.
            </p>

            {/* Share Now */}
            {createdPetId ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "16px",
                  padding: "24px",
                  marginBottom: "30px",
                  textAlign: "left",
                }}
              >
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "14px" }}>
                  📣 Share {form.petName} right now (fastest results)
                </h3>
                <p style={{ marginTop: 0, marginBottom: "16px", opacity: 0.95, fontSize: "15px", lineHeight: "1.5" }}>
                  Posting to neighborhood groups is the single highest-leverage action. We’ll generate a share-ready post that links back to your listing.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href={`/pets/${createdPetId}`}
                    style={{
                      background: "white",
                      color: "#667eea",
                      padding: "12px 18px",
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: "bold",
                      textDecoration: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    View listing
                  </Link>
                  <SocialPostButton petId={createdPetId} />
                  <ShareButton
                    petId={createdPetId}
                    petName={form.petName || "My Pet"}
                    petType={form.species || "pet"}
                    location={form.location || ""}
                    photoUrl={photoPreview}
                  />
                </div>
              </div>
            ) : null}

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
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>AI Search Activated</div>
                    <div style={{ opacity: 0.9, fontSize: "15px" }}>Our AI is scanning found pet reports, shelters, and social media in your area</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>📧</div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Instant Email Alerts</div>
                    <div style={{ opacity: 0.9, fontSize: "15px" }}>You'll receive email notifications when potential matches are found</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>📱</div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Stay Connected</div>
                    <div style={{ opacity: 0.9, fontSize: "15px" }}>Check your email regularly for updates and match notifications</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/my-pets"
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
                View My Reports
              </Link>
              <Link
                href="/search"
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
                <Search size={20} />
                Search Found Pets
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
            Report a Lost Pet
          </h1>
          <p style={{ fontSize: "20px", opacity: 0.95, lineHeight: "1.6", maxWidth: "700px", margin: "0 auto" }}>
            Don't panic! We're here to help. Fill out the details below and our AI will start searching immediately.
            The more details you provide, the better we can help bring your pet home.
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
              A clear photo is the best way to help our AI find your pet. Don't worry if it's not perfect - any photo helps!
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
              About Your Pet
            </h2>
            <p style={{ color: "#666", marginBottom: "24px", fontSize: "15px" }}>
              Tell us about your lost pet. Every detail helps our AI search more effectively.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  Pet Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Max, Luna, Buddy"
                  value={form.petName}
                  onChange={(e) => setForm({ ...form, petName: e.target.value })}
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
                    Breed (best guess)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Golden Retriever, Siamese, Mixed"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
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
                  Color & Markings
                </label>
                <input
                  type="text"
                  placeholder="e.g., Brown with white paws, Black tabby, Orange and white"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
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

          {/* Last Seen Section */}
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
                When & Where Last Seen
              </h2>
            </div>
            <p style={{ color: "#666", marginBottom: "24px", fontSize: "15px" }}>
              Accurate location and time information helps our AI search the right areas and match with found reports.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                    <Calendar size={16} />
                    Last Seen Date <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.lastSeen}
                    onChange={(e) => setForm({ ...form, lastSeen: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
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
                    Approximate Time (optional)
                  </label>
                  <input
                    type="time"
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
                  Last Seen Location <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Oak Street near the park, Birmingham, AL"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
                  💡 Be as specific as possible - this helps our AI search nearby areas and match with found reports
                </p>
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
              We'll use this to contact you immediately when we find a potential match. Your information is kept private and secure.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontWeight: "500", fontSize: "15px" }}>
                  <Phone size={16} />
                  Phone Number <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
                  📧 We'll send you instant email alerts when potential matches are found
                </p>
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
                Starting AI Search...
              </>
            ) : (
              <>
                <Search size={20} />
                Start AI Search for {form.petName || "Your Pet"}
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
