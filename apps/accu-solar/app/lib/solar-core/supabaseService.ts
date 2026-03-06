import { createClient } from "@supabase/supabase-js";
import type { ScenarioResults } from "./scenarioCalculator";
import type { Telemetry } from "@/app/lib/telemetry-types";

// Supabase client is lazy-initialized only when needed
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const url = "https://rdbuwyefbgnbuhmjrizo.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!key) {
      console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY not set - Supabase operations will fail");
      throw new Error("Supabase key not configured");
    }

    supabase = createClient(url, key);
  }

  return supabase;
}

// ============================================================================
// TELEMETRY HISTORY SERVICE
// ============================================================================

export interface TelemetryHistoryRecord extends Telemetry {
  efficiencyPct?: number;
  cloudCoverPct?: number;
  irradianceWm2?: number;
}

export async function ingestTelemetryHistory(
  userId: string,
  siteId: string,
  telemetry: Telemetry,
  tier: "basic" | "pro" = "basic",
  weatherData?: {
    cloudCoverPct: number;
    temperatureC: number;
    irradianceWm2: number;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const record = {
      user_id: userId,
      site_id: siteId,
      measurement_time: telemetry.ts,
      solar_w: telemetry.solar_w,
      load_w: telemetry.load_w,
      grid_w: telemetry.grid_w,
      battery_soc_pct: telemetry.battery_soc_pct,
      battery_v: telemetry.battery_v,
      battery_a: telemetry.battery_a,
      battery_temp_c: telemetry.battery_temp_c,
      cloud_cover_pct: weatherData?.cloudCoverPct || null,
      temperature_c: weatherData?.temperatureC || null,
      irradiance_w_m2: weatherData?.irradianceWm2 || null,
      tier,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("telemetry_history").insert([record] as any);

    if (error) {
      console.error("Failed to ingest telemetry:", error);
    }
  } catch (err) {
    console.error("Telemetry ingest error:", err);
  }
}

// ============================================================================
// SCENARIO STORAGE SERVICE
// ============================================================================

export interface ScenarioRecord {
  id?: string;
  userId: string;
  siteId: string;
  name: string;
  description?: string;
  baseConfig: Record<string, any>;
  proposedConfig: Record<string, any>;
  results: ScenarioResults;
  createdAt?: string;
  updatedAt?: string;
}

export async function saveScenario(scenario: ScenarioRecord): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("scenarios")
      .insert([
        {
          user_id: scenario.userId,
          site_id: scenario.siteId,
          name: scenario.name,
          description: scenario.description,
          base_config: scenario.baseConfig,
          proposed_config: scenario.proposedConfig,
          results: scenario.results,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as any)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save scenario:", error);
      return null;
    }

    return (data as any)?.id || null;
  } catch (err) {
    console.error("Scenario save error:", err);
    return null;
  }
}

export async function getScenarios(
  userId: string,
  siteId: string
): Promise<ScenarioRecord[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("scenarios")
      .select("*")
      .eq("user_id", userId)
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch scenarios:", error);
      return [];
    }

    return data?.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      siteId: row.site_id,
      name: row.name,
      description: row.description,
      baseConfig: row.base_config,
      proposedConfig: row.proposed_config,
      results: row.results,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) || [];
  } catch (err) {
    console.error("Scenario fetch error:", err);
    return [];
  }
}

// ============================================================================
// PDF REPORT STORAGE SERVICE
// ============================================================================

