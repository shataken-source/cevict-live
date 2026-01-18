"use client";
import SimpleAgeGate from "@/components/SimpleAgeGate";
import { useEffect, useState } from "react";

export default function AffiliateShop() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Check cookie
    const verified = document.cookie.includes('age_verified=yes');
    setAgeVerified(verified);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load products');
        setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch((e) => {
        console.error('Failed to load products:', e);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((a) => a.category)))];

  if (!ageVerified) {
    return <SimpleAgeGate onVerified={() => setAgeVerified(true)} />;
  }

  const filtered = category === "all" ? products : products.filter((a) => a.category === category);

  return (
    <div style={{maxWidth:"1400px",margin:"0 auto",padding:"40px 20px"}}>
      <h1 style={{fontSize:"48px",marginBottom:"10px"}}>🛒 Smoker's Marketplace</h1>
      <p style={{fontSize:"18px",color:"#666",marginBottom:"30px"}}>Live Products | All 21+</p>

      <div style={{background:"#fff3cd",padding:"15px",borderRadius:"8px",marginBottom:"30px"}}>
        <strong>⚠️ FTC Disclosure:</strong> We earn commissions from purchases. All products legal for adults 21+.
      </div>

      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"40px"}}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{padding:"10px 20px",background:category===cat?"#000":"#fff",color:category===cat?"#fff":"#000",border:"1px solid #000",borderRadius:"6px",cursor:"pointer",fontSize:"14px"}}
          >
            {cat === "all" ? "All Products" : cat} ({cat === "all" ? products.length : products.filter(a => a.category === cat).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Loading products…</div>
      ) : null}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:"20px"}}>
        {filtered.map((item, i) => (
          <div key={i} style={{border:"1px solid #ddd",borderRadius:"8px",padding:"20px",background:"#fff"}}>
            <div style={{background:"#f0f0f0",height:"150px",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"15px",fontSize:"48px"}}>
              {item.category.includes("CBD") && "🌿"}
              {item.category === "Delta-8" && "🟢"}
              {item.category === "Vaping" && "💨"}
              {item.category === "Hemp" && "🌱"}
              {item.category === "Accessories" && "🔧"}
              {item.category === "Kratom" && "🍃"}
              {item.category === "Alternatives" && "⚡"}
            </div>
            <div style={{fontSize:"11px",color:"#666",marginBottom:"5px"}}>{item.name}</div>
            <h3 style={{fontSize:"16px",marginBottom:"10px",height:"40px"}}>{item.name}</h3>
            <div style={{fontSize:"20px",fontWeight:"bold",color:"#28a745",marginBottom:"10px"}}>{item.price}</div>
            <a href={item.link} target="_blank" rel="noopener sponsored" style={{display:"block",background:"#000",color:"#fff",textAlign:"center",padding:"10px",borderRadius:"6px",textDecoration:"none",fontWeight:"bold",fontSize:"14px"}}>
              Shop Now →
            </a>
            <div style={{fontSize:"10px",color:"#999",marginTop:"8px",textAlign:"center"}}>Earn {item.commission}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:"60px",padding:"30px",background:"#f8f9fa",borderRadius:"8px"}}>
        <h3 style={{fontSize:"24px",marginBottom:"15px"}}>📋 Legal Info</h3>
        <ul style={{fontSize:"14px",lineHeight:"1.8",color:"#666"}}>
          <li>All products require age 21+</li>
          <li>CBD federally legal (&lt;0.3% THC)</li>
          <li>Delta-8 legal federally, check state</li>
          <li>Kratom legal in most states</li>
        </ul>
      </div>
    </div>
  );
}
