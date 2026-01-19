"use client";

import { useState } from "react";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("forums");
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "general" });

  const communityStats = {
    members: "45,678",
    posts: "12,345",
    reunions: "2,847",
    activeNow: "234"
  };

  const forumPosts = [
    {
      id: 1,
      title: "Found: Friendly tabby cat near downtown",
      author: "Sarah M.",
      category: "Found Pets",
      replies: 23,
      views: 456,
      time: "2 hours ago",
      pinned: true
    },
    {
      id: 2,
      title: "Tips for searching during winter weather",
      author: "Mike R.",
      category: "Advice",
      replies: 15,
      views: 289,
      time: "5 hours ago",
      pinned: false
    },
    {
      id: 3,
      title: "Success! Buddy found after 3 days!",
      author: "Jennifer L.",
      category: "Success Stories",
      replies: 67,
      views: 1234,
      time: "1 day ago",
      pinned: false
    },
    {
      id: 4,
      title: "Organizing neighborhood search party",
      author: "David K.",
      category: "Community Action",
      replies: 8,
      views: 167,
      time: "1 day ago",
      pinned: false
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Pet Identification Clinic",
      date: "Dec 18, 2024",
      time: "10:00 AM - 2:00 PM",
      location: "Central Park Community Center",
      attendees: 45,
      description: "Free microchipping and ID tag registration"
    },
    {
      id: 2,
      title: "Search & Rescue Training",
      date: "Dec 20, 2024",
      time: "6:00 PM - 8:00 PM",
      location: "Online - Zoom",
      attendees: 128,
      description: "Learn effective search techniques from experts"
    },
    {
      id: 3,
      title: "Community Pet Fair",
      date: "Dec 22, 2024",
      time: "11:00 AM - 4:00 PM",
      location: "Riverside Park",
      attendees: 200,
      description: "Family-friendly event with pet safety demonstrations"
    }
  ];

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("New post:", newPost);
    setNewPost({ title: "", content: "", category: "general" });
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>👥 PetReunion Community</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Connect with fellow pet lovers, share experiences, and help reunite lost pets.
        </p>
      </div>

      {/* Community Stats */}
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
            {communityStats.members}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Community Members</p>
        </div>
        <div style={{
          background: "rgba(78, 205, 196, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {communityStats.posts}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Forum Posts</p>
        </div>
        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {communityStats.reunions}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Pets Reunited</p>
        </div>
        <div style={{
          background: "rgba(255, 255, 255, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {communityStats.activeNow}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Active Now</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        marginBottom: "30px",
        flexWrap: "wrap"
      }}>
        {["forums", "events", "groups", "map"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab
                ? "linear-gradient(135deg, #FFD93D, #FF6B6B)"
                : "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: activeTab === tab ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "all 0.2s ease"
            }}
          >
            {tab === "forums" && "💬 Forums"}
            {tab === "events" && "📅 Events"}
            {tab === "groups" && "👥 Groups"}
            {tab === "map" && "🗺️ Map"}
          </button>
        ))}
      </div>

      {/* Forums Tab */}
      {activeTab === "forums" && (
        <div>
          {/* New Post Form */}
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px"
          }}>
            <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Start a Discussion</h3>
            <form onSubmit={handlePostSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    marginBottom: "12px"
                  }}
                >
                  <option value="general">General Discussion</option>
                  <option value="lost">Lost Pets</option>
                  <option value="found">Found Pets</option>
                  <option value="advice">Advice & Tips</option>
                  <option value="success">Success Stories</option>
                </select>
                <input
                  type="text"
                  placeholder="Post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    marginBottom: "12px"
                  }}
                />
                <textarea
                  placeholder="Share your story, ask for help, or offer advice..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    resize: "vertical"
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #FFD93D, #FF6B6B)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                Post Discussion
              </button>
            </form>
          </div>

          {/* Forum Posts */}
          <div style={{ display: "grid", gap: "16px" }}>
            {forumPosts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.2)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      {post.pinned && <span style={{ color: "#FFD93D" }}>📌</span>}
                      <h3 style={{ fontSize: "16px", margin: 0 }}>{post.title}</h3>
                    </div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", opacity: 0.7 }}>
                      <span>by {post.author}</span>
                      <span>•</span>
                      <span>{post.category}</span>
                      <span>•</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", fontSize: "12px", opacity: 0.7 }}>
                  <span>💬 {post.replies} replies</span>
                  <span>👁️ {post.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div>
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "20px", marginBottom: "16px" }}>Upcoming Events</h3>
            <div style={{ display: "grid", gap: "20px" }}>
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.2)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>{event.title}</h3>
                      <p style={{ opacity: 0.8, marginBottom: "8px" }}>{event.description}</p>
                      <div style={{ display: "flex", gap: "16px", fontSize: "14px", opacity: 0.7 }}>
                        <span>📅 {event.date}</span>
                        <span>⏰ {event.time}</span>
                        <span>📍 {event.location}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "bold" }}>{event.attendees}</div>
                      <div style={{ fontSize: "12px", opacity: 0.8 }}>Attending</div>
                    </div>
                  </div>
                  <button style={{
                    padding: "8px 16px",
                    background: "rgba(78, 205, 196, 0.3)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}>
                    Register
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <div>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
            <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Local Pet Groups</h3>
            <p style={{ opacity: 0.8, marginBottom: "24px" }}>
              Connect with local pet owners and rescue groups in your area
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🐕</div>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>Dog Owners</h4>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>2,345 members</p>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🐈</div>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>Cat Lovers</h4>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>1,892 members</p>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🦜</div>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>Bird Owners</h4>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>567 members</p>
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🐰</div>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>Small Pets</h4>
                <p style={{ fontSize: "12px", opacity: 0.8 as any }}>892 members</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Tab */}
      {activeTab === "map" && (
        <div>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
            <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Lost & Found Map</h3>
            <p style={{ opacity: 0.8, marginBottom: "24px" }}>
              Interactive map showing recent lost and found pet sightings
            </p>
            <div style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "40px",
              borderRadius: "12px",
              border: "2px dashed rgba(255, 255, 255, 0.3)",
              minHeight: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "16px", marginBottom: "16px" }}>Interactive Map Coming Soon</p>
                <p style={{ fontSize: "14px", opacity: 0.8 }}>
                  Real-time tracking of lost and found pets in your area
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community Guidelines */}
      <div style={{
        marginTop: "40px",
        background: "rgba(255, 255, 255, 0.1)",
        padding: "20px",
        borderRadius: "12px"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Community Guidelines</h3>
        <ul style={{ fontSize: "14px", opacity: 0.8, paddingLeft: "20px" }}>
          <li>Be respectful and supportive of all community members</li>
          <li>Share accurate information and verify sources when possible</li>
          <li>Help others and offer constructive advice</li>
          <li>Report suspicious or harmful content to moderators</li>
          <li>Keep personal information private and secure</li>
        </ul>
      </div>
    </div>
  );
}
