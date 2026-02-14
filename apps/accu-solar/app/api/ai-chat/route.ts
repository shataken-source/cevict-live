import { NextResponse, NextRequest } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabase-server";

export const runtime = "edge";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type UnknownRecord = Record<string, unknown>;
type OutputMode = "text" | "json";

// Simple in-memory rate limiter (per-user, per-hour)
// Note: In serverless/edge environments, this resets on each function cold start
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_HOUR = 50;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1, resetAt: now + WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - record.count, resetAt: record.resetAt };
}

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" ? v : undefined;
}

function hasAnthropic() {
  return Boolean(getEnv("ANTHROPIC_API_KEY"));
}

function hasOpenAI() {
  return Boolean(getEnv("OPENAI_API_KEY"));
}

function coerceMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: ChatMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const rec = m as UnknownRecord;
    const role = rec.role;
    const content = rec.content;
    if (
      (role === "user" || role === "assistant" || role === "system") &&
      typeof content === "string"
    ) {
      out.push({ role, content });
    }
  }
  return out.slice(-16);
}

async function callAnthropic(
  messages: ChatMessage[],
  context: string,
  mode: OutputMode,
) {
  const apiKey = getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const jsonSchemaV1 = `When mode is JSON, output MUST be a single JSON object matching this schema:
{
  "schema": "cevict.solar_copilot.v1",
  "mode": "quick_check" | "deep_optimization" | "upgrade_planner" | "installer_ready_summary",
  "title": string,
  "assumptions": string[],
  "missing_inputs": [{"key": string, "question": string, "priority": "high"|"medium"|"low"}],
  "red_flags": [{"severity":"info"|"warning"|"critical","title":string,"detail":string,"why_it_matters":string,"needed_to_confirm"?:string[]}],
  "computed": {
    "estimated_daily_kwh"?: {"summer"?: number, "winter"?: number, "shoulder"?: number},
    "system_voltage_hint"?: "12V"|"24V"|"48V"|"unknown",
    "pv_string_check"?: {"notes": string[], "risks": string[]}
  },
  "recommendations": [{"category":"wiring"|"sizing"|"safety"|"tilt_azimuth"|"shading"|"operations"|"monitoring","title":string,"steps":string[],"expected_impact":"low"|"medium"|"high","confidence":"low"|"medium"|"high","cost_hint"?: "low"|"medium"|"high"}],
  "upgrade_path": [{"phase": number, "title": string, "description": string, "roi_rank": number, "prerequisites": string[]}],
  "installer_ready_summary": {"bill_of_materials": string[], "notes": string[], "open_questions": string[]}
}
Rules:
- JSON only, no markdown, no extra keys, no trailing comments.
- Use numbers only when confidently computed; otherwise omit or put assumptions in assumptions/missing_inputs.
- Always include empty arrays/objects where required by schema.`;

  const system = `You are a Solar Systems Optimization AI embedded inside a consumer solar design application.

Your role is to act as a hybrid of:
- a licensed solar installer,
- an electrical engineer,
- a performance optimization consultant,
- and a proactive upgrade advisor.

Your primary objective is to help users configure, validate, and optimize their solar power systems for maximum safety, efficiency, and long-term performance based on their current equipment, environment, and goals.

Core responsibilities:
1) System ingestion: if required specs are missing (panel Voc/Isc/Vmp/Imp, controller/inverter limits, battery voltage/chemistry/BMS limits, wiring topology, location/shading, loads), ask targeted questions. Do not guess manufacturer limits.
2) Performance analysis: evaluate string voltage vs limits, controller sizing, inverter headroom, seasonal production estimates and losses.
3) Optimization: provide actionable wiring/config changes, tilt/azimuth guidance, shading mitigation, fuse/breaker/wire gauge high-level guidance, and ROI-ranked upgrade paths.
4) Safety rules: prioritize safety. Do not provide unsafe instructions. Do not override manufacturer limits.
5) Output modes: Quick Check, Deep Optimization, Upgrade Planner, Installer-Ready Summary.

Output mode: ${mode.toUpperCase()}
If mode is JSON, respond with a single JSON object only (no markdown). Otherwise respond in concise plain text.

${mode === "json" ? jsonSchemaV1 : ""}

Use the provided context. Flag assumptions explicitly.`;

  const body = {
    model: getEnv("ANTHROPIC_MODEL") ?? "claude-3-7-sonnet-latest",
    max_tokens: 400,
    system,
    messages: [
      {
        role: "user",
        content: `Context:\n${context}\n\nConversation:\n${messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")}\n\nReply:`,
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Anthropic error (${res.status})${text ? ` — ${text}` : ""}`,
    );
  }

  const data = (await res.json()) as unknown;
  const rec = (data && typeof data === "object" ? (data as UnknownRecord) : {}) as
    | UnknownRecord
    | undefined;
  const contentArr = Array.isArray(rec?.content) ? (rec?.content as unknown[]) : [];
  const parts = contentArr
    .map((p) => (p && typeof p === "object" ? (p as UnknownRecord) : null))
    .filter(Boolean) as UnknownRecord[];
  const text = parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n")
    .trim();

  return text || "I couldn't generate a response.";
}

async function callOpenAI(messages: ChatMessage[], context: string, mode: OutputMode) {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = getEnv("OPENAI_MODEL") ?? "gpt-4.1-mini";
  const jsonSchemaV1 =
    "When mode is JSON, output MUST be a single JSON object matching this schema:\n" +
    "{\n" +
    '  "schema": "cevict.solar_copilot.v1",\n' +
    '  "mode": "quick_check" | "deep_optimization" | "upgrade_planner" | "installer_ready_summary",\n' +
    '  "title": string,\n' +
    '  "assumptions": string[],\n' +
    '  "missing_inputs": [{"key": string, "question": string, "priority": "high"|"medium"|"low"}],\n' +
    '  "red_flags": [{"severity":"info"|"warning"|"critical","title":string,"detail":string,"why_it_matters":string,"needed_to_confirm"?:string[]}],\n' +
    '  "computed": {\n' +
    '    "estimated_daily_kwh"?: {"summer"?: number, "winter"?: number, "shoulder"?: number},\n' +
    '    "system_voltage_hint"?: "12V"|"24V"|"48V"|"unknown",\n' +
    '    "pv_string_check"?: {"notes": string[], "risks": string[]}\n' +
    "  },\n" +
    '  "recommendations": [{"category":"wiring"|"sizing"|"safety"|"tilt_azimuth"|"shading"|"operations"|"monitoring","title":string,"steps":string[],"expected_impact":"low"|"medium"|"high","confidence":"low"|"medium"|"high","cost_hint"?: "low"|"medium"|"high"}],\n' +
    '  "upgrade_path": [{"phase": number, "title": string, "description": string, "roi_rank": number, "prerequisites": string[]}],\n' +
    '  "installer_ready_summary": {"bill_of_materials": string[], "notes": string[], "open_questions": string[]}\n' +
    "}\n" +
    "Rules:\n" +
    "- JSON only, no markdown, no extra keys, no trailing comments.\n" +
    "- Use numbers only when confidently computed; otherwise omit or put assumptions in assumptions/missing_inputs.\n" +
    "- Always include empty arrays/objects where required by schema.";
  const body = {
    model,
    temperature: 0.3,
    max_output_tokens: 450,
    input: [
      {
        role: "system",
        content:
          `You are a Solar Systems Optimization AI embedded inside a consumer solar design application.
Prioritize safety. Do not invent equipment limits; ask for missing specs.
Support modes: Quick Check, Deep Optimization, Upgrade Planner, Installer-Ready Summary.
Output mode: ${mode.toUpperCase()}. If JSON, output a single JSON object only (no markdown).

${mode === "json" ? jsonSchemaV1 : ""}`,
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nConversation:\n${messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")}\n\nReply:`,
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status})${text ? ` — ${text}` : ""}`);
  }

  const data = (await res.json()) as unknown;
  const rec = data && typeof data === "object" ? (data as UnknownRecord) : {};
  const out = typeof rec.output_text === "string" ? rec.output_text : "";
  return out.trim() || "I couldn't generate a response.";
}

/**
 * POST /api/ai-chat
 *
 * Solar AI Copilot - Professional tier only.
 * Requires Authorization: Bearer <token>
 *
 * Returns 401 if not authenticated.
 * Returns 403 if tier is Basic (AI requires Professional).
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check subscription tier
  const supabase = getSupabaseServerClient();
  const { data: subscription, error: subError } = await supabase
    .from("accu_solar_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .single();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: "User subscription not found" },
      { status: 404 }
    );
  }

  const tier = subscription.tier as string;
  if (tier !== "professional") {
    return NextResponse.json(
      {
        error: "AI chat requires Professional tier",
        tier,
        upgrade_url: "/pricing",
      },
      { status: 403 }
    );
  }

  // Rate limit check
  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        limit: MAX_REQUESTS_PER_HOUR,
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as UnknownRecord) : {};
  const messages = coerceMessages(rec.messages);
  const context = typeof rec.context === "string" ? rec.context : "";
  const mode: OutputMode = rec.mode === "json" ? "json" : "text";

  if (!messages.length) {
    return NextResponse.json(
      { error: "Missing messages[] in body" },
      { status: 400 },
    );
  }

  try {
    if (hasAnthropic()) {
      const text = await callAnthropic(messages, context, mode);
      return NextResponse.json(
        {
          text,
          provider: "anthropic",
          model: getEnv("ANTHROPIC_MODEL") ?? "claude-3-7-sonnet-latest",
          mode,
        },
        { status: 200 },
      );
    }

    if (hasOpenAI()) {
      const text = await callOpenAI(messages, context, mode);
      return NextResponse.json(
        {
          text,
          provider: "openai",
          model: getEnv("OPENAI_MODEL") ?? "gpt-4.1-mini",
          mode,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error:
          "No LLM configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI chat.",
      },
      { status: 501 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI provider failure" },
      { status: 502 },
    );
  }
}
