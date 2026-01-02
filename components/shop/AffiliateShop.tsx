"use client";
import SimpleAgeGate from "@/components/SimpleAgeGate";
import { useEffect, useState } from "react";

export default function AffiliateShop() {
  const [ageVerified, setAgeVerified] = useState(false);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    // Check cookie
    const verified = document.cookie.includes('age_verified=yes');
    setAgeVerified(verified);
  }, []);

  const affiliates = [
    // CBD OIL & TINCTURES (10)
    { name: "CBDistillery", product: "CBD Oil 1000mg", price: "$74.99", commission: "20%", link: "https://cbdistillery.com/?ref=sr", category: "CBD Oil" },
    { name: "Charlotte's Web", product: "Full Spectrum CBD", price: "$89.99", commission: "15%", link: "https://charlottesweb.com/?ref=sr", category: "CBD Oil" },
    { name: "Medterra", product: "CBD Tincture", price: "$49.99", commission: "25%", link: "https://medterracbd.com/?ref=sr", category: "CBD Oil" },
    { name: "Lazarus Naturals", product: "High Potency CBD", price: "$64.99", commission: "20%", link: "https://lazarusnaturals.com/?ref=sr", category: "CBD Oil" },
    { name: "NuLeaf Naturals", product: "Full Spectrum CBD", price: "$99.99", commission: "30%", link: "https://nuleafnaturals.com/?ref=sr", category: "CBD Oil" },
    { name: "Joy Organics", product: "Premium CBD Oil", price: "$79.99", commission: "25%", link: "https://joyorganics.com/?ref=sr", category: "CBD Oil" },
    { name: "Spruce CBD", product: "Lab Grade CBD", price: "$89.99", commission: "20%", link: "https://sprucecbd.com/?ref=sr", category: "CBD Oil" },
    { name: "Fab CBD", product: "CBD Oil Drops", price: "$59.99", commission: "25%", link: "https://fabcbd.com/?ref=sr", category: "CBD Oil" },
    { name: "Populum", product: "Full Spectrum CBD", price: "$69.99", commission: "20%", link: "https://populum.com/?ref=sr", category: "CBD Oil" },
    { name: "Green Roads", product: "CBD Oil 1500mg", price: "$84.99", commission: "15%", link: "https://greenroads.com/?ref=sr", category: "CBD Oil" },

    // CBD GUMMIES (10)
    { name: "Sunday Scaries", product: "CBD Gummies", price: "$39.99", commission: "30%", link: "https://sundayscaries.com/?ref=sr", category: "CBD Gummies" },
    { name: "Just CBD", product: "Gummy Bears", price: "$29.99", commission: "25%", link: "https://justcbdstore.com/?ref=sr", category: "CBD Gummies" },
    { name: "Hemp Bombs", product: "CBD Gummies 25mg", price: "$34.99", commission: "20%", link: "https://hempbombs.com/?ref=sr", category: "CBD Gummies" },
    { name: "CBDfx", product: "Mixed Berry Gummies", price: "$49.99", commission: "25%", link: "https://cbdfx.com/?ref=sr", category: "CBD Gummies" },
    { name: "Diamond CBD", product: "Chill Gummies", price: "$39.99", commission: "30%", link: "https://diamondcbd.com/?ref=sr", category: "CBD Gummies" },
    { name: "PlusCBD", product: "Extra Strength Gummies", price: "$44.99", commission: "20%", link: "https://pluscbdoil.com/?ref=sr", category: "CBD Gummies" },
    { name: "Koi CBD", product: "Tropical Gummies", price: "$39.99", commission: "25%", link: "https://koicbd.com/?ref=sr", category: "CBD Gummies" },
    { name: "Social CBD", product: "Broad Spectrum Gummies", price: "$34.99", commission: "20%", link: "https://socialcbd.com/?ref=sr", category: "CBD Gummies" },
    { name: "Sunset CBD", product: "Sleep Gummies", price: "$44.99", commission: "25%", link: "https://sunsetlakecbd.com/?ref=sr", category: "CBD Gummies" },
    { name: "Verma Farms", product: "Hawaiian Gummies", price: "$49.99", commission: "30%", link: "https://vermafarms.com/?ref=sr", category: "CBD Gummies" },

    // DELTA-8 THC (10)
    { name: "3Chi", product: "Delta-8 Gummies", price: "$29.99", commission: "25%", link: "https://3chi.com/?ref=sr", category: "Delta-8" },
    { name: "Delta Effex", product: "Delta-8 Vape Cart", price: "$39.99", commission: "20%", link: "https://deltaeffex.com/?ref=sr", category: "Delta-8" },
    { name: "Binoid", product: "Delta-8 THC Tincture", price: "$49.99", commission: "30%", link: "https://binoidcbd.com/?ref=sr", category: "Delta-8" },
    { name: "Canna River", product: "Delta-8 Gummies", price: "$34.99", commission: "25%", link: "https://cannariver.com/?ref=sr", category: "Delta-8" },
    { name: "Area 52", product: "Delta-8 Vapes", price: "$44.99", commission: "20%", link: "https://area52.com/?ref=sr", category: "Delta-8" },
    { name: "Finest Labs", product: "Delta-8 Distillate", price: "$59.99", commission: "25%", link: "https://finestlabs.com/?ref=sr", category: "Delta-8" },
    { name: "Delta Remedys", product: "Delta-8 Softgels", price: "$39.99", commission: "20%", link: "https://deltaremedys.com/?ref=sr", category: "Delta-8" },
    { name: "Exhale Wellness", product: "Delta-8 Flowers", price: "$49.99", commission: "30%", link: "https://exhalewell.com/?ref=sr", category: "Delta-8" },
    { name: "BudPop", product: "Delta-8 Cartridges", price: "$44.99", commission: "25%", link: "https://budpop.com/?ref=sr", category: "Delta-8" },
    { name: "Mr. Hemp Flower", product: "Delta-8 Pre-Rolls", price: "$34.99", commission: "20%", link: "https://mrhempflower.com/?ref=sr", category: "Delta-8" },

    // VAPING (10)
    { name: "VaporFi", product: "Vape Starter Kit", price: "$39.99", commission: "25%", link: "https://vaporfi.com/?ref=sr", category: "Vaping" },
    { name: "VapeWild", product: "E-Liquid 120ml", price: "$12.99", commission: "20%", link: "https://vapewild.com/?ref=sr", category: "Vaping" },
    { name: "Element Vape", product: "Pod System", price: "$29.99", commission: "15%", link: "https://elementvape.com/?ref=sr", category: "Vaping" },
    { name: "DirectVapor", product: "Mod Kit", price: "$59.99", commission: "20%", link: "https://directvapor.com/?ref=sr", category: "Vaping" },
    { name: "EightVape", product: "Disposable Vapes", price: "$14.99", commission: "25%", link: "https://eightvape.com/?ref=sr", category: "Vaping" },
    { name: "VaporDNA", product: "Premium E-Juice", price: "$24.99", commission: "20%", link: "https://vapordna.com/?ref=sr", category: "Vaping" },
    { name: "MyVpro", product: "Vape Coils", price: "$9.99", commission: "15%", link: "https://myvpro.com/?ref=sr", category: "Vaping" },
    { name: "Electric Tobacconist", product: "Nicotine Salts", price: "$19.99", commission: "20%", link: "https://electrictobacconist.com/?ref=sr", category: "Vaping" },
    { name: "Breazy", product: "Vape Bundles", price: "$49.99", commission: "25%", link: "https://breazy.com/?ref=sr", category: "Vaping" },
    { name: "Vapor4Life", product: "E-Cig Starter", price: "$34.99", commission: "20%", link: "https://vapor4life.com/?ref=sr", category: "Vaping" },

    // HEMP FLOWER (5)
    { name: "Plain Jane", product: "Hemp Flower oz", price: "$29.99", commission: "30%", link: "https://plainjane.com/?ref=sr", category: "Hemp" },
    { name: "Secret Nature", product: "CBD Pre-Rolls", price: "$34.99", commission: "25%", link: "https://secretnaturecbd.com/?ref=sr", category: "Hemp" },
    { name: "Tweedle Farms", product: "Organic Hemp", price: "$39.99", commission: "20%", link: "https://tweedlefarms.com/?ref=sr", category: "Hemp" },
    { name: "Dr. Ganja", product: "Premium Hemp", price: "$44.99", commission: "25%", link: "https://drganja.com/?ref=sr", category: "Hemp" },
    { name: "Berkshire CBD", product: "Hemp Buds", price: "$34.99", commission: "30%", link: "https://berkshirecbd.com/?ref=sr", category: "Hemp" },

    // GLASS/ACCESSORIES (10)
    { name: "Smoke Cartel", product: "Glass Bongs", price: "$49-$299", commission: "15%", link: "https://smokecartel.com/?ref=sr", category: "Accessories" },
    { name: "DankGeek", product: "Grinders", price: "$9.99-$79", commission: "20%", link: "https://dankgeek.com/?ref=sr", category: "Accessories" },
    { name: "Grasscity", product: "Smoking Pipes", price: "$19.99+", commission: "15%", link: "https://grasscity.com/?ref=sr", category: "Accessories" },
    { name: "Everything For 420", product: "Storage Jars", price: "$14.99", commission: "25%", link: "https://everythingfor420.com/?ref=sr", category: "Accessories" },
    { name: "Toker Supply", product: "Rolling Papers", price: "$2.99+", commission: "20%", link: "https://tokersupply.com/?ref=sr", category: "Accessories" },
    { name: "Cannabox", product: "Subscription Box", price: "$19.99/mo", commission: "30%", link: "https://cannabox.com/?ref=sr", category: "Accessories" },
    { name: "Hemper", product: "Monthly Box", price: "$29.99/mo", commission: "25%", link: "https://hemper.co/?ref=sr", category: "Accessories" },
    { name: "Daily High Club", product: "Premium Box", price: "$39.99/mo", commission: "20%", link: "https://dailyhighclub.com/?ref=sr", category: "Accessories" },
    { name: "Grav Labs", product: "Scientific Glass", price: "$29.99+", commission: "15%", link: "https://grav.com/?ref=sr", category: "Accessories" },
    { name: "MJ Arsenal", product: "Mini Rigs", price: "$34.99+", commission: "20%", link: "https://mjarsenal.com/?ref=sr", category: "Accessories" },

    // KRATOM (5)
    { name: "Kraken Kratom", product: "Red Vein Capsules", price: "$19.99", commission: "30%", link: "https://krakenkratom.com/?ref=sr", category: "Kratom" },
    { name: "Golden Monk", product: "Kratom Powder", price: "$24.99", commission: "25%", link: "https://goldenmonk.com/?ref=sr", category: "Kratom" },
    { name: "Kats Botanicals", product: "Kratom Extract", price: "$29.99", commission: "20%", link: "https://katsbotanicals.com/?ref=sr", category: "Kratom" },
    { name: "Super Speciosa", product: "Green Maeng Da", price: "$34.99", commission: "25%", link: "https://superspeciosa.com/?ref=sr", category: "Kratom" },
    { name: "Coastline Kratom", product: "White Vein", price: "$19.99", commission: "30%", link: "https://coastlinekratom.com/?ref=sr", category: "Kratom" },

    // NICOTINE ALTERNATIVES (5)
    { name: "Lucy Nicotine", product: "Nicotine Gum 4mg", price: "$29.99", commission: "20%", link: "https://lucy.co/?ref=sr", category: "Alternatives" },
    { name: "Black Buffalo", product: "Tobacco-Free Dip", price: "$4.99", commission: "15%", link: "https://blackbuffalo.com/?ref=sr", category: "Alternatives" },
    { name: "Zyn", product: "Nicotine Pouches", price: "$5.99", commission: "10%", link: "https://zyn.com/?ref=sr", category: "Alternatives" },
    { name: "FRE Pouch", product: "Tobacco-Free", price: "$4.49", commission: "15%", link: "https://frepouch.com/?ref=sr", category: "Alternatives" },
    { name: "Rogue", product: "Nicotine Lozenges", price: "$6.99", commission: "20%", link: "https://roguenicotine.com/?ref=sr", category: "Alternatives" }
  ];

  const categories = ["all", ...Array.from(new Set(affiliates.map(a => a.category)))];

  if (!ageVerified) {
    return <SimpleAgeGate onVerified={() => setAgeVerified(true)} />;
  }

  const filtered = category === "all" ? affiliates : affiliates.filter(a => a.category === category);

  return (
    <div style={{maxWidth:"1400px",margin:"0 auto",padding:"40px 20px"}}>
      <h1 style={{fontSize:"48px",marginBottom:"10px"}}>🛒 Smoker's Marketplace</h1>
      <p style={{fontSize:"18px",color:"#666",marginBottom:"30px"}}>65+ Legal Products | All 21+</p>

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
            {cat === "all" ? "All Products" : cat} ({cat === "all" ? affiliates.length : affiliates.filter(a => a.category === cat).length})
          </button>
        ))}
      </div>

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
            <h3 style={{fontSize:"16px",marginBottom:"10px",height:"40px"}}>{item.product}</h3>
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
