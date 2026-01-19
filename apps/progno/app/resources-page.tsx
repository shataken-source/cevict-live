"use client";

import { useState } from "react";

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState("guides");

  const resourceCategories = {
    guides: {
      title: "Pet Care Guides",
      icon: "📚",
      resources: [
        {
          title: "Lost Pet Prevention Guide",
          description: "Comprehensive guide to preventing pets from getting lost",
          type: "PDF Guide",
          size: "2.4 MB",
          download: true
        },
        {
          title: "Emergency Response Checklist",
          description: "Step-by-step actions to take when your pet goes missing",
          type: "Checklist",
          size: "1.1 MB",
          download: true
        },
        {
          title: "Pet Identification Guide",
          description: "Microchips, tags, and other identification methods",
          type: "Guide",
          size: "1.8 MB",
          download: true
        },
        {
          title: "Search Techniques Manual",
          description: "Professional search strategies for finding lost pets",
          type: "Manual",
          size: "3.2 MB",
          download: true
        },
        {
          title: "Pet First Aid Basics",
          description: "Essential first aid knowledge for pet emergencies",
          type: "Guide",
          size: "2.1 MB",
          download: true
        },
        {
          title: "Community Network Building",
          description: "How to build local pet recovery networks",
          type: "Guide",
          size: "1.6 MB",
          download: true
        }
      ]
    },
    templates: {
      title: "Templates & Forms",
      icon: "📋",
      resources: [
        {
          title: "Lost Pet Flyer Template",
          description: "Customizable flyer for missing pet alerts",
          type: "Template",
          size: "845 KB",
          download: true
        },
        {
          title: "Pet Information Card",
          description: "Emergency contact and information card",
          type: "Template",
          size: "523 KB",
          download: true
        },
        {
          title: "Search Log Template",
          description: "Track search efforts and leads",
          type: "Template",
          size: "678 KB",
          download: true
        },
        {
          title: "Volunteer Sign-up Form",
          description: "Form for recruiting local volunteers",
          type: "Template",
          size: "712 KB",
          download: true
        },
        {
          title: "Shelter Contact Sheet",
          description: "Organized contact information for local shelters",
          type: "Template",
          size: "445 KB",
          download: true
        }
      ]
    },
    training: {
      title: "Training Videos",
      icon: "🎥",
      resources: [
        {
          title: "Basic Pet Search Techniques",
          description: "Learn effective search patterns and strategies",
          type: "Video",
          duration: "12:34",
          download: false
        },
        {
          title: "Reading Pet Body Language",
          description: "Understand scared pet behavior",
          type: "Video",
          duration: "8:45",
          download: false
        },
        {
          title: "Safe Pet Handling",
          description: "How to safely approach and handle frightened pets",
          type: "Video",
          duration: "15:20",
          download: false
        },
        {
          title: "Social Media for Pet Recovery",
          description: "Using social media effectively for lost pets",
          type: "Video",
          duration: "10:15",
          download: false
        },
        {
          title: "Building Community Networks",
          description: "Creating local pet recovery networks",
          type: "Video",
          duration: "18:30",
          download: false
        }
      ]
    },
    tools: {
      title: "Tools & Apps",
      icon: "🛠️",
      resources: [
        {
          title: "PetReunion Mobile App",
          description: "Official app for reporting and tracking lost pets",
          type: "Mobile App",
          platform: "iOS & Android",
          download: false
        },
        {
          title: "Lost Pet Alert Generator",
          description: "Create and distribute missing pet alerts",
          type: "Web Tool",
          platform: "Web",
          download: false
        },
        {
          title: "Search Area Mapper",
          description: "Map and plan search areas effectively",
          type: "Web Tool",
          platform: "Web",
          download: false
        },
        {
          title: "Volunteer Coordinator",
          description: "Organize and coordinate volunteer search efforts",
          type: "Web Tool",
          platform: "Web",
          download: false
        },
        {
          title: "Pet Recovery Tracker",
          description: "Track recovery statistics and success rates",
          type: "Web Tool",
          platform: "Web",
          download: false
        }
      ]
    }
  };

  const handleDownload = (resource: any) => {
    // Simulate download
    console.log(`Downloading ${resource.title}`);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>📚 Pet Care Resources</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Free guides, templates, training videos, and tools to help prevent and recover lost pets.
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
        {Object.entries(resourceCategories).map(([key, category]) => (
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

      {/* Resources Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        {resourceCategories[activeCategory as keyof typeof resourceCategories].resources.map((resource, index) => (
          <div
            key={index}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "4px", flex: 1 }}>
                {resource.title}
              </h3>
              <span style={{
                background: "rgba(255, 217, 61, 0.2)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                marginLeft: "8px"
              }}>
                {resource.type}
              </span>
            </div>

            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px", lineHeight: "1.4" }}>
              {resource.description}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", opacity: 0.7 }}>
              <span>
                {resource.size && `📁 ${resource.size}`}
                {resource.duration && `⏱️ ${resource.duration}`}
                {resource.platform && `💻 ${resource.platform}`}
              </span>

              <button
                onClick={() => handleDownload(resource)}
                style={{
                  padding: "6px 12px",
                  background: resource.download ? "rgba(78, 205, 196, 0.3)" : "rgba(255, 107, 107, 0.3)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                {resource.download ? "📥 Download" : "🔗 Open"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Featured Resources */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        marginBottom: "40px"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>🌟 Featured Resources</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📖</div>
            <h4 style={{ marginBottom: "8px" }}>Complete Pet Safety Guide</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Everything you need to know about keeping your pets safe
            </p>
            <button style={{
              padding: "8px 16px",
              background: "rgba(255, 217, 61, 0.3)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px"
            }}>
              Download Free
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</div>
            <h4 style={{ marginBottom: "8px" }}>Search Success Kit</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Professional tools and templates for pet recovery
            </p>
            <button style={{
              padding: "8px 16px",
              background: "rgba(78, 205, 196, 0.3)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px"
            }}>
              Get Started
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📱</div>
            <h4 style={{ marginBottom: "8px" }}>Mobile App</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Instant alerts and tracking on your phone
            </p>
            <button style={{
              padding: "8px 16px",
              background: "rgba(255, 107, 107, 0.3)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px"
            }}>
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px" }}>📊 Resource Impact</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>50,000+</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Downloads Monthly
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>98%</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              User Satisfaction
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>200+</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Free Resources
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>24/7</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Resource Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
