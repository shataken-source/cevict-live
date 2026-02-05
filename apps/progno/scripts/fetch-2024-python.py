"""
Fetch 2024 Game Results using Python APIs
Uses nba_api for NBA, and other free sources for other sports
"""

import json
import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

# NBA API
try:
    from nba_api.stats.endpoints import scoreboardv2, boxscoresummaryv2
    from nba_api.stats.static import teams
    NBA_API_AVAILABLE = True
except ImportError:
    print("Warning: nba_api not available. Install with: pip install nba_api")
    NBA_API_AVAILABLE = False

def fetch_nba_2024_results():
    """Fetch NBA 2024 game results using nba_api - optimized to only fetch season dates"""
    if not NBA_API_AVAILABLE:
        return []
    
    results = []
    # NBA 2023-24 season: Oct 2023 - June 2024
    # NBA 2024-25 season: Oct 2024 - June 2025
    # Focus on 2024 calendar year games
    season_dates = [
        # 2023-24 season (games in 2024)
        (datetime(2024, 1, 1), datetime(2024, 4, 14)),  # Regular season end
        (datetime(2024, 4, 20), datetime(2024, 6, 23)),  # Playoffs
        # 2024-25 season (games in 2024)
        (datetime(2024, 10, 22), datetime(2024, 12, 31)),  # Regular season start
    ]
    
    print("Fetching NBA 2024 results...")
    
    for start_date, end_date in season_dates:
        current_date = start_date
        while current_date <= end_date:
            try:
                # Get scoreboard for this date
                scoreboard = scoreboardv2.ScoreboardV2(
                    game_date=current_date.strftime('%m/%d/%Y'),
                    league_id='00'
                )
                games = scoreboard.get_data_frames()[0]
                
                if len(games) > 0:
                    print(f"  {current_date.strftime('%Y-%m-%d')}: {len(games)} games")
                    
                    for _, game in games.iterrows():
                        game_id = game['GAME_ID']
                        
                        try:
                            # Get box score for detailed info
                            box_score = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
                            box_data = box_score.get_data_frames()
                            
                            if len(box_data) > 0:
                                game_summary = box_data[0].iloc[0] if len(box_data[0]) > 0 else None
                                if game_summary is None:
                                    continue
                                
                                home_team_id = game['HOME_TEAM_ID']
                                away_team_id = game['VISITOR_TEAM_ID']
                                
                                # Get team names
                                teams_df = teams.get_teams()
                                home_team = teams_df[teams_df['id'] == home_team_id]['full_name'].values[0] if len(teams_df[teams_df['id'] == home_team_id]) > 0 else f"Team_{home_team_id}"
                                away_team = teams_df[teams_df['id'] == away_team_id]['full_name'].values[0] if len(teams_df[teams_df['id'] == away_team_id]) > 0 else f"Team_{away_team_id}"
                                
                                # Get scores from game summary
                                home_score = game_summary.get('PTS_HOME', 0) if hasattr(game_summary, 'get') else 0
                                away_score = game_summary.get('PTS_VISITOR', 0) if hasattr(game_summary, 'get') else 0
                                
                                # Try to get from game data directly
                                if home_score == 0 and 'HOME_TEAM_PTS' in game:
                                    home_score = game['HOME_TEAM_PTS']
                                if away_score == 0 and 'VISITOR_TEAM_PTS' in game:
                                    away_score = game['VISITOR_TEAM_PTS']
                                
                                if home_score > 0 or away_score > 0:
                                    game_date = datetime.strptime(str(game['GAME_DATE_EST']), '%Y-%m-%d')
                                    
                                    results.append({
                                        'id': str(game_id),
                                        'sport': 'NBA',
                                        'homeTeam': home_team,
                                        'awayTeam': away_team,
                                        'date': game_date.isoformat(),
                                        'homeScore': int(home_score),
                                        'awayScore': int(away_score),
                                        'winner': home_team if home_score > away_score else away_team
                                    })
                        except Exception as e:
                            continue  # Skip games we can't get details for
            except Exception as e:
                # No games on this date or error
                pass
            
            current_date += timedelta(days=1)
            
            # Rate limiting
            import time
            time.sleep(0.3)
    
    print(f"SUCCESS: NBA: {len(results)} games found")
    return results

def fetch_nfl_2024_results():
    """Fetch NFL 2024 results using SportsData.io API"""
    import requests
    
    api_key = "1915e2808d684c35b9537bb2c9bdad75"
    results = []
    
    print("Fetching NFL 2024 results...")
    
    try:
        # Fetch scores for 2024 season (2024REG)
        url = f"https://api.sportsdata.io/v3/nfl/scores/json/ScoresFinal/2024REG"
        headers = {"Ocp-Apim-Subscription-Key": api_key}
        
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            scores = response.json()
            
            for score in scores:
                if score.get('IsGameOver', False) and score.get('HomeScore') is not None:
                    results.append({
                        'id': str(score.get('ScoreID', '')),
                        'sport': 'NFL',
                        'homeTeam': score.get('HomeTeam', ''),
                        'awayTeam': score.get('AwayTeam', ''),
                        'date': score.get('DateTime', ''),
                        'homeScore': int(score.get('HomeScore', 0)),
                        'awayScore': int(score.get('AwayScore', 0)),
                        'spread': score.get('PointSpread'),
                        'total': score.get('OverUnder'),
                        'winner': score.get('HomeTeam') if score.get('HomeScore', 0) > score.get('AwayScore', 0) else score.get('AwayTeam')
                    })
            
            print(f"SUCCESS: NFL: {len(results)} games found")
        else:
            print(f"WARNING: NFL API returned status {response.status_code}")
    except Exception as e:
        print(f"WARNING: NFL API error: {str(e)}")
    
    return results

def fetch_nhl_2024_results():
    """Fetch NHL 2024 results - placeholder"""
    print("WARNING: NHL: Not implemented - use manual import or paid API")
    return []

def fetch_ncaaf_2024_results():
    """Fetch NCAAF 2024 results - placeholder"""
    print("WARNING: NCAAF: Not implemented - use manual import or paid API")
    return []

def fetch_ncaab_2024_results():
    """Fetch NCAAB 2024 results - placeholder"""
    print("WARNING: NCAAB: Not implemented - use manual import or paid API")
    return []

def main():
    print("=== Fetching 2024 Game Results (Python) ===\n")
    
    # Determine output directory
    script_dir = Path(__file__).parent
    progno_dir = script_dir.parent / '.progno'
    progno_dir.mkdir(exist_ok=True)
    
    all_results = {
        'NFL': fetch_nfl_2024_results(),
        'NBA': fetch_nba_2024_results(),
        'NHL': fetch_nhl_2024_results(),
        'NCAAF': fetch_ncaaf_2024_results(),
        'NCAAB': fetch_ncaab_2024_results()
    }
    
    # Save results
    output_file = progno_dir / '2024-results-all-sports.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    total = sum(len(results) for results in all_results.values())
    print(f"\n=== Summary ===")
    print(f"Total games: {total}")
    for sport, results in all_results.items():
        print(f"  {sport}: {len(results)} games")
    
    print(f"\nSUCCESS: Results saved to {output_file}")

if __name__ == '__main__':
    main()

