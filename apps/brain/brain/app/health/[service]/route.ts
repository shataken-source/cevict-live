import { NextResponse } from "next/server";
import { brainConfig } from "../../../src";

export async function GET(_req: Request, ctx: { params: Promise<{ service: string }> }) {
  const { service } = await ctx.params;

  if (!service) {
    return NextResponse.json({ status: "error", error: "Missing service" }, { status: 400 });
  }

  const url = (brainConfig as any)?.healthChecks?.[service];
  if (!url) {
    return NextResponse.json(
      { status: "error", service, error: `Unknown service: ${service}` },
      { status: 404 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), brainConfig.healthTimeoutMs);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    const data = await resp.json().catch(() => ({}));

    if (resp.ok && data?.status === "ok") {
      return NextResponse.json({ ...data, service });
    }

    return NextResponse.json(
      {
        status: "error",
        service,
        upstreamStatus: resp.status,
        upstream: data,
      },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", service, error: err?.message || "health proxy failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
