import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * NOAA NWS API (api.weather.gov) — US only.
 * Uses /points/{lat},{lon} then gridpoint data for forecast layers.
 * See: https://weather-gov.github.io/api/gridpoints
 *
 * Query: ?lat=28.0&lon=-82.5
 * Returns: alerts (active), gridpoint layers (temperature, skyCover, windSpeed, etc.)
 */

const USER_AGENT =
  process.env.NOAA_USER_AGENT ?? "AccuSolar/1.0 (solar app; https://github.com/cevict/cevict-live)";

function parseNumber(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

type NwsPointsResponse = {
  properties?: {
    forecastGridData?: string;
    gridId?: string;
    gridX?: number;
    gridY?: number;
    forecastOffice?: string;
  };
};

type NwsGridpointLayer = {
  uom?: string;
  values?: Array<{ validTime: string; value: number | null }>;
};

type NwsGridpointResponse = {
  properties?: Record<string, NwsGridpointLayer>;
  updateTime?: string;
};

type NwsAlertFeature = {
  properties?: {
    event?: string;
    severity?: string;
    headline?: string;
    description?: string;
    onset?: string;
    expires?: string;
  };
};

type NwsAlertsResponse = {
  features?: NwsAlertFeature[];
};

function extractTimeSeries(
  layer: NwsGridpointLayer | undefined,
  maxHours = 48,
): Array<{ validTime: string; value: number | null }> {
  if (!layer?.values?.length) return [];
  return layer.values.slice(0, maxHours);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get("lat"));
  const lon = parseNumber(searchParams.get("lon"));

  if (lat == null || lon == null) {
    return NextResponse.json(
      { error: "Missing or invalid query params: lat, lon (required)" },
      { status: 400 },
    );
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  try {
    const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
    const pointsRes = await fetch(pointsUrl, { headers });
    if (!pointsRes.ok) {
      const text = await pointsRes.text().slice(0, 200);
      return NextResponse.json(
        { error: `NOAA points error: ${pointsRes.status}`, detail: text },
        { status: 502 },
      );
    }

    const points = (await pointsRes.json()) as NwsPointsResponse;
    const gridDataUrl = points.properties?.forecastGridData;
    if (!gridDataUrl) {
      return NextResponse.json(
        { error: "NOAA points response missing forecastGridData" },
        { status: 502 },
      );
    }

    const [gridRes, alertsRes] = await Promise.all([
      fetch(gridDataUrl, { headers }),
      fetch(
        `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
        { headers },
      ),
    ]);

    if (!gridRes.ok) {
      return NextResponse.json(
        { error: `NOAA gridpoints error: ${gridRes.status}` },
        { status: 502 },
      );
    }

    const grid = (await gridRes.json()) as NwsGridpointResponse;
    const alertsJson = (await alertsRes.json()) as NwsAlertsResponse;
    const alerts = (alertsJson.features ?? []).map((f) => ({
      event: f.properties?.event ?? "",
      severity: f.properties?.severity ?? "Unknown",
      headline: f.properties?.headline ?? "",
      onset: f.properties?.onset ?? null,
      expires: f.properties?.expires ?? null,
    }));

    const props = grid.properties ?? {};
    const temperature = extractTimeSeries(props.temperature);
    const skyCover = extractTimeSeries(props.skyCover);
    const windSpeed = extractTimeSeries(props.windSpeed);
    const windGust = extractTimeSeries(props.windGust);
    const probabilityOfPrecipitation = extractTimeSeries(
      props.probabilityOfPrecipitation,
    );
    const quantitativePrecipitation = extractTimeSeries(
      props.quantitativePrecipitation,
    );
    const maxTemperature = extractTimeSeries(props.maxTemperature, 168);
    const minTemperature = extractTimeSeries(props.minTemperature, 168);

    const payload = {
      provider: "noaa-nws" as const,
      updateTime: grid.updateTime ?? null,
      gridId: points.properties?.gridId ?? null,
      forecastOffice: points.properties?.forecastOffice ?? null,
      alerts,
      layers: {
        temperature,
        skyCover,
        windSpeed,
        windGust,
        probabilityOfPrecipitation,
        quantitativePrecipitation,
        maxTemperature,
        minTemperature,
      },
      // Solar-relevant summary for current hour if available
      current: {
        temperature: temperature[0]?.value ?? null,
        skyCover: skyCover[0]?.value ?? null,
        windSpeed: windSpeed[0]?.value ?? null,
        windGust: windGust[0]?.value ?? null,
        pop: probabilityOfPrecipitation[0]?.value ?? null,
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "NOAA request failed", detail: message },
      { status: 502 },
    );
  }
}
