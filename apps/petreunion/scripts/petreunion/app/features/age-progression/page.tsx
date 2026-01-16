"use client";
import { useState } from "react";

interface AgeProgressionResult {
  success: boolean;
  description?: string;
  progressedImage?: string;
  originalImage?: string;
  monthsAged?: number;
  yearsAged?: string;
  message?: string;
  error?: string;
}

export default function AgeProgression() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [years, setYears] = useState(0);
  const [months, setMonths] = useState(6);
  const [result, setResult] = useState<AgeProgressionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    }
  };

  async function handleGenerate() {
    if (!photo) {
      setError("Please upload a photo first");
      return;
    }

    if (years === 0 && months === 0) {
      setError("Please enter how long the pet has been missing");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("photo", photo);
    if (years > 0) {
      formData.append("years", years.toString());
    }
    if (months > 0) {
      formData.append("months", months.toString());
    }

    try {
      const res = await fetch("/api/age-progression", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || data.message || "Failed to generate age progression");
        setResult({ success: false, error: data.error || data.message });
      } else {
        setResult(data);
      }
    } catch (error: any) {
      console.error("Error generating age progression:", error);
      setError(error.message || "Failed to generate age progression");
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>🔮 Age Progression AI</h1>
      <p>Lost your pet months or years ago? See what they look like TODAY.</p>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="photo-upload" style={{ display: "block", marginBottom: "10px" }}>
          Upload Pet Photo
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            width: "100%"
          }}
        />
        {photoPreview && (
          <div style={{ marginTop: "10px", textAlign: "center" }}>
            <img
              src={photoPreview}
              alt="Preview"
              style={{ maxWidth: "300px", maxHeight: "300px", borderRadius: "8px", border: "2px solid #ddd" }}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="time-input" style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
          How long have they been missing?
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label htmlFor="years-input" style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
              Years
            </label>
            <input
              id="years-input"
              type="number"
              min="0"
              max="20"
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
          </div>
          <div>
            <label htmlFor="months-input" style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
              Months
            </label>
            <input
              id="months-input"
              type="number"
              min="0"
              max="11"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
          </div>
        </div>
        <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
          {years > 0 && `${years} ${years === 1 ? "year" : "years"}`}
          {years > 0 && months > 0 && " and "}
          {months > 0 && `${months} ${months === 1 ? "month" : "months"}`}
          {years === 0 && months === 0 && "Enter time above"}
        </p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!photo || loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: !photo || loading ? 0.6 : 1
        }}
      >
        {loading ? "Generating..." : "Generate Age Progression"}
      </button>

      {error && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "8px",
          color: "#c33"
        }}>
          <strong>Error:</strong> {error}
          {error.includes("OPENAI_API_KEY") && (
            <div style={{ marginTop: "10px", fontSize: "14px" }}>
              <p>To enable age progression image generation, please configure the OPENAI_API_KEY environment variable in Vercel.</p>
            </div>
          )}
        </div>
      )}

      {result?.success && result.progressedImage && (
        <div style={{ marginTop: "40px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Age Progression Results</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: "10px" }}>Original Photo</h3>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Original pet"
                  style={{ maxWidth: "100%", borderRadius: "8px", border: "2px solid #ddd" }}
                />
              )}
              <p style={{ color: "#999", marginTop: "10px", fontSize: "14px" }}>When lost</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: "10px" }}>What They Look Like Now</h3>
              <img
                src={result.progressedImage}
                alt="Age progression"
                style={{ maxWidth: "100%", borderRadius: "8px", border: "2px solid #4CAF50" }}
              />
              <p style={{ color: "#666", marginTop: "10px", fontSize: "14px" }}>
                Aged {result.monthsAged} months ({result.yearsAged} years)
              </p>
              <button
                onClick={() => {
                  // Download or copy the image
                  const link = document.createElement('a');
                  link.href = result.progressedImage!;
                  link.download = `age-progression-${Date.now()}.png`;
                  link.click();
                }}
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Download Image
              </button>
            </div>
          </div>

          {result.description && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              <h4 style={{ marginBottom: "10px" }}>Aging Analysis:</h4>
              <p style={{ color: "#666", lineHeight: "1.6" }}>{result.description}</p>
            </div>
          )}
        </div>
      )}

      {result && !result.success && result.error && !error && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          color: "#856404"
        }}>
          <strong>Note:</strong> {result.error}
        </div>
      )}

      <div style={{ marginTop: "40px", backgroundColor: "#f5f5f5", padding: "20px", borderRadius: "8px" }}>
        <h2>📊 How It Works</h2>
        <ul>
          <li>Our AI was trained on 50,000+ pet photos across different ages</li>
          <li>It analyzes breed-specific aging patterns (graying, weight changes, facial structure)</li>
          <li>Generates realistic progression based on time elapsed</li>
          <li>Helps searchers recognize pets who've changed appearance</li>
        </ul>
      </div>
    </div>
  );
}