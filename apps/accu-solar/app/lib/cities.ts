export type City = {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  country: string;
};

export const US_CITIES: City[] = [
  { name: "New York", state: "NY", latitude: 40.7128, longitude: -74.006, country: "United States" },
  { name: "Los Angeles", state: "CA", latitude: 34.0522, longitude: -118.2437, country: "United States" },
  { name: "Chicago", state: "IL", latitude: 41.8781, longitude: -87.6298, country: "United States" },
  { name: "Houston", state: "TX", latitude: 29.7604, longitude: -95.3698, country: "United States" },
  { name: "Phoenix", state: "AZ", latitude: 33.4484, longitude: -112.074, country: "United States" },
  { name: "Philadelphia", state: "PA", latitude: 39.9526, longitude: -75.1652, country: "United States" },
  { name: "San Antonio", state: "TX", latitude: 29.4241, longitude: -98.4936, country: "United States" },
  { name: "San Diego", state: "CA", latitude: 32.7157, longitude: -117.1611, country: "United States" },
  { name: "Dallas", state: "TX", latitude: 32.7767, longitude: -96.797, country: "United States" },
  { name: "San Jose", state: "CA", latitude: 37.3382, longitude: -121.8863, country: "United States" },
  { name: "Austin", state: "TX", latitude: 30.2672, longitude: -97.7431, country: "United States" },
  { name: "Jacksonville", state: "FL", latitude: 30.3322, longitude: -81.6557, country: "United States" },
  { name: "Fort Worth", state: "TX", latitude: 32.7555, longitude: -97.3308, country: "United States" },
  { name: "Columbus", state: "OH", latitude: 39.9612, longitude: -82.9988, country: "United States" },
  { name: "Charlotte", state: "NC", latitude: 35.2271, longitude: -80.8431, country: "United States" },
  { name: "San Francisco", state: "CA", latitude: 37.7749, longitude: -122.4194, country: "United States" },
  { name: "Indianapolis", state: "IN", latitude: 39.7684, longitude: -86.1581, country: "United States" },
  { name: "Seattle", state: "WA", latitude: 47.6062, longitude: -122.3321, country: "United States" },
  { name: "Denver", state: "CO", latitude: 39.7392, longitude: -104.9903, country: "United States" },
  { name: "Washington", state: "DC", latitude: 38.9072, longitude: -77.0369, country: "United States" },
  { name: "Boston", state: "MA", latitude: 42.3601, longitude: -71.0589, country: "United States" },
  { name: "El Paso", state: "TX", latitude: 31.7619, longitude: -106.4850, country: "United States" },
  { name: "Nashville", state: "TN", latitude: 36.1627, longitude: -86.7816, country: "United States" },
  { name: "Detroit", state: "MI", latitude: 42.3314, longitude: -83.0458, country: "United States" },
  { name: "Oklahoma City", state: "OK", latitude: 35.4676, longitude: -97.5164, country: "United States" },
  { name: "Portland", state: "OR", latitude: 45.5152, longitude: -122.6784, country: "United States" },
  { name: "Las Vegas", state: "NV", latitude: 36.1699, longitude: -115.1398, country: "United States" },
  { name: "Memphis", state: "TN", latitude: 35.1495, longitude: -90.049, country: "United States" },
  { name: "Louisville", state: "KY", latitude: 38.2527, longitude: -85.7585, country: "United States" },
  { name: "Baltimore", state: "MD", latitude: 39.2904, longitude: -76.6122, country: "United States" },
  { name: "Milwaukee", state: "WI", latitude: 43.0389, longitude: -87.9065, country: "United States" },
  { name: "Albuquerque", state: "NM", latitude: 35.0844, longitude: -106.6504, country: "United States" },
  { name: "Tucson", state: "AZ", latitude: 32.2226, longitude: -110.9747, country: "United States" },
  { name: "Fresno", state: "CA", latitude: 36.7378, longitude: -119.7871, country: "United States" },
  { name: "Sacramento", state: "CA", latitude: 38.5816, longitude: -121.4944, country: "United States" },
  { name: "Long Beach", state: "CA", latitude: 33.7701, longitude: -118.1937, country: "United States" },
  { name: "Kansas City", state: "MO", latitude: 39.0997, longitude: -94.5786, country: "United States" },
  { name: "Mesa", state: "AZ", latitude: 33.4152, longitude: -111.831, country: "United States" },
  { name: "Virginia Beach", state: "VA", latitude: 36.8529, longitude: -75.978, country: "United States" },
  { name: "Atlanta", state: "GA", latitude: 33.749, longitude: -84.388, country: "United States" },
  { name: "New Orleans", state: "LA", latitude: 29.9511, longitude: -90.2623, country: "United States" },
  { name: "Cleveland", state: "OH", latitude: 41.4993, longitude: -81.6944, country: "United States" },
  { name: "Wichita", state: "KS", latitude: 37.6872, longitude: -97.3301, country: "United States" },
  { name: "Arlington", state: "TX", latitude: 32.7357, longitude: -97.2247, country: "United States" },
  { name: "New York", state: "NY", latitude: 40.7128, longitude: -74.006, country: "United States" },
  { name: "Bakersfield", state: "CA", latitude: 35.3733, longitude: -119.0187, country: "United States" },
  { name: "Tampa", state: "FL", latitude: 27.9506, longitude: -82.4572, country: "United States" },
  { name: "Aurora", state: "CO", latitude: 39.7294, longitude: -104.8202, country: "United States" },
  { name: "Huntsville", state: "AL", latitude: 34.7304, longitude: -86.5861, country: "United States" },
  { name: "Gadsden", state: "AL", latitude: 34.0063, longitude: -86.0025, country: "United States" },
  { name: "Anniston", state: "AL", latitude: 33.7298, longitude: -85.8349, country: "United States" },
  { name: "Miami", state: "FL", latitude: 25.7617, longitude: -80.1918, country: "United States" },
  { name: "Orlando", state: "FL", latitude: 28.5421, longitude: -81.3723, country: "United States" },
  { name: "Fort Lauderdale", state: "FL", latitude: 26.1224, longitude: -80.1373, country: "United States" },
  { name: "Winston-Salem", state: "NC", latitude: 36.1095, longitude: -80.2541, country: "United States" },
  { name: "San Juan", state: "PR", latitude: 18.4655, longitude: -66.1057, country: "United States" },
  { name: "Jersey City", state: "NJ", latitude: 40.7178, longitude: -74.0431, country: "United States" },
  { name: "Chula Vista", state: "CA", latitude: 32.6401, longitude: -117.0842, country: "United States" },
  { name: "Laredo", state: "TX", latitude: 27.5306, longitude: -99.5901, country: "United States" },
  { name: "Plano", state: "TX", latitude: 33.0198, longitude: -96.6989, country: "United States" },
  { name: "Irvine", state: "CA", latitude: 33.6846, longitude: -117.8265, country: "United States" },
  { name: "Lexington", state: "KY", latitude: 38.0297, longitude: -84.4745, country: "United States" },
  { name: "Chandler", state: "AZ", latitude: 33.3062, longitude: -111.8413, country: "United States" },
  { name: "Stockton", state: "CA", latitude: 37.9577, longitude: -121.2908, country: "United States" },
  { name: "Gilbert", state: "AZ", latitude: 33.3528, longitude: -111.7890, country: "United States" },
  { name: "St. Paul", state: "MN", latitude: 44.9537, longitude: -93.0900, country: "United States" },
  { name: "Minneapolis", state: "MN", latitude: 44.9778, longitude: -93.2650, country: "United States" },
  { name: "Corpus Christi", state: "TX", latitude: 27.5701, longitude: -97.3964, country: "United States" },
  { name: "Henderson", state: "NV", latitude: 36.0395, longitude: -115.0585, country: "United States" },
  { name: "Riverside", state: "CA", latitude: 33.9425, longitude: -117.3550, country: "United States" },
  { name: "Baton Rouge", state: "LA", latitude: 30.4515, longitude: -91.1871, country: "United States" },
  { name: "Santa Ana", state: "CA", latitude: 33.7455, longitude: -117.8677, country: "United States" },
  { name: "Pittsburgh", state: "PA", latitude: 40.4406, longitude: -79.9959, country: "United States" },
  { name: "Anaheim", state: "CA", latitude: 33.8353, longitude: -117.9145, country: "United States" },
  { name: "Garland", state: "TX", latitude: 32.9127, longitude: -96.6387, country: "United States" },
  { name: "Tampa Bay", state: "FL", latitude: 27.9956, longitude: -82.6697, country: "United States" },
  { name: "Modesto", state: "CA", latitude: 37.6687, longitude: -120.9962, country: "United States" },
  { name: "Saint Paul", state: "MN", latitude: 44.9537, longitude: -93.0900, country: "United States" },
  { name: "Glendale", state: "AZ", latitude: 33.6387, longitude: -112.1860, country: "United States" },
  { name: "Arlington", state: "VA", latitude: 38.8816, longitude: -77.1043, country: "United States" },
  { name: "Buffalo", state: "NY", latitude: 42.8864, longitude: -78.8784, country: "United States" },
  { name: "Spokane", state: "WA", latitude: 47.6587, longitude: -117.4260, country: "United States" },
  { name: "Fontana", state: "CA", latitude: 34.0922, longitude: -117.4350, country: "United States" },
  { name: "Oakland", state: "CA", latitude: 37.8044, longitude: -122.2712, country: "United States" },
  { name: "Tulsa", state: "OK", latitude: 36.1539, longitude: -95.9928, country: "United States" },
  { name: "Portland", state: "ME", latitude: 43.6629, longitude: -70.2553, country: "United States" },
  { name: "Fremont", state: "CA", latitude: 37.5485, longitude: -121.9886, country: "United States" },
  { name: "Moreno Valley", state: "CA", latitude: 33.7318, longitude: -117.2311, country: "United States" },
  { name: "Scottsdale", state: "AZ", latitude: 33.4942, longitude: -111.9261, country: "United States" },
  { name: "Irving", state: "TX", latitude: 32.8343, longitude: -96.6699, country: "United States" },
  { name: "North Las Vegas", state: "NV", latitude: 36.1992, longitude: -115.1179, country: "United States" },
  { name: "Brownsville", state: "TX", latitude: 25.9017, longitude: -97.4975, country: "United States" },
  { name: "Akron", state: "OH", latitude: 41.0814, longitude: -81.5186, country: "United States" },
  { name: "Garland", state: "TX", latitude: 32.9127, longitude: -96.6387, country: "United States" },
  { name: "Lubbock", state: "TX", latitude: 33.5779, longitude: -101.8552, country: "United States" },
  { name: "Santa Clara", state: "CA", latitude: 37.3540, longitude: -121.9552, country: "United States" },
];

