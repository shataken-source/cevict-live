"use server"

import { supabase } from "@/lib/supabase/server"

export interface Signal {
  id: string
  market_id: string
  market: string
  platform: "Kalshi" | "Polymarket" | "Sportsbook"
  direction: "YES" | "NO"
  market_prob: number
  model_prob: number
  edge: number
  confidence: "LOW" | "MEDIUM" | "HIGH"
  liquidity: string
  timeframe: string
  status: "active" | "expired" | "resolved"
  released_at: string
  audit_hash: string
}

export interface Market {
  id: string
  name: string
  platform: "Kalshi" | "Polymarket"
  category: string
  volume: string
  yes_price: number
  no_price: number
  implied_yes: number
  implied_no: number
  volume_24h: string
  expires_at: string
  status: "active" | "closed" | "resolved"
  has_signal: boolean
}

export async function getSignals(filters?: {
  platform?: string
  confidence?: string[]
  minEdge?: number
  status?: string
  limit?: number
}): Promise<{ signals: Signal[]; error?: string }> {
  try {
    let query = supabase
      .from("signals")
      .select("*")
      .order("released_at", { ascending: false })

    if (filters?.platform && filters.platform !== "all") {
      query = query.eq("platform", filters.platform)
    }

    if (filters?.confidence && filters.confidence.length > 0) {
      query = query.in("confidence", filters.confidence)
    }

    if (filters?.minEdge && filters.minEdge > 0) {
      query = query.gte("edge", filters.minEdge)
    }

    if (filters?.status) {
      query = query.eq("status", filters.status)
    } else {
      query = query.eq("status", "active")
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(50)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching signals:", error)
      return { signals: [], error: error.message }
    }

    return { signals: data as Signal[] }
  } catch (err) {
    console.error("Failed to fetch signals:", err)
    return { signals: [], error: "Failed to fetch signals" }
  }
}

export async function getMarkets(filters?: {
  platform?: string
  category?: string
  search?: string
  limit?: number
}): Promise<{ markets: Market[]; error?: string }> {
  try {
    let query = supabase
      .from("markets")
      .select("*")
      .eq("status", "active")
      .order("volume", { ascending: false })

    if (filters?.platform && filters.platform !== "all") {
      query = query.eq("platform", filters.platform)
    }

    if (filters?.category && filters.category !== "all") {
      query = query.eq("category", filters.category)
    }

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(100)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching markets:", error)
      return { markets: [], error: error.message }
    }

    return { markets: data as Market[] }
  } catch (err) {
    console.error("Failed to fetch markets:", err)
    return { markets: [], error: "Failed to fetch markets" }
  }
}

export async function getDashboardStats(): Promise<{
  stats: {
    winRate: number
    activeEdges: number
    avgEV: number
    arbOpportunities: number
    signalsToday: number
  }
  error?: string
}> {
  try {
    // Get signals from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: signalsToday, error: todayError } = await supabase
      .from("signals")
      .select("id")
      .gte("released_at", today.toISOString())
      .eq("status", "active")

    if (todayError) {
      console.error("Error fetching today's signals:", todayError)
    }

    // Get active edges count
    const { data: activeEdges, error: edgesError } = await supabase
      .from("signals")
      .select("id")
      .eq("status", "active")
      .gt("edge", 0)

    if (edgesError) {
      console.error("Error fetching active edges:", edgesError)
    }

    // Get high confidence signals
    const { data: highConfidence, error: confidenceError } = await supabase
      .from("signals")
      .select("edge")
      .eq("status", "active")
      .eq("confidence", "HIGH")

    if (confidenceError) {
      console.error("Error fetching high confidence signals:", confidenceError)
    }

    // Calculate average EV from high confidence signals
    const avgEV = highConfidence && highConfidence.length > 0
      ? highConfidence.reduce((sum, s) => sum + s.edge, 0) / highConfidence.length
      : 0

    // For now, use placeholder values for winRate and arbOpportunities
    // These would come from performance tracking and arbitrage detection tables
    return {
      stats: {
        winRate: 0,
        activeEdges: activeEdges?.length || 0,
        avgEV,
        arbOpportunities: 0,
        signalsToday: signalsToday?.length || 0
      }
    }
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err)
    return {
      stats: {
        winRate: 0, activeEdges: 0, avgEV: 0, arbOpportunities: 0, signalsToday: 0 }, error: "Failed to fetch some stats"
    }
  }
}

export async function getSignalById(id: string): Promise<{ signal?: Signal; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching signal:", error)
      return { error: error.message }
    }

    return { signal: data as Signal }
  } catch (err) {
    console.error("Failed to fetch signal:", err)
    return { error: "Failed to fetch signal" }
  }
}


