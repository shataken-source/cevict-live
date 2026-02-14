"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Pet {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  photo_url: string;
  status: string;
  location_city: string;
  location_state: string;
  date_lost: string;
  description: string;
}

export default function ShelterDashboard() {
  const router = useRouter();
  const [shelterId, setShelterId] = useState<string | null>(null);
  const [shelterName, setShelterName] = useState<string>("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adoptapetUrl, setAdoptapetUrl] = useState("https://www.adoptapet.com/shelter/101983-2nd-chance-shelter-boaz-alabama#available-pets");
  const [stats, setStats] = useState({
    total: 0,
    dogs: 0,
    cats: 0,
    found: 0,
    lost: 0
  });

  // Check login on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('shelter_id');
      const name = localStorage.getItem('shelter_name');
      
      if (!id) {
        // Not logged in, redirect to login
        router.push('/petreunion/shelter/login');
        return;
      }
      
      setShelterId(id);
      setShelterName(name || 'Your Shelter');
      loadPets(id);
    }
  }, [router]);

  const loadPets = async (shelterIdParam?: string) => {
    const id = shelterIdParam || shelterId;
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/petreunion/shelter/pets?shelter_id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setPets(data.pets || []);
        calculateStats(data.pets || []);
      }
    } catch (error) {
      console.error("Error loading pets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shelter_id');
    localStorage.removeItem('shelter_name');
    router.push('/petreunion/shelter/login');
  };

  const calculateStats = (petList: Pet[]) => {
    setStats({
      total: petList.length,
      dogs: petList.filter(p => p.pet_type === 'dog').length,
      cats: petList.filter(p => p.pet_type === 'cat').length,
      found: petList.filter(p => p.status === 'found').length,
      lost: petList.filter(p => p.status === 'lost').length
    });
  };

  const syncFromAdoptAPet = async () => {
    if (!adoptapetUrl) {
      alert("Please enter your AdoptAPet URL");
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch("/api/petreunion/scrape-adoptapet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: adoptapetUrl })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Synced ${data.petsSaved} pets from AdoptAPet!\n\n- Pets scraped: ${data.petsScraped}\n- Pets saved: ${data.petsSaved}\n- Pets skipped: ${data.petsSkipped || 0}`);
        loadPets(); // Reload pets
      } else {
        alert(`❌ Error: ${data.error || data.message || "Failed to sync"}`);
      }
    } catch (error: any) {
      alert(`❌ Error syncing: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f5f5f5",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          padding: "30px", 
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                🏢 {shelterName || 'Shelter'} Dashboard
              </h1>
              <p style={{ color: "#666", fontSize: "16px" }}>
                Manage your pets easily - sync from AdoptAPet with one click
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link
                href="/petreunion/shelter/add-pet"
                style={{
                  padding: "12px 24px",
                  background: "#10b981",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}
              >
                ➕ Add Pet Manually
              </Link>
              <Link
                href="/petreunion/shelter/bulk-import"
                style={{
                  padding: "12px 24px",
                  background: "#667eea",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}
              >
                📥 Bulk Import
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: "12px 24px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
              <Link 
                href="/petreunion"
                style={{
                  padding: "12px 24px",
                  background: "#667eea",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}
              >
                ← Back to PetReunion
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "20px",
          marginBottom: "30px"
        }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea" }}>{stats.total}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Total Pets</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>{stats.dogs}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Dogs</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>{stats.cats}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Cats</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>{stats.found}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Available</div>
          </div>
        </div>

        {/* Sync Section */}
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          padding: "30px", 
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#333" }}>
            🔄 Sync from AdoptAPet
          </h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Paste your AdoptAPet shelter page URL and click sync to automatically import all your pets.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={adoptapetUrl}
              onChange={(e) => setAdoptapetUrl(e.target.value)}
              placeholder="https://www.adoptapet.com/shelter/..."
              style={{
                flex: "1",
                minWidth: "300px",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "16px"
              }}
            />
            <button
              onClick={syncFromAdoptAPet}
              disabled={syncing}
              style={{
                padding: "12px 32px",
                background: syncing ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: syncing ? "not-allowed" : "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {syncing ? "🔄 Syncing..." : "✅ Sync Now"}
            </button>
          </div>
          <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
            💡 Tip: This will automatically detect dogs, cats, breeds, colors, and photos from your AdoptAPet page.
          </p>
        </div>

        {/* Pets List */}
        <div style={{ 
          background: "white", 
          borderRadius: "12px", 
          padding: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
              Your Pets ({pets.length})
            </h2>
            <button
              onClick={() => loadPets()}
              disabled={loading}
              style={{
                padding: "8px 16px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "🔄 Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {loading && pets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔄</div>
              <div>Loading pets...</div>
            </div>
          ) : pets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>🐕</div>
              <div style={{ fontSize: "20px", marginBottom: "10px" }}>No pets yet</div>
              <div>Sync from AdoptAPet to get started!</div>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: "20px"
            }}>
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "white",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ 
                    width: "100%", 
                    height: "200px", 
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}>
                    {pet.photo_url ? (
                      <img 
                        src={pet.photo_url} 
                        alt={pet.pet_name}
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "cover"
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "48px" }}>
                        {pet.pet_type === 'dog' ? '🐕' : '🐱'}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "16px" }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "start",
                      marginBottom: "8px"
                    }}>
                      <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
                        {pet.pet_name || "Unknown"}
                      </h3>
                      <span style={{
                        padding: "4px 8px",
                        background: pet.status === 'found' ? "#d1fae5" : "#fee2e2",
                        color: pet.status === 'found' ? "#065f46" : "#991b1b",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {pet.status === 'found' ? 'Available' : 'Lost'}
                      </span>
                    </div>
                    <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                      <div>{pet.breed} • {pet.pet_type === 'dog' ? '🐕' : '🐱'}</div>
                      <div>{pet.color} • {pet.size}</div>
                      <div>{pet.location_city}, {pet.location_state}</div>
                    </div>
                    {pet.description && (
                      <p style={{ 
                        color: "#666", 
                        fontSize: "13px", 
                        marginTop: "8px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical"
                      }}>
                        {pet.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