export async function savePDFReport(
  userId: string,
  siteId: string,
  fileName: string,
  fileBuffer: Buffer,
  reportType: "current_system" | "scenario_comparison" | "annual_report",
  scenarioId?: string
): Promise<{ url: string; id: string } | null> {
  try {
    const supabase = getSupabaseClient();
    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `reports/${userId}/${siteId}/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from("solar-reports")
      .upload(filePath, fileBuffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return null;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("solar-reports")
      .getPublicUrl(filePath);

    const fileUrl = publicData.publicUrl;

    // Record in database
    const { data: dbData, error: dbError } = await supabase
      .from("pdf_reports")
      .insert([
        {
          user_id: userId,
          site_id: siteId,
          scenario_id: scenarioId,
          report_type: reportType,
          file_name: fileName,
          file_url: fileUrl,
          created_at: new Date().toISOString(),
        },
      ] as any)
      .select("id")
      .single();

    if (dbError) {
      console.error("PDF record save error:", dbError);
      return null;
    }

    return {
      url: fileUrl,
      id: (dbData as any)?.id || "",
    };
  } catch (err) {
    console.error("PDF save error:", err);
    return null;
  }
}

// ============================================================================
// RECOMMENDATION STORAGE SERVICE
// ============================================================================

export interface RecommendationRecord {
  userId: string;
  siteId: string;
  type: string;
  title: string;
  description: string;
  estimatedCost: number;
  annualSavings: number;
  paybackYears: number;
  twentyYearRoi: number;
  confidenceScore: number;
  priority: number;
}

export async function saveRecommendation(
  rec: RecommendationRecord
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("recommendations")
      .insert([
        {
          user_id: rec.userId,
          site_id: rec.siteId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          estimated_cost: rec.estimatedCost,
          annual_savings: rec.annualSavings,
          payback_years: rec.paybackYears,
          twenty_year_roi: rec.twentyYearRoi,
          confidence_score: rec.confidenceScore,
          priority: rec.priority,
          created_at: new Date().toISOString(),
        },
      ] as any)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save recommendation:", error);
      return null;
    }

    return (data as any)?.id || null;
  } catch (err) {
    console.error("Recommendation save error:", err);
    return null;
  }
}

export async function getActiveRecommendations(
  userId: string,
  siteId: string
): Promise<RecommendationRecord[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", userId)
      .eq("site_id", siteId)
      .is("dismissed_at", null)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Failed to fetch recommendations:", error);
      return [];
    }

    return data?.map((row: any) => ({
      userId: row.user_id,
      siteId: row.site_id,
      type: row.type,
      title: row.title,
      description: row.description,
      estimatedCost: row.estimated_cost,
      annualSavings: row.annual_savings,
      paybackYears: row.payback_years,
      twentyYearRoi: row.twenty_year_roi,
      confidenceScore: row.confidence_score,
      priority: row.priority,
    })) || [];
  } catch (err) {
    console.error("Recommendation fetch error:", err);
    return [];
  }
}

// ============================================================================
// DATA RETENTION & CLEANUP
// ============================================================================

export async function deleteOldTelemetryHistory(
  userTier: "basic" | "pro",
  now: Date = new Date()
) {
  try {
    const supabase = getSupabaseClient();
    const retentionDays = userTier === "basic" ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from("telemetry_history")
      .delete()
      .eq("tier", userTier)
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error(`Failed to delete ${userTier} telemetry:`, error);
    }
  } catch (err) {
    console.error("Telemetry cleanup error:", err);
  }
}

export async function getTelemetryHistorySummary(
  userId: string,
  siteId: string,
  days: number = 30
): Promise<{
  totalRecords: number;
  avgProduction: number;
  peakProduction: number;
  minProduction: number;
} | null> {
  try {
    const supabase = getSupabaseClient();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("telemetry_history")
      .select("solar_w")
      .eq("user_id", userId)
      .eq("site_id", siteId)
      .gte("measurement_time", cutoffDate.toISOString())
      .order("measurement_time", { ascending: false });

    if (error || !data || data.length === 0) {
      return null;
    }

    const productions = data.map((r: any) => r.solar_w || 0);
    const totalRecords = productions.length;
    const avgProduction = productions.reduce((a, b) => a + b, 0) / totalRecords;
    const peakProduction = Math.max(...productions);
    const minProduction = Math.min(...productions);

    return {
      totalRecords,
      avgProduction: Math.round(avgProduction),
      peakProduction: Math.round(peakProduction),
      minProduction: Math.round(minProduction),
    };
  } catch (err) {
    console.error("Telemetry summary error:", err);
    return null;
  }
}
