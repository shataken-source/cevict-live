import { NextResponse } from "next/server";
import { getCursorStats } from "../../../cursor-effect";

export const runtime = 'nodejs';

export async function GET() {
  const stats = getCursorStats();
  return NextResponse.json(stats);
}


