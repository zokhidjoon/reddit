import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { safetyManager } from "@/lib/safety-manager"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get Reddit account info
    const { data: redditAccount } = await supabase
      .from("reddit_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (!redditAccount) {
      return NextResponse.json({ error: "Reddit account not found" }, { status: 404 })
    }

    // Get recent actions
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: recentActions } = await supabase
      .from("karma_tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })

    // Calculate account health
    const accountHealth = await safetyManager.calculateAccountHealth(
      session.user.id,
      redditAccount,
      recentActions || [],
    )

    // Get safety limits
    const accountAge = Math.floor((Date.now() - new Date(redditAccount.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const safetyLimits = await safetyManager.getSafetyLimits(session.user.id, accountAge)

    // Get pause status
    const pauseStatus = await safetyManager.isUserPaused(session.user.id)

    return NextResponse.json({
      accountHealth,
      safetyLimits,
      pauseStatus,
      recentActivityCount: recentActions?.length || 0,
    })
  } catch (error) {
    console.error("Error getting safety health:", error)
    return NextResponse.json({ error: "Failed to get safety health" }, { status: 500 })
  }
}