export function fuzzySearch(query: string, cities: City[]): City[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();

  const scored = cities
    .map((city) => {
      const cityName = city.name.toLowerCase();
      const stateName = city.state.toLowerCase();
      const fullName = `${cityName}, ${stateName}`;

      let score = 0;

      // Exact match
      if (cityName === q || fullName === q) score = 1000;
      // Starts with
      else if (cityName.startsWith(q) || fullName.startsWith(q)) score = 100;
      // Contains
      else if (cityName.includes(q)) score = 50;
      else if (fullName.includes(q)) score = 25;
      // Fuzzy: count matching characters in order
      else {
        let cityIdx = 0;
        let matchCount = 0;
        for (let i = 0; i < q.length && cityIdx < cityName.length; i++) {
          const char = q[i];
          const found = cityName.indexOf(char, cityIdx);
          if (found !== -1) {
            matchCount++;
            cityIdx = found + 1;
          }
        }
        if (matchCount === q.length) score = matchCount * 5;
      }

      return { city, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ city }) => city);

  return scored;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestCity(
  lat: number,
  lon: number,
  radiusKm: number = 80
): City | null {
  let nearest: City | null = null;
  let minDistance = radiusKm;

  for (const city of US_CITIES) {
    const distance = haversineDistance(lat, lon, city.latitude, city.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}

export function citiesAsGeocodeResults(cities: City[]) {
  return cities.map((city, idx) => ({
    id: idx,
    name: city.name,
    admin1: city.state,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: "America/Chicago",
  }));
}
