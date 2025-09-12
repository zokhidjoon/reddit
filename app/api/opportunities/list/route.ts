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

    // Check if user has access to opportunity alerts feature
    const hasAccess = await trustBuilder.hasFeatureAccess(session.user.id, "opportunity_alerts")
    if (!hasAccess) {
      return NextResponse.json({ error: "Feature not available at your trust level" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const opportunities = await opportunityScanner.getOpportunities(session.user.id, limit)

    return NextResponse.json({ opportunities })
  } catch (error) {
    console.error("Error getting opportunities:", error)
    return NextResponse.json({ error: "Failed to get opportunities" }, { status: 500 })
  }
}
