"use client";

import { useState } from "react";

export default function SocialMediaPage() {
  const [twitterStats, setTwitterStats] = useState({
    followers: 5234,
    following: 2847,
    tweets: 1234,
    engagement: "8.7%"
  });

  const [recentTweets, setRecentTweets] = useState([
    {
      id: 1,
      text: "🚨 URGENT: Buddy - Golden Retriever missing near Central Park. Last seen 2 hours ago wearing red collar. Please SHARE! Contact: (555) 123-4567 #MissingPet #PetReunion",
      time: "2 hours ago",
      likes: 45,
      retweets: 12,
      engagement: "high"
    },
    {
      id: 2,
      text: "❤️ Success story! Luna the cat was found safe after 3 days thanks to our amazing community! Never give up hope! 🐾 #PetReunion #SuccessStory",
      time: "5 hours ago",
      likes: 234,
      retweets: 56,
      engagement: "high"
    },
    {
      id: 3,
      text: "🛡️ Pet safety tip: Always keep current photos of your pets. They're crucial for missing pet alerts! Share your pet photos with #PetReunionPets",
      time: "1 day ago",
      likes: 89,
      retweets: 23,
      engagement: "medium"
    },
    {
      id: 4,
      text: "🤝 Thank you to our 12,000+ volunteers! Together we've reunited 2,847 pets with their families this year! #Volunteer #Community",
      time: "2 days ago",
      likes: 567,
      retweets: 89,
      engagement: "high"
    }
  ]);

  const [newTweet, setNewTweet] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handleTweet = async () => {
    if (!newTweet.trim()) return;

    setIsPosting(true);

    // Simulate posting to Twitter
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newTweetObj = {
      id: recentTweets.length + 1,
      text: newTweet,
      time: "Just now",
      likes: 0,
      retweets: 0,
      engagement: "new"
    };

    setRecentTweets([newTweetObj, ...recentTweets]);
    setNewTweet("");
    setIsPosting(false);

    // Update stats
    setTwitterStats(prev => ({
      ...prev,
      tweets: prev.tweets + 1
    }));
  };

  const socialPlatforms = [
    {
      name: "Twitter",
      handle: "@petreunion",
      followers: "5,234",
      link: "https://twitter.com/petreunion",
      icon: "🐦",
      color: "#1DA1F2",
      description: "Real-time alerts and community updates"
    },
    {
      name: "Facebook",
      handle: "PetReunion Official",
      followers: "12,456",
      link: "https://facebook.com/petreunion",
      icon: "📘",
      color: "#4267B2",
      description: "Community groups and detailed posts"
    },
    {
      name: "Instagram",
      handle: "@petreunion",
      followers: "8,901",
      link: "https://instagram.com/petreunion",
      icon: "📷",
      color: "#E4405F",
      description: "Success stories and pet photos"
    },
    {
      name: "YouTube",
      handle: "PetReunion Channel",
      followers: "3,456",
      link: "https://youtube.com/petreunion",
      icon: "📺",
      color: "#FF0000",
      description: "Training videos and rescue stories"
    }
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>📱 Social Media Hub</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Follow us on social media for real-time alerts, success stories, and pet safety tips.
        </p>
      </div>

      {/* Social Media Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "40px"
      }}>
        <div style={{
          background: "rgba(29, 161, 242, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {twitterStats.followers.toLocaleString()}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Twitter Followers</p>
        </div>
        <div style={{
          background: "rgba(66, 103, 178, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            30,047
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Total Social Reach</p>
        </div>
        <div style={{
          background: "rgba(228, 64, 95, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {twitterStats.engagement}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Engagement Rate</p>
        </div>
        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            24/7
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Alert Monitoring</p>
        </div>
      </div>

      {/* Social Platforms */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>Connect With Us</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          {socialPlatforms.map((platform) => (
            <div
              key={platform.name}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{platform.icon}</div>
              <h4 style={{ fontSize: "18px", marginBottom: "8px" }}>{platform.name}</h4>
              <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>
                {platform.handle}
              </p>
              <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px" }}>
                {platform.followers} followers
              </p>
              <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "16px" }}>
                {platform.description}
              </p>
              <a
                href={platform.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: platform.color,
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                Follow
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Twitter Feed */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>
          🐦 Recent Twitter Activity
        </h3>

        {/* Tweet Composer */}
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px"
            }}>
              🐾
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={newTweet}
                onChange={(e) => setNewTweet(e.target.value)}
                placeholder="What's happening? Share a missing pet alert or success story..."
                maxLength={280}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  resize: "vertical",
                  fontSize: "14px"
                }}
              />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px"
              }}>
                <span style={{ fontSize: "12px", opacity: 0.7 }}>
                  {newTweet.length}/280 characters
                </span>
                <button
                  onClick={handleTweet}
                  disabled={isPosting || !newTweet.trim()}
                  style={{
                    padding: "8px 16px",
                    background: isPosting || !newTweet.trim()
                      ? "rgba(255, 255, 255, 0.2)"
                      : "#1DA1F2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "20px",
                    cursor: isPosting || !newTweet.trim() ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  {isPosting ? "Posting..." : "Tweet"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tweets */}
        <div style={{ display: "grid", gap: "16px" }}>
          {recentTweets.map((tweet) => (
            <div
              key={tweet.id}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0
                }}>
                  🐾
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", marginRight: "8px" }}>PetReunion</span>
                      <span style={{ opacity: 0.7, fontSize: "12px" }}>@petreunion · {tweet.time}</span>
                    </div>
                  </div>
                  <p style={{ marginBottom: "12px", lineHeight: "1.5" }}>
                    {tweet.text}
                  </p>
                  <div style={{ display: "flex", gap: "20px", fontSize: "12px", opacity: 0.7 }}>
                    <span>💬 {tweet.likes} likes</span>
                    <span>🔄 {tweet.retweets} retweets</span>
                    <span>📊 {tweet.engagement} engagement</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Media Tips */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px" }}>💡 Social Media Tips</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <h4 style={{ marginBottom: "8px" }}>📸 Share Clear Photos</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              High-quality photos increase visibility by 80%
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>📍 Include Location</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Specific locations help local volunteers respond
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>🔄 Share & Retweet</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Amplify alerts to reach more people
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: "8px" }}>⏰ Post Updates</h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              Keep the community informed of progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
