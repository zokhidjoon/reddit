import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { opportunityScanner } from "@/lib/opportunity-scanner"
import { trustBuilder } from "@/lib/trust-builder"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const alerts = await opportunityScanner.getUserAlerts(session.user.id)
    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Error getting alerts:", error)
    return NextResponse.json({ error: "Failed to get alerts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has access to opportunity alerts feature
    const hasAccess = await trustBuilder.hasFeatureAccess(session.user.id, "opportunity_alerts")
    if (!hasAccess) {
      return NextResponse.json({ error: "Feature not available at your trust level" }, { status: 403 })
    }

    const body = await request.json()
    const { name, keywords, subreddits, minUpvotes, maxAge, excludeKeywords, alertType, notificationMethod } = body

    if (!name || !keywords || !subreddits || keywords.length === 0 || subreddits.length === 0) {
      return NextResponse.json({ error: "Name, keywords, and subreddits are required" }, { status: 400 })
    }

    const alertId = await opportunityScanner.createAlert(session.user.id, {
      name,
      keywords,
      subreddits,
      minUpvotes,
      maxAge,
      excludeKeywords,
      isActive: true,
      alertType: alertType || "keyword",
      notificationMethod: notificationMethod || "dashboard",
    })

    return NextResponse.json({ alertId })
  } catch (error) {
    console.error("Error creating alert:", error)
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 })
  }
}
