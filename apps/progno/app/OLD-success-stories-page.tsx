"use client";

import { useState } from "react";

export default function SuccessStoriesPage() {
  const [selectedStory, setSelectedStory] = useState<number | null>(null);

  const successStories = [
    {
      id: 1,
      petName: "Buddy",
      petType: "Golden Retriever",
      age: "3 years",
      lostFor: "2 days",
      location: "Central Park, NYC",
      image: "🐕",
      story: "Buddy slipped his leash during a walk in Central Park and panicked, running deep into the woods. His owner Sarah was devastated and immediately posted on PetReunion. Within hours, our network of volunteers organized a search party. A volunteer spotted Buddy near a stream and was able to coax him with treats. The reunion was captured on video and went viral, helping spread awareness about PetReunion's work.",
      quote: "I thought I'd never see Buddy again. PetReunion brought my best friend home. I can't thank you enough!",
      reunitedBy: "Volunteer search team"
    },
    {
      id: 2,
      petName: "Luna",
      petType: "Siamese Cat",
      age: "2 years",
      lostFor: "5 days",
      location: "Portland, Oregon",
      image: "🐈",
      story: "Luna escaped through an open window and was missing for five days during a cold snap. Her family was worried sick. PetReunion posted alerts across social media and contacted local shelters. On the fifth day, a neighbor who saw the alert found Luna hiding in their garage, cold but safe. The family was overjoyed and now keeps all windows secured.",
      quote: "The social media alert reached our neighbor who found Luna. Your network is incredible!",
      reunitedBy: "Community alert system"
    },
    {
      id: 3,
      petName: "Max",
      petType: "German Shepherd",
      age: "5 years",
      lostFor: "12 hours",
      location: "Chicago, Illinois",
      image: "🐕‍🦺",
      story: "Max bolted during a thunderstorm, his fear overwhelming his training. His owner Mike called PetReunion's 24/7 hotline immediately. Our team coordinated with local animal control and shared Max's details with over 50 area shelters. Max was found safe at a nearby vet clinic where someone had brought him after seeing him running near a busy road.",
      quote: "The hotline response was immediate. You guys are lifesavers!",
      reunitedBy: "24/7 hotline coordination"
    },
    {
      id: 4,
      petName: "Whiskers",
      petType: "Tabby Cat",
      age: "1 year",
      lostFor: "3 days",
      location: "Austin, Texas",
      image: "🐱",
      story: "Whiskers was an indoor cat who accidentally got out when movers left a door open. His family was new to the area and didn't know where to start. PetReunion helped them create search flyers, post alerts, and connect with local cat rescue groups. Whiskers was found hiding under a neighbor's porch, scared but unharmed.",
      quote: "As new residents, we were lost. PetReunion guided us through everything.",
      reunitedBy: "Community volunteer network"
    },
    {
      id: 5,
      petName: "Rocky",
      petType: "Bulldog",
      age: "4 years",
      lostFor: "6 hours",
      location: "Miami, Florida",
      image: "🐶",
      story: "Rocky dug under the backyard fence and went exploring. His owner Jennifer posted on PetReunion while organizing a neighborhood search. Within hours, a PetReunion volunteer spotted Rocky at a local dog park, happily playing with other dogs. He was returned home safely, tired from his adventure.",
      quote: "The volunteer network found Rocky before I even finished making flyers!",
      reunitedBy: "Volunteer patrol"
    },
    {
      id: 6,
      petName: "Mittens",
      petType: "Calico Cat",
      age: "7 years",
      lostFor: "1 day",
      location: "Seattle, Washington",
      image: "🐈‍⬛",
      story: "Mittens was a senior cat who never went outside. When she accidentally got out, her elderly owner was distraught. PetReunion volunteers helped search the neighborhood and posted alerts. Mittens was found the next day, hiding in a neighbor's shed, hungry but otherwise fine. The reunion brought tears to everyone's eyes.",
      quote: "At her age, I was so worried. Thank you for bringing my Mittens home.",
      reunitedBy: "Neighborhood search team"
    }
  ];

  const stats = {
    totalReunions: 2847,
    averageTime: "2.3 days",
    successRate: "94%",
    volunteers: 12000
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>❤️ Success Stories</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Heartwarming reunions made possible by our community of volunteers and supporters.
        </p>
      </div>

      {/* Statistics */}
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
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {stats.totalReunions.toLocaleString()}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>
            Pets Reunited
          </p>
        </div>
        <div style={{
          background: "rgba(78, 205, 196, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {stats.averageTime}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>
            Average Recovery Time
          </p>
        </div>
        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {stats.successRate}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>
            Success Rate
          </p>
        </div>
        <div style={{
          background: "rgba(255, 255, 255, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {stats.volunteers.toLocaleString()}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>
            Active Volunteers
          </p>
        </div>
      </div>

      {/* Success Stories Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        {successStories.map((story) => (
          <div
            key={story.id}
            onClick={() => setSelectedStory(story.id)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginRight: "12px" }}>{story.image}</div>
              <div>
                <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>{story.petName}</h3>
                <p style={{ fontSize: "14px", opacity: 0.8 }}>
                  {story.petType} • {story.age}
                </p>
              </div>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              opacity: 0.7,
              marginBottom: "12px"
            }}>
              <span>📍 {story.location}</span>
              <span>⏱️ Lost for {story.lostFor}</span>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.5", marginBottom: "12px" }}>
              {story.story.substring(0, 100)}...
            </p>
            <div style={{
              background: "rgba(255, 217, 61, 0.2)",
              padding: "8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontStyle: "italic"
            }}>
              "{story.quote}"
            </div>
            <div style={{
              textAlign: "right",
              fontSize: "12px",
              opacity: 0.7,
              marginTop: "8px"
            }}>
              Reunited by: {story.reunitedBy}
            </div>
          </div>
        ))}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          zIndex: 1000
        }}>
          <div style={{
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            padding: "30px",
            borderRadius: "16px",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            {(() => {
              const story = successStories.find(s => s.id === selectedStory);
              if (!story) return null;
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ fontSize: "40px", marginRight: "16px" }}>{story.image}</div>
                      <div>
                        <h2 style={{ fontSize: "24px", marginBottom: "4px" }}>{story.petName}</h2>
                        <p style={{ opacity: 0.9 }}>
                          {story.petType} • {story.age}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStory(null)}
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        border: "none",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        color: "#fff",
                        fontSize: "18px"
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "20px",
                    fontSize: "14px"
                  }}>
                    <span>📍 {story.location}</span>
                    <span>⏱️ Lost for {story.lostFor}</span>
                    <span>✅ Reunited by {story.reunitedBy}</span>
                  </div>

                  <div style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "20px"
                  }}>
                    <h3 style={{ marginBottom: "12px" }}>Story</h3>
                    <p style={{ lineHeight: "1.6" }}>{story.story}</p>
                  </div>

                  <div style={{
                    background: "rgba(255, 217, 61, 0.2)",
                    padding: "16px",
                    borderRadius: "8px",
                    fontStyle: "italic",
                    marginBottom: "20px"
                  }}>
                    "{story.quote}"
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => setSelectedStory(null)}
                      style={{
                        padding: "12px 24px",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      Close Story
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "24px", marginBottom: "16px" }}>Share Your Success Story</h3>
        <p style={{ marginBottom: "20px", opacity: 0.9 }}>
          Has PetReunion helped reunite you with your pet? We'd love to hear your story and share it to inspire others.
        </p>
        <button style={{
          padding: "12px 24px",
          background: "linear-gradient(135deg, #FFD93D, #FF6B6B)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold"
        }}>
          Share Your Story
        </button>
      </div>
    </div>
  );
}
