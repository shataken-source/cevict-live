export async function getMultiBookOdds(sport: string, game: string): Promise<any[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}`
    );
    return await response.json();
  } catch {
    return [];
  }
}

export async function getDetailedWeather(location: string): Promise<any> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`
    );
    return await response.json();
  } catch {
    return null;
  }
}
