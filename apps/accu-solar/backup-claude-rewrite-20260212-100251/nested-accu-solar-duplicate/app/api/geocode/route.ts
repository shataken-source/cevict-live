import { NextResponse } from "next/server";

export const runtime = "edge";

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
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Geocoding provider error (${res.status})` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
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

  const results: GeocodeResult[] = (data.results ?? []).map((r) => ({
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
