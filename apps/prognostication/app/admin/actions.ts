"use server"

import { supabase } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface UserAccount {
  id: string
  email: string
  tier: "free" | "pro" | "elite"
  fund_access: boolean
  signals_per_day: number
  created_at: string
  last_sign_in?: string
}

/**
 * Get all user accounts for admin management
 */
export async function getAllAccounts(): Promise<{
  accounts: UserAccount[]
  error?: string
}> {
  try {
    // Get profiles with auth user data
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, tier, fund_access, signals_per_day, created_at")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching accounts:", profilesError)
      return { accounts: [], error: profilesError.message }
    }

    // Get last sign-in times from auth.users (requires admin client)
    const accounts: UserAccount[] = profiles.map((p) => ({
      id: p.id,
      email: p.email,
      tier: p.tier || "pro",
      fund_access: p.fund_access || false,
      signals_per_day: p.signals_per_day || 50,
      created_at: p.created_at,
    }))

    return { accounts }
  } catch (err) {
    console.error("Failed to fetch accounts:", err)
    return { accounts: [], error: "Failed to fetch accounts" }
  }
}

/**
 * Create a new user account (Pro or Fund/Elite tier)
 */
export async function createAccount(
  email: string,
  password: string,
  tier: "pro" | "elite" = "pro",
  fundAccess: boolean = false
): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tier,
        fund_access: fundAccess,
        created_by: "admin",
      },
    })

    if (authError) {
      console.error("Error creating user:", authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" }
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        email,
        tier,
        fund_access: fundAccess,
        signals_per_day: tier === "elite" ? -1 : 50, // -1 = unlimited
        api_rate_limit: tier === "elite" ? 1000 : 100,
        early_signal_seconds: fundAccess ? 120 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

    if (profileError) {
      console.error("Error creating profile:", profileError)
    }

    // Log action
    await supabase.from("audit_logs").insert({
      action: "account_created",
      user_id: authData.user.id,
      email,
      metadata: { tier, fund_access: fundAccess, source: "admin" },
      created_at: new Date().toISOString(),
    })

    revalidatePath("/admin/accounts")

    return {
      success: true,
      userId: authData.user.id,
    }
  } catch (err) {
    console.error("Failed to create account:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/**
 * Update user tier and permissions
 */
export async function updateAccountTier(
  userId: string,
  tier: "pro" | "elite",
  fundAccess: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        tier,
        fund_access: fundAccess,
        signals_per_day: tier === "elite" ? -1 : 50,
        api_rate_limit: tier === "elite" ? 1000 : 100,
        early_signal_seconds: fundAccess ? 120 : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating account:", error)
      return { success: false, error: error.message }
    }

    // Update user metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        tier,
        fund_access: fundAccess,
      },
    })

    revalidatePath("/admin/accounts")
    return { success: true }
  } catch (err) {
    console.error("Failed to update account:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/**
 * Delete a user account
 */
export async function deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete auth user (cascades to profiles via trigger or manual cleanup)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error("Error deleting user:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/accounts")
    return { success: true }
  } catch (err) {
    console.error("Failed to delete account:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
