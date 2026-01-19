"use client";

import { useState } from "react";

export default function VolunteerPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    experience: "",
    availability: "",
    interests: [] as string[],
    transportation: "",
    specialSkills: "",
    emergencyContact: "",
    emergencyPhone: "",
    whyVolunteer: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const volunteerInterests = [
    "Search & Rescue",
    "Social Media Monitoring",
    "Community Outreach",
    "Transportation",
    "Foster Care",
    "Administrative Support",
    "Photography/Videography",
    "Event Planning",
    "Fundraising",
    "Technical Support"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>🎉</div>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Welcome to the PetReunion Team!</h2>
        <p style={{ marginBottom: "24px" }}>
          Thank you for joining our volunteer network. Your commitment will help reunite countless lost pets with their families.
        </p>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "24px",
          textAlign: "left",
          maxWidth: "500px",
          margin: "0 auto 24px"
        }}>
          <h3 style={{ marginBottom: "12px" }}>What happens next:</h3>
          <ul>
            <li>You'll receive a welcome email within 24 hours</li>
            <li>Our volunteer coordinator will contact you within 48 hours</li>
            <li>You'll get access to our volunteer training materials</li>
            <li>You'll be added to our local volunteer network</li>
            <li>You'll start receiving alerts for missing pets in your area</li>
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
          Sign Up Another Volunteer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>🤝 Join Our Volunteer Network</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Become part of the nationwide community helping reunite lost pets with their families.
        </p>
      </div>

      {/* Volunteer Impact */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        <div style={{
          background: "rgba(255, 107, 107, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>12,000+</div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Active Volunteers</p>
        </div>
        <div style={{
          background: "rgba(78, 205, 196, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>2,847</div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Pets Reunited</p>
        </div>
        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>50+</div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Cities Covered</p>
        </div>
      </div>

      {/* Volunteer Form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <h3 style={{ fontSize: "20px", marginBottom: "20px" }}>Personal Information</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
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
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>ZIP Code *</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
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
          </div>

          <h3 style={{ fontSize: "20px", marginBottom: "20px", marginTop: "30px" }}>Volunteer Information</h3>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Experience with Animals</label>
            <select
              name="experience"
              value={formData.experience}
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
              <option value="">Select experience level</option>
              <option value="none">No experience</option>
              <option value="pet-owner">Pet owner</option>
              <option value="volunteer">Previous volunteer work</option>
              <option value="professional">Professional (vet, groomer, trainer)</option>
              <option value="expert">Expert/Animal specialist</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Availability</label>
            <select
              name="availability"
              value={formData.availability}
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
              <option value="">Select availability</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
              <option value="flexible">Flexible</option>
              <option value="emergency">Emergency only</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "12px", fontWeight: "bold" }}>Areas of Interest</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px"
            }}>
              {volunteerInterests.map((interest) => (
                <label key={interest} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  background: formData.interests.includes(interest) ? "rgba(255, 217, 61, 0.3)" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    style={{ marginRight: "8px" }}
                  />
                  {interest}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Do you have reliable transportation?</label>
            <select
              name="transportation"
              value={formData.transportation}
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
              <option value="">Select option</option>
              <option value="yes">Yes, I have reliable transportation</option>
              <option value="limited">Limited transportation</option>
              <option value="no">No, I use public transport</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Special Skills or Training</label>
            <textarea
              name="specialSkills"
              value={formData.specialSkills}
              onChange={handleInputChange}
              placeholder="e.g., First aid certification, animal behavior training, photography skills, etc."
              rows={3}
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

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Why do you want to volunteer with PetReunion?</label>
            <textarea
              name="whyVolunteer"
              value={formData.whyVolunteer}
              onChange={handleInputChange}
              placeholder="Tell us what motivates you to help reunite lost pets..."
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

          <div style={{ textAlign: "center", marginTop: "30px" }}>
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
              {isSubmitting ? "Submitting..." : "🤝 Join Volunteer Network"}
            </button>
          </div>
        </div>
      </form>

      {/* Volunteer Benefits */}
      <div style={{
        marginTop: "40px",
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Volunteer Benefits</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🎓 Training & Development</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Free training in animal handling, search techniques, and emergency response
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🏆 Recognition</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Volunteer appreciation events and awards for outstanding service
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🤝 Community</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Join a network of passionate animal lovers making a real difference
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>📱 Resources</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Access to volunteer app, equipment, and 24/7 support hotline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
