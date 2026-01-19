"use client";

import { useState } from "react";

export default function PetSafetyPage() {
  const [activeCategory, setActiveCategory] = useState("prevention");

  const safetyCategories = {
    prevention: {
      title: "Prevention Tips",
      icon: "🛡️",
      tips: [
        {
          title: "Proper Identification",
          description: "Ensure your pet has a collar with ID tags and consider microchipping.",
          details: "ID tags should include your name, phone number, and address. Microchips provide permanent identification that can't fall off."
        },
        {
          title: "Secure Your Home",
          description: "Check fences, gates, and windows for potential escape routes.",
          details: "Regularly inspect your property for gaps in fences, loose gates, or screens that pets could push through."
        },
        {
          title: "Supervision",
          description: "Never leave pets unattended in yards or public areas.",
          details: "Even well-trained pets can wander off when distracted by wildlife, other animals, or interesting smells."
        },
        {
          title: "Training",
          description: "Teach reliable recall commands and boundary training.",
          details: "Commands like 'come' and 'stay' can be lifesavers. Practice regularly with positive reinforcement."
        }
      ]
    },
    emergency: {
      title: "Emergency Actions",
      icon: "🚨",
      tips: [
        {
          title: "Act Immediately",
          description: "Start searching right away - don't wait.",
          details: "The first few hours are critical. Most pets are found within 3 miles of home."
        },
        {
          title: "Contact PetReunion",
          description: "Call our 24/7 hotline: 1-800-PET-HELP",
          details: "Our volunteers will help coordinate search efforts and post alerts to our network."
        },
        {
          title: "Alert Local Shelters",
          description: "Contact all local animal shelters and vets.",
          details: "Visit in person if possible, and provide photos and detailed descriptions."
        },
        {
          title: "Social Media Alert",
          description: "Post on social media and neighborhood groups.",
          details: "Include clear photos, last seen location, and contact information."
        }
      ]
    },
    recovery: {
      title: "Recovery Strategies",
      icon: "🔍",
      tips: [
        {
          title: "Systematic Search",
          description: "Search in expanding circles from last known location.",
          details: "Start close to home and gradually expand your search area. Pets often hide in quiet, sheltered spots."
        },
        {
          title: "Use Scent Items",
          description: "Leave items with familiar scents outside.",
          details: "Blankets, clothing, or toys can help guide your pet back home."
        },
        {
          title: "Night Searches",
          description: "Search during quiet hours when pets are more active.",
          details: "Many lost pets are more active at dawn and dusk. Bring a flashlight and make noise."
        },
        {
          title: "Community Network",
          description: "Organize neighborhood search teams.",
          details: "Divide areas among volunteers and maintain communication with check-ins."
        }
      ]
    },
    seasonal: {
      title: "Seasonal Safety",
      icon: "🌤️",
      tips: [
        {
          title: "Summer Heat",
          description: "Never leave pets in cars and provide plenty of water.",
          details: "Heatstroke can occur in minutes. Watch for excessive panting, drooling, or lethargy."
        },
        {
          title: "Winter Cold",
          description: "Provide shelter and limit time outdoors.",
          details: "Frostbite and hypothermia are serious risks. Check paws for ice buildup."
        },
        {
          title: "Holiday Hazards",
          description: "Keep pets away from decorations and toxic foods.",
          details: "Chocolate, xylitol, poinsettias, and tinsel can be dangerous to pets."
        },
        {
          title: "Storm Safety",
          description: "Create a safe space and keep pets indoors during storms.",
          details: "Many pets escape during fireworks or thunderstorms due to fear."
        }
      ]
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>🛡️ Pet Safety Resources</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Prevention, emergency response, and recovery strategies to keep your pets safe.
        </p>
      </div>

      {/* Category Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        marginBottom: "30px",
        flexWrap: "wrap"
      }}>
        {Object.entries(safetyCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              padding: "12px 20px",
              background: activeCategory === key
                ? "linear-gradient(135deg, #FFD93D, #FF6B6B)"
                : "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: activeCategory === key ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "all 0.2s ease"
            }}
          >
            {category.icon} {category.title}
          </button>
        ))}
      </div>

      {/* Safety Tips */}
      <div style={{
        display: "grid",
        gap: "20px",
        marginBottom: "40px"
      }}>
        {safetyCategories[activeCategory as keyof typeof safetyCategories].tips.map((tip, index) => (
          <div
            key={index}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
          >
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>
              {tip.title}
            </h3>
            <p style={{ marginBottom: "12px", opacity: 0.9 }}>
              {tip.description}
            </p>
            <p style={{ fontSize: "14px", opacity: 0.8, fontStyle: "italic" }}>
              {tip.details}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        <div style={{
          background: "rgba(255, 107, 107, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚨</div>
          <h3 style={{ marginBottom: "8px" }}>Emergency Hotline</h3>
          <p style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
            1-800-PET-HELP
          </p>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>
            24/7 assistance for lost pets
          </p>
        </div>

        <div style={{
          background: "rgba(78, 205, 196, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📱</div>
          <h3 style={{ marginBottom: "8px" }}>Mobile App</h3>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>
            Get instant alerts
          </p>
          <button style={{
            padding: "8px 16px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px"
          }}>
            Download Coming Soon
          </button>
        </div>

        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
          <h3 style={{ marginBottom: "8px" }}>Safety Guide</h3>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>
            Complete prevention guide
          </p>
          <button style={{
            padding: "8px 16px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px"
          }}>
            Download PDF
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>📊 Pet Safety Statistics</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>93%</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              of lost pets with ID tags are returned home
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>67%</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              of lost pets are found within 24 hours
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>80%</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              increase in recovery with community alerts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
