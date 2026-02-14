import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  void request;
  return NextResponse.json(
    {
      error:
        "Datasource API disabled until auth is implemented. Do not pass userId from client.",
    },
    { status: 501 },
  );
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error:
        "Datasource API disabled until auth is implemented. Do not pass userId from client.",
    },
    { status: 501 },
  );
}

/*
Security note:
We previously accepted userId from query/body, which allows unauthorized reads/writes unless
strong auth + RLS is enforced. Re-enable only after wiring real authentication and using the
authenticated user identity server-side.
*/

/*
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("userId") ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("accu_solar_datasources")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ datasources: (data ?? []) as DatasourceRow[] }, { status: 200 });
}

export async function POST(request: Request) {
  let body: CreateBody | undefined;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const name = (body.name ?? "").trim();
  const type = body.type ?? "demo";
  const config = body.config ?? {};

  if (!userId || !name) {
    return NextResponse.json({ error: "Missing userId or name" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("accu_solar_datasources")
    .upsert(
      { user_id: userId, name, type, config },
      { onConflict: "user_id,name" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ datasource: data as DatasourceRow }, { status: 200 });
}
*/
