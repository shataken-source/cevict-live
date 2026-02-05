import { NextResponse } from "next/server";
import { predictionTracker } from "../../../prediction-tracker";

export async function GET() {
  const csv = predictionTracker.exportToCSV();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="progno-predictions.csv"`
    }
  });
}


