import { NextResponse } from "next/server";
import { fuzzySearch, citiesAsGeocodeResults, US_CITIES, findNearestCity } from "@/app/lib/cities";

type GeocodeResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing required query param: q" },
      { status: 400 },
    );
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  // Use proper URL encoding for spaces
  const encodedQ = encodeURIComponent(q);
  url.searchParams.set("name", encodedQ);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  
  // Apply US country bias for non-international queries
  const queryLower = q.toLowerCase();
  const internationalCountries = ["germany", "france", "uk", "united kingdom", "spain", "italy", "canada", "mexico", "australia"];
  const isInternational = internationalCountries.some(country => queryLower === country || queryLower.startsWith(country + ","));
  if (!isInternational) {
    url.searchParams.set("country", "US");
  }

  console.log(`[geocode] Full URL: ${url.toString()}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url.toString(), {
        headers: { 
          accept: "application/json",
          'User-Agent': 'Accu-Solar-Command/1.0'
        },
        signal: controller.signal,
      });

      console.log(`[geocode] Response status: ${res.status}`);
      const responseText = await res.text();
      console.log(`[geocode] Raw response body: ${responseText}`);
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = JSON.parse(responseText) as {
          results?: Array<{
            id: number;
            name: string;
            latitude: number;
            longitude: number;
            country: string;
            admin1?: string;
            timezone?: string;
          }>;
        };

        console.log(`[geocode] Parsed data:`, JSON.stringify(data, null, 2));
        console.log(`[geocode] Results count: ${data.results?.length ?? 0}`);

        // If API returned results, use them
        if (data.results && data.results.length > 0) {
          const results: GeocodeResult[] = data.results.map((r) => ({
            id: r.id,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            country: r.country,
            admin1: r.admin1,
            timezone: r.timezone,
          }));

          return NextResponse.json({ results }, { status: 200 });
        }

        // API returned 200 but no results - try Nominatim before city database
        console.warn(`[geocode] Open-Meteo returned no results for "${q}" - trying Nominatim`);
        let nominatimResults = await fetchFromNominatim(q);
        if (nominatimResults.length > 0) {
          return NextResponse.json({ results: nominatimResults }, { status: 200 });
        }

        // Nominatim also failed - try city database
        console.warn(`[geocode] Nominatim also returned no results for "${q}" - using city database`);
        const fallbackResults = fuzzySearch(q, US_CITIES);
        if (fallbackResults.length > 0) {
          const results = citiesAsGeocodeResults(fallbackResults);
          return NextResponse.json({ results }, { status: 200 });
        }

        // Last resort: extract city name and try partial search
        console.warn(`[geocode] City database returned no results for "${q}" - trying partial match`);
        const cityOnly = q.split(',')[0].trim();
        if (cityOnly !== q) {
          const partialResults = fuzzySearch(cityOnly, US_CITIES);
          if (partialResults.length > 0) {
            console.log(`[geocode] Found results with partial city name: "${cityOnly}"`);
            const results = citiesAsGeocodeResults(partialResults);
            return NextResponse.json({ results }, { status: 200 });
          }
        }

        // Absolute last resort: return nearest major cities to help user
        console.warn(`[geocode] No matches found for "${q}" - returning top major cities as suggestions`);
        const topCities = US_CITIES.slice(0, 5);
        const results = citiesAsGeocodeResults(topCities);
        return NextResponse.json({ results }, { status: 200 });
      }

      // API error - try Nominatim fallback
      console.warn(`[geocode] API error (${res.status}) for "${q}" - trying Nominatim`);
      const nominatimResults = await fetchFromNominatim(q);
      if (nominatimResults.length > 0) {
        return NextResponse.json({ results: nominatimResults }, { status: 200 });
      }

      // Nominatim failed - use city database
      console.warn(`[geocode] Nominatim failed for "${q}" - using city database`);
      const fallbackResults = fuzzySearch(q, US_CITIES);
      const results = citiesAsGeocodeResults(fallbackResults);
      return NextResponse.json({ results }, { status: 200 });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[geocode] Request timeout (10s) for "${q}" - trying Nominatim`);
        const nominatimResults = await fetchFromNominatim(q);
        if (nominatimResults.length > 0) {
          return NextResponse.json({ results: nominatimResults }, { status: 200 });
        }
        const fallbackResults = fuzzySearch(q, US_CITIES);
        const results = citiesAsGeocodeResults(fallbackResults);
        return NextResponse.json({ results }, { status: 200 });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[geocode] Exception:`, error);
    // Last resort: try Nominatim, then city database
    try {
      const nominatimResults = await fetchFromNominatim(q);
      if (nominatimResults.length > 0) {
        return NextResponse.json({ results: nominatimResults }, { status: 200 });
      }
      const fallbackResults = fuzzySearch(q, US_CITIES);
      const results = citiesAsGeocodeResults(fallbackResults);
      return NextResponse.json({ results }, { status: 200 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
}

async function fetchFromNominatim(query: string): Promise<GeocodeResult[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "10");
    url.searchParams.set("countrycodes", "us");

    console.log(`[geocode:nominatim] Starting request for: "${query}"`);
    console.log(`[geocode:nominatim] URL: ${url.toString()}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Accu-Solar-Command/1.0 (OpenStreetMap Nominatim)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[geocode:nominatim] Response status: ${res.status}`);

      if (!res.ok) {
        console.error(`[geocode:nominatim] API error: ${res.status}`);
        return [];
      }

      const data = await res.json() as Array<{
        osm_id?: number;
        name?: string;
        lat?: string;
        lon?: string;
        address?: { country_code?: string; state?: string };
        display_name?: string;
      }>;

      console.log(`[geocode:nominatim] Response data:`, JSON.stringify(data, null, 2));

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[geocode:nominatim] No results returned`);
        return [];
      }

      console.log(`[geocode:nominatim] Found ${data.length} raw results`);

      let results: GeocodeResult[] = data
        .filter((r) => r.lat && r.lon && r.name)
        .map((r, idx) => ({
          id: r.osm_id || idx,
          name: r.name || "",
          latitude: parseFloat(r.lat || "0"),
          longitude: parseFloat(r.lon || "0"),
          country: "United States",
          admin1: r.address?.state,
          timezone: "America/Chicago",
        }));

      console.log(`[geocode:nominatim] After filtering: ${results.length} results`);

      // For each result, check if it's a major city; if not, find nearest
      const finalResults = results.map((result) => {
        const isMajorCity = US_CITIES.some(
          (c) =>
            Math.abs(c.latitude - result.latitude) < 0.05 &&
            Math.abs(c.longitude - result.longitude) < 0.05
        );

        if (!isMajorCity) {
          console.log(
            `[geocode:nominatim] "${result.name}" at (${result.latitude}, ${result.longitude}) is not a major city - finding nearest within 80km`
          );
          const nearest = findNearestCity(result.latitude, result.longitude, 80);
          if (nearest) {
            console.log(
              `[geocode:nominatim] → Found nearest major city: ${nearest.name}, ${nearest.state} at distance ~${Math.round(((Math.abs(nearest.latitude - result.latitude) + Math.abs(nearest.longitude - result.longitude)) * 111) / 2)}km`
            );
            return {
              id: Math.abs(nearest.latitude + nearest.longitude) * 1000,
              name: nearest.name,
              latitude: nearest.latitude,
              longitude: nearest.longitude,
              country: nearest.country,
              admin1: nearest.state,
              timezone: "America/Chicago",
            };
          } else {
            console.warn(`[geocode:nominatim] No major city found within 80km of "${result.name}"`);
          }
        } else {
          console.log(`[geocode:nominatim] "${result.name}" is a major city ✓`);
        }

        return result;
      });

      // Deduplicate results that point to the same city/coordinates
      const seen = new Set<string>();
      const deduped = finalResults.filter((r) => {
        const key = `${r.name}|${r.admin1 ?? ''}|${r.country}|${r.latitude.toFixed(
          3,
        )}|${r.longitude.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (deduped.length !== finalResults.length) {
        console.log(
          `[geocode:nominatim] Deduped results: ${finalResults.length} -> ${deduped.length}`,
        );
      }

      console.log(`[geocode:nominatim] Returning ${deduped.length} final results`);
      return deduped;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn(`[geocode:nominatim] Request timeout (8s)`);
      } else {
        console.warn(`[geocode:nominatim] Fetch error:`, fetchError.message);
      }
      return [];
    }
  } catch (error) {
    console.error(`[geocode:nominatim] Exception:`, error);
    return [];
  }
}
