import { NextResponse } from "next/server";

const dispatchUrlDefault = "http://localhost:3000/api/brain/dispatch";

export async function POST(req: Request) {
  try {
    const dispatchUrl = process.env.BRAIN_DISPATCH_URL || dispatchUrlDefault;
    const token = process.env.BRAIN_API_TOKEN || "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "BRAIN_API_TOKEN is not set" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Accept either gateway-shape ({target,payload}) or admin UI shape ({target,command,args,priority})
    const target = body?.target;
    const payload = body?.payload ?? {
      command: body?.command,
      args: body?.args,
      priority: body?.priority,
    };

    const upstream = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ target, payload }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, data },
      { status: upstream.ok ? 200 : upstream.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "dispatch proxy failed" },
      { status: 500 }
    );
  }
}
