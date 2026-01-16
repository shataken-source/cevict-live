"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Trash2, Shield, Clock } from "lucide-react";

interface VideoClip {
  id: string;
  file: File;
  uploadTime: Date;
  deleteTime: Date;
  matchConfidence?: number;
  status: "uploading" | "processing" | "analyzed" | "deleted";
}

export default function NeighborhoodWatch() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [optIn, setOptIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock pet profile (would come from lost pet report)
  const mockPetProfile = {
    color: "brown",
    size: "medium",
    breed: "Labrador",
    name: "Buddy",
  };

  // Mock AI detection function
  const detect_pet_in_video = async (file: File): Promise<number> => {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock confidence calculation based on pet profile
    // In production, this would use actual AI/ML model
    const baseConfidence = Math.random() * 30 + 10; // 10-40% base
    const colorMatch = file.name.toLowerCase().includes(mockPetProfile.color.toLowerCase()) ? 20 : 0;
    const sizeMatch = Math.random() > 0.7 ? 15 : 0;
    const breedMatch = Math.random() > 0.8 ? 25 : 0;

    const confidence = Math.min(100, baseConfidence + colorMatch + sizeMatch + breedMatch);
    return Math.round(confidence);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        alert("Please upload video files only");
        continue;
      }

      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert("File too large. Maximum 100MB.");
        continue;
      }

      const now = new Date();
      const deleteTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const newClip: VideoClip = {
        id: `clip-${Date.now()}-${Math.random()}`,
        file,
        uploadTime: now,
        deleteTime,
        status: "uploading",
      };

      setClips((prev) => [...prev, newClip]);

      // Simulate upload and processing
      setTimeout(async () => {
        setClips((prev) =>
          prev.map((c) => (c.id === newClip.id ? { ...c, status: "processing" } : c))
        );

        const confidence = await detect_pet_in_video(file);

        setClips((prev) =>
          prev.map((c) =>
            c.id === newClip.id
              ? { ...c, status: "analyzed", matchConfidence: confidence }
              : c
          )
        );
      }, 500);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Auto-delete clips after 24 hours
  useState(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClips((prev) =>
        prev.filter((clip) => {
          if (clip.deleteTime <= now && clip.status !== "deleted") {
            return false; // Delete this clip
          }
          return true;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div style={{
        background: "#000000",
        color: "#FFD700",
        padding: "20px",
        marginBottom: "30px",
        textAlign: "center",
        border: "3px solid #FFD700"
      }}>
        <h1 style={{
          fontSize: "36px",
          fontFamily: "Impact, Arial Black, sans-serif",
          marginBottom: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em"
        }}>
          🎥 NEIGHBORHOOD WATCH
        </h1>
        <p style={{ fontSize: "16px", color: "#ffffff" }}>
          Camera Scrubber - Help Find Missing Pets
        </p>
      </div>

      {/* Opt-In Section */}
      <div style={{
        background: "#fff3cd",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "30px",
        border: "2px solid #000000"
      }}>
        <h2 style={{
          fontSize: "20px",
          fontFamily: "Impact, Arial Black, sans-serif",
          marginBottom: "15px",
          textTransform: "uppercase"
        }}>
          <Shield style={{ display: "inline", marginRight: "10px" }} />
          Opt-In Your Doorbell Camera
        </h2>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            style={{ width: "20px", height: "20px" }}
          />
          <span style={{ fontSize: "14px" }}>
            I want to help find missing pets by sharing my doorbell camera footage
          </span>
        </label>
        {optIn && (
          <p style={{
            fontSize: "12px",
            color: "#666",
            marginTop: "10px",
            padding: "10px",
            background: "#ffffff",
            borderRadius: "4px"
          }}>
            ✅ Privacy Protected: All clips are automatically deleted within 24 hours. 
            Only you can see your uploaded clips. AI analysis is anonymous.
          </p>
        )}
      </div>

      {/* Upload Interface */}
      {optIn && (
        <div style={{
          background: "#ffffff",
          padding: "30px",
          borderRadius: "8px",
          border: "2px solid #000000",
          marginBottom: "30px",
          textAlign: "center"
        }}>
          <h2 style={{
            fontSize: "24px",
            fontFamily: "Impact, Arial Black, sans-serif",
            marginBottom: "20px",
            textTransform: "uppercase"
          }}>
            <Upload style={{ display: "inline", marginRight: "10px" }} />
            Upload 30-Second Clip
          </h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
            Upload a short video clip from your security camera. 
            AI will analyze it for potential pet matches.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            multiple
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "#FFD700",
              color: "#000000",
              border: "3px solid #000000",
              padding: "15px 30px",
              fontSize: "16px",
              fontFamily: "Impact, Arial Black, sans-serif",
              fontWeight: "bold",
              cursor: "pointer",
              textTransform: "uppercase",
              borderRadius: "4px"
            }}
          >
            <Camera style={{ display: "inline", marginRight: "10px" }} />
            Choose Video File
          </button>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>
            Max file size: 100MB | Formats: MP4, MOV, AVI
          </p>
        </div>
      )}

      {/* Current Pet Profile */}
      <div style={{
        background: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "30px",
        border: "1px solid #ddd"
      }}>
        <h3 style={{
          fontSize: "18px",
          fontFamily: "Impact, Arial Black, sans-serif",
          marginBottom: "15px",
          textTransform: "uppercase"
        }}>
          🐾 Searching For: {mockPetProfile.name}
        </h3>
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <div><strong>Color:</strong> {mockPetProfile.color}</div>
          <div><strong>Size:</strong> {mockPetProfile.size}</div>
          <div><strong>Breed:</strong> {mockPetProfile.breed}</div>
        </div>
      </div>

      {/* Uploaded Clips */}
      {clips.length > 0 && (
        <div>
          <h2 style={{
            fontSize: "24px",
            fontFamily: "Impact, Arial Black, sans-serif",
            marginBottom: "20px",
            textTransform: "uppercase"
          }}>
            Your Uploaded Clips
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px"
          }}>
            {clips.map((clip) => (
              <div
                key={clip.id}
                style={{
                  border: "2px solid #000000",
                  borderRadius: "8px",
                  padding: "15px",
                  background: "#ffffff"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px"
                }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                    {clip.file.name}
                  </div>
                  <button
                    onClick={() => handleDelete(clip.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#cc0000"
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                  <div>Uploaded: {clip.uploadTime.toLocaleTimeString()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
                    <Clock size={12} />
                    Auto-delete: {clip.deleteTime.toLocaleTimeString()}
                  </div>
                </div>

                {clip.status === "uploading" && (
                  <div style={{ color: "#666", fontSize: "12px" }}>⏳ Uploading...</div>
                )}
                {clip.status === "processing" && (
                  <div style={{ color: "#FFD700", fontSize: "12px" }}>🤖 AI Analyzing...</div>
                )}
                {clip.status === "analyzed" && clip.matchConfidence !== undefined && (
                  <div>
                    <div style={{
                      fontSize: "20px",
                      fontFamily: "Impact, Arial Black, sans-serif",
                      fontWeight: "bold",
                      color: clip.matchConfidence > 50 ? "#00FF00" : clip.matchConfidence > 30 ? "#FFD700" : "#cc0000",
                      marginTop: "10px"
                    }}>
                      Match Confidence: {clip.matchConfidence}%
                    </div>
                    {clip.matchConfidence > 50 && (
                      <div style={{
                        background: "#00FF00",
                        color: "#000000",
                        padding: "10px",
                        borderRadius: "4px",
                        marginTop: "10px",
                        fontWeight: "bold",
                        textAlign: "center"
                      }}>
                        🎯 HIGH MATCH - Contact Pet Owner!
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div style={{
        marginTop: "40px",
        padding: "20px",
        background: "#fff3cd",
        borderRadius: "8px",
        border: "2px solid #cc0000"
      }}>
        <h3 style={{
          fontSize: "18px",
          fontFamily: "Impact, Arial Black, sans-serif",
          marginBottom: "10px",
          textTransform: "uppercase"
        }}>
          🔒 Privacy & Security
        </h3>
        <ul style={{ fontSize: "12px", lineHeight: "1.8", color: "#000000" }}>
          <li>✅ All clips automatically deleted within 24 hours</li>
          <li>✅ Only you can view your uploaded clips</li>
          <li>✅ AI analysis is anonymous - no personal data stored</li>
          <li>✅ No sharing with third parties</li>
          <li>✅ You can delete clips manually at any time</li>
        </ul>
      </div>
    </div>
  );
}

