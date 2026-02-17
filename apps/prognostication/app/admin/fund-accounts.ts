"use server"

import { supabase } from "@/lib/supabase/server"

/**
 * Create a fund-level (Elite) access account
 */
export async function createFundAccount(email: string, password: string): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        tier: "elite",
        plan: "Fund Access",
        fund_access: true,
        early_signal_window: 120, // 120 seconds early access
        created_at: new Date().toISOString()
      }
    })

    if (authError) {
      console.error("Error creating fund user:", authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" }
    }

    // Create/Update profile in profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email,
        tier: "elite",
        plan: "Fund Access",
        fund_access: true,
        signals_per_day: -1, // Unlimited
        api_rate_limit: 1000, // Higher rate limit
        early_signal_seconds: 120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "id"
      })

    if (profileError) {
      console.error("Error creating profile:", profileError)
      // Don't fail if profile creation fails - auth user is created
    }

    // Log fund account creation
    await supabase.from("audit_logs").insert({
      action: "fund_account_created",
      user_id: authData.user.id,
      email,
      metadata: {
        tier: "elite",
        source: "admin_action"
      },
      created_at: new Date().toISOString()
    })

    return {
      success: true,
      userId: authData.user.id
    }
  } catch (err) {
    console.error("Failed to create fund account:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error"
    }
  }
}

/**
 * Check if user has fund access
 */
export async function checkFundAccess(userId: string): Promise<{
  hasAccess: boolean
  tier?: string
  earlySignalSeconds?: number
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("tier, fund_access, early_signal_seconds")
      .eq("id", userId)
      .single()

    if (error || !data) {
      return { hasAccess: false }
    }

    return {
      hasAccess: data.fund_access === true || data.tier === "elite",
      tier: data.tier,
      earlySignalSeconds: data.early_signal_seconds || 0
    }
  } catch {
    return { hasAccess: false }
  }
}
