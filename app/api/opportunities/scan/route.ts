import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { opportunityScanner } from "@/lib/opportunity-scanner"
import { trustBuilder } from "@/lib/trust-builder"

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

    const opportunities = await opportunityScanner.scanForOpportunities(session.user.id)

    return NextResponse.json({
      opportunities,
      count: opportunities.length,
    })
  } catch (error) {
    console.error("Error scanning opportunities:", error)
    return NextResponse.json({ error: "Failed to scan opportunities" }, { status: 500 })
  }
}
