"""
Scrape Rotowire injury reports for NBA, NFL, NHL
"""

import requests
from bs4 import BeautifulSoup
import json
from pathlib import Path
from datetime import datetime

def scrape_rotowire_injuries(sport='basketball'):
    """Scrape injury data from Rotowire"""
    url = f"https://www.rotowire.com/{sport}/injury-report.php"
    
    print(f"Scraping {sport} injuries from {url}...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        injuries = []
        
        # Find injury table - structure may vary by sport
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows[1:]:  # Skip header
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 4:
                    try:
                        player = cols[0].get_text(strip=True) if len(cols) > 0 else ''
                        team = cols[1].get_text(strip=True) if len(cols) > 1 else ''
                        status = cols[2].get_text(strip=True) if len(cols) > 2 else ''
                        injury = cols[3].get_text(strip=True) if len(cols) > 3 else ''
                        
                        if player and team:
                            injuries.append({
                                'player': player,
                                'team': team,
                                'status': status,
                                'injury': injury,
                                'sport': sport,
                                'scraped_at': datetime.now().isoformat()
                            })
                    except Exception as e:
                        continue
        
        print(f"  Found {len(injuries)} injuries")
        return injuries
        
    except Exception as e:
        print(f"ERROR: Failed to scrape {sport}: {str(e)}")
        return []

def main():
    print("=== Scraping Rotowire Injury Reports ===\n")
    
    script_dir = Path(__file__).parent
    progno_dir = script_dir.parent / '.progno'
    progno_dir.mkdir(exist_ok=True)
    
    all_injuries = {
        'NBA': scrape_rotowire_injuries('basketball'),
        'NFL': scrape_rotowire_injuries('football'),
        'NHL': scrape_rotowire_injuries('hockey')
    }
    
    # Save results
    output_file = progno_dir / 'rotowire-injuries.json'
    with open(output_file, 'w') as f:
        json.dump(all_injuries, f, indent=2)
    
    total = sum(len(injuries) for injuries in all_injuries.values())
    print(f"\n=== Summary ===")
    print(f"Total injuries: {total}")
    for sport, injuries in all_injuries.items():
        print(f"  {sport}: {len(injuries)} injuries")
    
    print(f"\nSUCCESS: Results saved to {output_file}")

if __name__ == '__main__':
    main()

