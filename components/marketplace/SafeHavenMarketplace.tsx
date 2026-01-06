"use client";

import { useEffect, useState } from "react";

interface AffiliateProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  commission: string;
  link: string;
  description: string;
  sponsor: boolean;
}

export default function SafeHavenMarketplace() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [panicMode, setPanicMode] = useState(false);
  const [userState, setUserState] = useState<string | null>(null);

  useEffect(() => {
    // Load affiliates from JSON file
    fetch("/data/affiliates.json")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load affiliates:", err);
        setLoading(false);
      });

    // Simple alert fetch to drive panic mode
    const detectAlerts = async () => {
      try {
        const res = await fetch("/api/alerts/paul-revere?limit=5");
        if (!res.ok) return;
        const data = await res.json();
        const alerts = data?.alerts || [];
        const hasHigh = alerts.some(
          (a: any) =>
            a?.type === "immediate" ||
            (a?.type === "urgent" && (a?.scope === "national" || !a?.state || a?.state === userState))
        );
        setPanicMode(hasHigh);
      } catch (err) {
        console.warn("Alert check failed", err);
      }
    };

    detectAlerts();
  }, []);

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading marketplace...</div>;
  }

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
  const [selectedCategory, setSelectedCategory] = useState("all");
  const filtered = selectedCategory === "all" 
    ? products 
    : products.filter((p) => p.category === selectedCategory);

  const sponsors = filtered.filter((p) => p.sponsor);
  const regular = filtered.filter((p) => !p.sponsor);

  return (
    <section style={{ 
      marginTop: "40px", 
      padding: "20px", 
      background: "#ffffff",
      borderTop: "3px solid #cc0000"
    }}>
      <h2 style={{
        fontSize: "32px",
        fontFamily: "Impact, Arial Black, sans-serif",
        textAlign: "center",
        marginBottom: "10px",
        color: "#000000",
        textTransform: "uppercase",
        letterSpacing: "0.1em"
      }}>
        🛡️ SAFE HAVEN MARKETPLACE
      </h2>
      
      <p style={{
        textAlign: "center",
        fontSize: "14px",
        color: "#666",
        marginBottom: "20px"
      }}>
        Support SmokersRights while shopping smoker-approved products
      </p>

      {/* Category Filter */}
      <div style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: "30px"
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "8px 16px",
              background: selectedCategory === cat ? "#cc0000" : "#ffffff",
              color: selectedCategory === cat ? "#ffffff" : "#000000",
              border: "2px solid #cc0000",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "Impact, Arial Black, sans-serif",
              textTransform: "uppercase"
            }}
          >
            {cat === "all" ? "All" : cat} ({cat === "all" ? products.length : products.filter(p => p.category === cat).length})
          </button>
        ))}
      </div>

      {/* Sponsor Section */}
      {sponsors.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <h3 style={{
            fontSize: "20px",
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#cc0000",
            marginBottom: "15px",
            textTransform: "uppercase",
            borderBottom: "2px solid #cc0000",
            paddingBottom: "5px"
          }}>
            SPONSOR
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px"
          }}>
            {sponsors.map((product) => (
              <div
                key={product.id}
                style={{
                  border: "3px solid #cc0000",
                  borderRadius: "8px",
                  padding: "15px",
                  background: "#fff3cd"
                }}
              >
                <div style={{
                  fontSize: "10px",
                  color: "#cc0000",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  textTransform: "uppercase"
                }}>
                  SPONSOR
                </div>
                <h4 style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  fontFamily: "Impact, Arial Black, sans-serif"
                }}>
                  {product.name}
                </h4>
                <p style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "10px",
                  minHeight: "40px"
                }}>
                  {product.description}
                </p>
                <div style={{
                  fontSize: "18px",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  color: "#FFD700",
                  fontWeight: "bold",
                  marginBottom: "10px"
                }}>
                  {product.price}
                </div>
                <a
                  href={`${product.link}${product.link.includes('?') ? '&' : '?'}subid=liberty_terminal${panicMode ? '_panic' : ''}`}
                  target="_blank"
                  rel="noopener sponsored"
                  style={{
                    display: "block",
                    background: panicMode ? "#ffcc00" : "#cc0000",
                    color: panicMode ? "#000" : "#ffffff",
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: "4px",
                    textDecoration: "none",
                    fontWeight: "bold",
                    fontSize: "14px",
                    fontFamily: "Impact, Arial Black, sans-serif",
                    textTransform: "uppercase"
                  }}
                >
                  {panicMode ? "PANIC BUY: Stock up before the ban" : "Shop Now →"}
                </a>
                {product.commission !== "N/A" && (
                  <div style={{
                    fontSize: "10px",
                    color: "#999",
                    marginTop: "8px",
                    textAlign: "center"
                  }}>
                    Earn {product.commission}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Products */}
      {regular.length > 0 && (
        <div>
          <h3 style={{
            fontSize: "20px",
            fontFamily: "Impact, Arial Black, sans-serif",
            color: "#000000",
            marginBottom: "15px",
            textTransform: "uppercase",
            borderBottom: "2px solid #000000",
            paddingBottom: "5px"
          }}>
            PRODUCTS
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px"
          }}>
            {regular.map((product) => (
              <div
                key={product.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "15px",
                  background: "#ffffff"
                }}
              >
                <h4 style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  fontFamily: "Impact, Arial Black, sans-serif"
                }}>
                  {product.name}
                </h4>
                <p style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "10px",
                  minHeight: "40px"
                }}>
                  {product.description}
                </p>
                <div style={{
                  fontSize: "18px",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  color: "#FFD700",
                  fontWeight: "bold",
                  marginBottom: "10px"
                }}>
                  {product.price}
                </div>
                <a
                  href={`${product.link}${product.link.includes('?') ? '&' : '?'}subid=liberty_terminal${panicMode ? '_panic' : ''}`}
                  target="_blank"
                  rel="noopener sponsored"
                  style={{
                    display: "block",
                    background: panicMode ? "#ffcc00" : "#000000",
                    color: panicMode ? "#000" : "#ffffff",
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: "4px",
                    textDecoration: "none",
                    fontWeight: "bold",
                    fontSize: "14px",
                    fontFamily: "Impact, Arial Black, sans-serif",
                    textTransform: "uppercase"
                  }}
                >
                  {panicMode ? "PANIC BUY: Stock up before the ban" : "Shop Now →"}
                </a>
                {product.commission !== "N/A" && (
                  <div style={{
                    fontSize: "10px",
                    color: "#999",
                    marginTop: "8px",
                    textAlign: "center"
                  }}>
                    Earn {product.commission}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FTC Disclosure */}
      <div style={{
        marginTop: "40px",
        padding: "15px",
        background: "#fff3cd",
        borderRadius: "8px",
        border: "2px solid #cc0000"
      }}>
        <p style={{
          fontSize: "12px",
          lineHeight: "1.6",
          color: "#000000"
        }}>
          <strong>⚠️ FTC Disclosure:</strong> SmokersRights.com earns commissions from affiliate purchases. 
          All products are legal for adults 21+. Prices and availability subject to change. 
          We only promote products we believe in. Your purchase supports our advocacy work.
        </p>
      </div>
    </section>
  );
}

