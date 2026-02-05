"use client";

import { useState } from "react";

export default function DonatePage() {
  const [donationAmount, setDonationAmount] = useState("");
  const [donationType, setDonationType] = useState("one-time");
  const [isProcessing, setIsProcessing] = useState(false);
  const [donated, setDonated] = useState(false);

  const donationOptions = [
    { amount: 25, impact: "Provides 5 missing pet flyers" },
    { amount: 50, impact: "Fuels volunteer transportation for 1 week" },
    { amount: 100, impact: "Microchips 10 pets in need" },
    { amount: 250, impact: "Equips a search team with supplies" },
    { amount: 500, impact: "Sponsors a community pet ID clinic" },
    { amount: 1000, impact: "Funds our 24/7 hotline for 1 month" }
  ];

  const impactStats = {
    totalRaised: "$456,789",
    donors: "12,345",
    petsHelped: "2,847",
    rating: "4.9/5"
  };

  const handleDonate = async (amount: number) => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsProcessing(false);
    setDonated(true);
  };

  const handleCustomDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationAmount) return;

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsProcessing(false);
    setDonated(true);
  };

  if (donated) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>💝</div>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Thank You for Your Donation!</h2>
        <p style={{ marginBottom: "24px" }}>
          Your generosity will help reunite more lost pets with their loving families.
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
          <h3 style={{ marginBottom: "12px" }}>Your Impact:</h3>
          <ul>
            <li>You'll receive a tax receipt via email</li>
            <li>Your name will appear on our donor wall</li>
            <li>You'll get monthly impact reports</li>
            <li>You're helping us reach our goal of 5,000 reunions this year</li>
          </ul>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => setDonated(false)}
            style={{
              padding: "12px 24px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Make Another Donation
          </button>
          <button style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #FFD93D, #FF6B6B)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}>
            Share on Social Media
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>💝 Support PetReunion</h2>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>
          Your donation helps reunite lost pets with their families and keeps our services free for everyone.
        </p>
      </div>

      {/* Impact Statistics */}
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
            {impactStats.totalRaised}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Raised This Year</p>
        </div>
        <div style={{
          background: "rgba(78, 205, 196, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {impactStats.donors}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Donors</p>
        </div>
        <div style={{
          background: "rgba(255, 217, 61, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {impactStats.petsHelped}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Pets Helped</p>
        </div>
        <div style={{
          background: "rgba(255, 255, 255, 0.2)",
          padding: "20px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
            {impactStats.rating}
          </div>
          <p style={{ fontSize: "14px", opacity: 0.8 }}>Donor Rating</p>
        </div>
      </div>

      {/* Donation Type Selection */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "30px"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", textAlign: "center" }}>Choose Donation Type</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          <button
            onClick={() => setDonationType("one-time")}
            style={{
              padding: "12px 24px",
              background: donationType === "one-time"
                ? "linear-gradient(135deg, #FFD93D, #FF6B6B)"
                : "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            One-Time Donation
          </button>
          <button
            onClick={() => setDonationType("monthly")}
            style={{
              padding: "12px 24px",
              background: donationType === "monthly"
                ? "linear-gradient(135deg, #FFD93D, #FF6B6B)"
                : "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Monthly Giving
          </button>
        </div>
      </div>

      {/* Preset Donation Amounts */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", textAlign: "center" }}>
          Select an Amount {donationType === "monthly" && "(per month)"}
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px"
        }}>
          {donationOptions.map((option) => (
            <button
              key={option.amount}
              onClick={() => handleDonate(option.amount)}
              disabled={isProcessing}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                cursor: isProcessing ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
                ${option.amount}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.8 }}>
                {option.impact}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "30px",
        borderRadius: "12px",
        marginBottom: "40px"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "20px", textAlign: "center" }}>
          Or Enter Custom Amount
        </h3>
        <form onSubmit={handleCustomDonate}>
          <div style={{ display: "flex", gap: "12px", maxWidth: "400px", margin: "0 auto" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "16px",
                opacity: 0.7
              }}>
                $
              </span>
              <input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                required
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 24px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: "16px"
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !donationAmount}
              style={{
                padding: "12px 24px",
                background: isProcessing || !donationAmount
                  ? "rgba(255, 255, 255, 0.3)"
                  : "linear-gradient(135deg, #FFD93D, #FF6B6B)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: isProcessing || !donationAmount ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              {isProcessing ? "Processing..." : "Donate"}
            </button>
          </div>
        </form>
      </div>

      {/* Other Ways to Give */}
      <div style={{ marginBottom: "40px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "20px", textAlign: "center" }}>
          Other Ways to Give
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Corporate Matching</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Double your impact with employer matching
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
              Learn More
            </button>
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>In-Kind Donations</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Supplies, equipment, and services
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
              View Wishlist
            </button>
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎁</div>
            <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>Planned Giving</h4>
            <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
              Leave a legacy for pet welfare
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
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Trust & Transparency */}
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "20px",
        borderRadius: "12px"
      }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", textAlign: "center" }}>
          Trust & Transparency
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✅</div>
            <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>501(c)(3) Certified</h4>
            <p style={{ fontSize: "12px", opacity: 0.8 }}>Tax-deductible donations</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📊</div>
            <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>87% to Programs</h4>
            <p style={{ fontSize: "12px", opacity: 0.8 }}>Direct impact on pets</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏆</div>
            <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>4-Star Rating</h4>
            <p style={{ fontSize: "12px", opacity: 0.8 }}>Charity Navigator approved</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
            <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>Secure Payments</h4>
            <p style={{ fontSize: "12px", opacity: 0.8 }}>PCI compliant processing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
