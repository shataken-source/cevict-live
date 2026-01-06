"""
SmokersRights Affiliate Scraper (TEST)
Mocks collection of cigar deals, lighters, and legal defense memberships
Outputs to data/affiliates.json for static marketplace
"""

import json
import os
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
AFFILIATES_FILE = DATA_DIR / "affiliates.json"

# Mock affiliate data (in production, this would scrape real sources)
MOCK_AFFILIATES = {
    "cigars": [
        {
            "id": f"cigar-{i:03d}",
            "name": f"Premium Cigar {i}",
            "category": "Cigars",
            "price": f"${19.99 + (i * 2):.2f}",
            "commission": "15%",
            "link": f"/api/affiliate/redirect?url=https://example.com/cigar{i}&ref=SR001",
            "description": f"High-quality cigar option {i}",
            "sponsor": i < 3,  # First 3 are sponsors
        }
        for i in range(1, 11)
    ],
    "lighters": [
        {
            "id": f"lighter-{i:03d}",
            "name": f"Lighter Model {i}",
            "category": "Lighters",
            "price": f"${14.99 + (i * 3):.2f}",
            "commission": "20%",
            "link": f"/api/affiliate/redirect?url=https://example.com/lighter{i}&ref=SR001",
            "description": f"Reliable lighter option {i}",
            "sponsor": i < 2,  # First 2 are sponsors
        }
        for i in range(1, 8)
    ],
    "legal": [
        {
            "id": "legal-001",
            "name": "SmokersRights Legal Defense Membership",
            "category": "Legal Defense",
            "price": "$99/year",
            "commission": "N/A",
            "link": "/membership",
            "description": "24/7 legal support for property rights violations",
            "sponsor": True,
        },
        {
            "id": "legal-002",
            "name": "Property Rights Legal Guide",
            "category": "Legal Defense",
            "price": "$29.99",
            "commission": "N/A",
            "link": "/legal-guide",
            "description": "Comprehensive handbook on smoker property rights",
            "sponsor": False,
        },
        {
            "id": "legal-003",
            "name": "Advocacy Action Alert Subscription",
            "category": "Legal Defense",
            "price": "$9.99/month",
            "commission": "N/A",
            "link": "/alerts",
            "description": "SMS alerts for local council meetings",
            "sponsor": False,
        },
    ],
}

def scrape_affiliates():
    """Mock scraper - collects affiliate products"""
    print("[INFO] Scraping affiliate products (MOCK MODE)...")
    
    all_products = []
    all_products.extend(MOCK_AFFILIATES["cigars"])
    all_products.extend(MOCK_AFFILIATES["lighters"])
    all_products.extend(MOCK_AFFILIATES["legal"])
    
    output = {
        "lastUpdate": datetime.utcnow().isoformat(),
        "marketplace": "Safe Haven",
        "products": all_products,
    }
    
    return output

def write_affiliates(data):
    """Write affiliates to JSON file"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(AFFILIATES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"[OK] Wrote {len(data['products'])} products to {AFFILIATES_FILE}")

def main():
    """Main scraper loop"""
    print("SmokersRights Affiliate Scraper (TEST MODE)")
    print("=" * 50)
    
    try:
        affiliates = scrape_affiliates()
        write_affiliates(affiliates)
        
        print(f"\n✅ Scraped {len(affiliates['products'])} affiliate products")
        print(f"   Sponsors: {sum(1 for p in affiliates['products'] if p.get('sponsor'))}")
        print(f"   Regular: {sum(1 for p in affiliates['products'] if not p.get('sponsor'))}")
        
    except Exception as e:
        print(f"[ERROR] Scraper failed: {e}")
        raise

if __name__ == "__main__":
    main()

