import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

function safeDatePart(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = safeDatePart((searchParams.get("date") ?? "").trim());

  if (!date) {
    return NextResponse.json(
      { error: "Missing/invalid date. Expected YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const baseDir = path.resolve(process.cwd(), "..", "progno");
  const filePath = path.join(baseDir, `predictions-${date}.json`);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw) as unknown;
    return NextResponse.json({ source: filePath, data: json }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Failed to read Progno predictions for ${date}: ${e.message}`
            : `Failed to read Progno predictions for ${date}`,
      },
      { status: 404 },
    );
  }
}
