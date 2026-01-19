"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    contactType: "general"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactOptions = [
    {
      type: "general",
      title: "General Inquiries",
      description: "Questions about PetReunion services",
      icon: "💬"
    },
    {
      type: "missing",
      title: "Report Missing Pet",
      description: "Immediate assistance for lost pets",
      icon: "🚨"
    },
    {
      type: "found",
      title: "Report Found Pet",
      description: "Help reunite found pets with families",
      icon: "🐾"
    },
    {
      type: "volunteer",
      title: "Volunteer Support",
      description: "Questions about volunteering",
      icon: "🤝"
    },
    {
      type: "partnership",
      title: "Partnership Opportunities",
      description: "Collaborate with PetReunion",
      icon: "🤝"
    },
    {
      type: "media",
      title: "Media Inquiries",
      description: "Press and media requests",
      icon: "📰"
    }
  ];

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
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Message Sent Successfully!</h2>
        <p style={{ marginBottom: "24px" }}>
          Thank you for contacting PetReunion. Our team will respond within 24 hours.
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
            <li>You'll receive an email confirmation within 1 hour</li>
            <li>Our team will review your message</li>
            <li>You'll get a personalized response within 24 hours</li>
            <li>For urgent matters, call our 24/7 hotline</li>
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
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>📧 Contact PetReunion</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          We're here to help 24/7. Reach out for support, report missing pets, or join our mission.
        </p>
      </div>

      {/* Emergency Contact */}
      <div style={{
        background: "rgba(255, 107, 107, 0.2)",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "40px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>🚨 Emergency Hotline</h3>
        <p style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
          1-800-PET-HELP
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Available 24/7 for immediate assistance with missing pets
        </p>
      </div>

      {/* Contact Options */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>How Can We Help?</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px"
        }}>
          {contactOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => setFormData({...formData, contactType: option.type})}
              style={{
                background: formData.contactType === option.type
                  ? "rgba(255, 217, 61, 0.3)"
                  : "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "12px",
                border: formData.contactType === option.type
                  ? "2px solid #FFD93D"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{option.icon}</div>
              <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>{option.title}</h4>
              <p style={{ fontSize: "12px", opacity: 0.8 }}>{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        marginBottom: "40px"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Send Us a Message</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
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
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
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

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Subject *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              placeholder="How can we help you?"
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

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              placeholder="Please provide details about your inquiry..."
              rows={6}
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
              {isSubmitting ? "Sending..." : "📧 Send Message"}
            </button>
          </div>
        </form>
      </div>

      {/* Other Contact Methods */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📧</div>
          <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Email Support</h4>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
            Non-urgent inquiries
          </p>
          <a href="mailto:help@petreunion.org" style={{
            color: "#FFD93D",
            textDecoration: "none",
            fontSize: "14px"
          }}>
            help@petreunion.org
          </a>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🐦</div>
          <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Social Media</h4>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
            Quick questions and updates
          </p>
          <a href="https://twitter.com/petreunion" target="_blank" style={{
            color: "#FFD93D",
            textDecoration: "none",
            fontSize: "14px"
          }}>
            @petreunion
          </a>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📍</div>
          <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Office Location</h4>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
            Main headquarters
          </p>
          <p style={{ fontSize: "12px", opacity: 0.8 }}>
            123 Pet Rescue Lane<br />
            Animal City, AC 12345
          </p>
        </div>
      </div>

      {/* Response Times */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "20px",
        borderRadius: "12px"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", textAlign: "center" }}>Response Times</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px"
        }}>
          <div>
            <h4 style={{ marginBottom: "4px" }}>🚨 Emergency Hotline</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Immediate response</p>
          </div>
          <div>
            <h4 style={{ marginBottom: "4px" }}>📧 Email Support</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Within 24 hours</p>
          </div>
          <div>
            <h4 style={{ marginBottom: "4px" }}>🐦 Social Media</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Within 4-6 hours</p>
          </div>
          <div>
            <h4 style={{ marginBottom: "4px" }}>🤝 Volunteer Inquiries</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Within 48 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
