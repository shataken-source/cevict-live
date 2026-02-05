"use client";

export default function AboutPage() {
  const teamMembers = [
    {
      name: "Sarah Mitchell",
      role: "Founder & Executive Director",
      bio: "Former veterinary technician with 15+ years in animal rescue. Founded PetReunion after reuniting over 200 lost pets personally.",
      photo: "👩‍⚕️"
    },
    {
      name: "Dr. Michael Chen",
      role: "Chief Veterinary Officer",
      bio: "DVM with specialization in emergency medicine. Leads our medical response team and provides expert guidance on pet safety.",
      photo: "👨‍⚕️"
    },
    {
      name: "Jennifer Rodriguez",
      role: "Volunteer Coordinator",
      bio: "Community organizer with 10+ years in nonprofit management. Manages our network of 12,000+ volunteers nationwide.",
      photo: "👩‍💼"
    },
    {
      name: "David Thompson",
      role: "Technology Director",
      bio: "Software engineer focused on creating innovative solutions for pet recovery. Leads our app development and social media integration.",
      photo: "👨‍💻"
    },
    {
      name: "Lisa Park",
      role: "Community Outreach Manager",
      bio: "Social worker and animal welfare advocate. Builds partnerships with shelters, vets, and community organizations.",
      photo: "👩‍🏫"
    },
    {
      name: "Robert Johnson",
      role: "Operations Manager",
      bio: "Former logistics coordinator with expertise in emergency response. Ensures our 24/7 hotline runs smoothly.",
      photo: "👨‍🔧"
    }
  ];

  const milestones = [
    {
      year: "2020",
      title: "PetReunion Founded",
      description: "Started as a small Facebook group helping local pet owners"
    },
    {
      year: "2021",
      title: "First Major Success",
      description: "Reunited 100+ pets and gained national attention"
    },
    {
      year: "2022",
      title: "Volunteer Network Expanded",
      description: "Grew to 5,000 volunteers across 20 states"
    },
    {
      year: "2023",
      title: "Technology Integration",
      description: "Launched mobile app and automated alert system"
    },
    {
      year: "2024",
      title: "National Recognition",
      description: "Reached 2,847 reunions and 12,000+ volunteers"
    }
  ];

  const partners = [
    {
      name: "ASPCA",
      type: "Animal Welfare Partner",
      logo: "🐾"
    },
    {
      name: "Humane Society",
      type: "Shelter Network",
      logo: "🏥"
    },
    {
      name: "PetSmart Charities",
      type: "Funding Partner",
      logo: "💰"
    },
    {
      name: "Veterinary Medical Association",
      type: "Medical Partner",
      logo: "⚕️"
    },
    {
      name: "Local Animal Shelters",
      type: "Network Partner",
      logo: "🏠"
    },
    {
      name: "Pet Food Companies",
      type: "Supply Partner",
      logo: "🍖"
    }
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>ℹ️ About PetReunion</h2>
        <p style={{ fontSize: "16px", opacity: 0.9, maxWidth: "600px", margin: "0 auto" }}>
          We're a nationwide network of volunteers, shelters, and pet lovers dedicated to reuniting lost pets with their families.
        </p>
      </div>

      {/* Mission Statement */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        marginBottom: "40px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "24px", marginBottom: "16px" }}>🎯 Our Mission</h3>
        <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "20px" }}>
          To reunite every lost pet with their loving family through community collaboration,
          innovative technology, and unwavering dedication to animal welfare.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginTop: "30px"
        }}>
          <div>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🤝</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Community First</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Powered by volunteers and local communities
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔬</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Innovation</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Using technology to speed up reunions
            </p>
          </div>
          <div>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>❤️</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Compassion</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Every pet deserves to come home
            </p>
          </div>
        </div>
      </div>

      {/* Impact Statistics */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Our Impact</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px"
        }}>
          <div style={{
            background: "rgba(255, 107, 107, 0.2)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>2,847</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Pets Reunited</p>
          </div>
          <div style={{
            background: "rgba(78, 205, 196, 0.2)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>12,000+</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Volunteers</p>
          </div>
          <div style={{
            background: "rgba(255, 217, 61, 0.2)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>50+</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Cities</p>
          </div>
          <div style={{
            background: "rgba(255, 255, 255, 0.2)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>94%</div>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>Success Rate</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Our Journey</h3>
        <div style={{
          display: "grid",
          gap: "16px"
        }}>
          {milestones.map((milestone, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "16px",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <div style={{
                fontSize: "24px",
                fontWeight: "bold",
                minWidth: "80px",
                textAlign: "center"
              }}>
                {milestone.year}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>{milestone.title}</h4>
                <p style={{ fontSize: "14px", opacity: 0.8 }}>{milestone.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Meet Our Team</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px"
        }}>
          {teamMembers.map((member, index) => (
            <div
              key={index}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center"
              }}
            >
              <div style={{
                fontSize: "48px",
                marginBottom: "12px"
              }}>
                {member.photo}
              </div>
              <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>{member.name}</h4>
              <p style={{
                fontSize: "14px",
                color: "#FFD93D",
                marginBottom: "12px"
              }}>
                {member.role}
              </p>
              <p style={{ fontSize: "13px", opacity: 0.8, lineHeight: "1.5" }}>
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Partners */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Our Partners</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px"
        }}>
          {partners.map((partner, index) => (
            <div
              key={index}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{partner.logo}</div>
              <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>{partner.name}</h4>
              <p style={{ fontSize: "12px", opacity: 0.7 }}>{partner.type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Our Values</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🏠 Every Pet Deserves a Home</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              We believe no pet should be left lost or alone.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🤝 Community Power</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Together, we can achieve what's impossible alone.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>⚡ Rapid Response</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Every minute counts when a pet is missing.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🔍 Never Give Up</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Hope and persistence lead to happy endings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
