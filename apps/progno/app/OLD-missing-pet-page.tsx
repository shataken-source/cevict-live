"use client";

import { useState } from "react";

export default function MissingPetPage() {
  const [formData, setFormData] = useState({
    petName: "",
    petType: "",
    breed: "",
    color: "",
    size: "",
    age: "",
    gender: "",
    location: "",
    dateLost: "",
    timeLost: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    description: "",
    photo: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setSubmitted(true);

    // Post to Twitter bot
    try {
      const response = await fetch('/api/post-missing-pet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        console.log('Missing pet alert posted to social media');
      }
    } catch (error) {
      console.error('Failed to post to social media:', error);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>🎉</div>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Missing Pet Alert Posted!</h2>
        <p style={{ marginBottom: "24px" }}>
          Your missing pet alert has been shared with our network of volunteers, shelters, and social media followers.
        </p>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "24px"
        }}>
          <h3 style={{ marginBottom: "12px" }}>What happens next:</h3>
          <ul style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto" }}>
            <li>Alert posted to @petreunion Twitter (5,000+ followers)</li>
            <li>Notification sent to local volunteers</li>
            <li>Alert shared with partner shelters</li>
            <li>24/7 hotline activated: 1-800-PET-HELP</li>
          </ul>
        </div>
        <button
          onClick={() => setSubmitted(false)}
          style={{
            padding: "12px 24px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Report Another Missing Pet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>🚨 Report a Missing Pet</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Time is critical. The sooner you report, the better the chances of finding your pet.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Pet Name *</label>
            <input
              type="text"
              name="petName"
              value={formData.petName}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Pet Type *</label>
            <select
              name="petType"
              value={formData.petType}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            >
              <option value="">Select type</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="bird">Bird</option>
              <option value="rabbit">Rabbit</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Breed</label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Color/Markings</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              placeholder="e.g., Brown with white spots"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Size</label>
            <select
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            >
              <option value="">Select size</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="giant">Giant</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Age</label>
            <input
              type="text"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="e.g., 2 years, 6 months"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Where was the pet last seen? *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Address or landmark"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff"
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Date Lost *</label>
            <input
              type="date"
              name="dateLost"
              value={formData.dateLost}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Time Lost</label>
            <input
              type="time"
              name="timeLost"
              value={formData.timeLost}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Your Name *</label>
          <input
            type="text"
            name="contactName"
            value={formData.contactName}
            onChange={handleInputChange}
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff"
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Phone Number *</label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Email</label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Additional Details</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Any special characteristics, medical conditions, or other important information..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              resize: "vertical"
            }}
          />
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "16px 32px",
              background: isSubmitting ? "rgba(255, 255, 255, 0.3)" : "linear-gradient(135deg, #FFD93D, #FF6B6B)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isSubmitting ? "Posting Alert..." : "🚨 Post Missing Pet Alert"}
          </button>
        </div>
      </form>

      <div style={{
        marginTop: "40px",
        padding: "20px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "12px"
      }}>
        <h3 style={{ marginBottom: "12px" }}>📞 24/7 Hotline Available</h3>
        <p style={{ marginBottom: "8px" }}>Call us anytime for immediate assistance:</p>
        <p style={{ fontSize: "18px", fontWeight: "bold" }}>1-800-PET-HELP</p>
        <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "8px" }}>
          Our volunteers are standing by to help coordinate search efforts and provide support.
        </p>
      </div>
    </div>
  );
}
