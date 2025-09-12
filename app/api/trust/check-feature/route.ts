import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { trustBuilder } from "@/lib/trust-builder"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { feature } = body

    if (!feature) {
      return NextResponse.json({ error: "Feature name is required" }, { status: 400 })
    }

    const hasAccess = await trustBuilder.hasFeatureAccess(session.user.id, feature)
    const requirement = await trustBuilder.getFeatureRequirement(feature)

    return NextResponse.json({
      hasAccess,
      feature,
      requirement,
    })
  } catch (error) {
    console.error("Error checking feature access:", error)
    return NextResponse.json({ error: "Failed to check feature access" }, { status: 500 })
  }
}
