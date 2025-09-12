import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { trustBuilder } from "@/lib/trust-builder"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const progress = await trustBuilder.getTrustProgress(session.user.id)
    const levelUpCheck = await trustBuilder.checkAndUpdateTrustLevel(session.user.id)

    return NextResponse.json({
      ...progress,
      ...levelUpCheck,
    })
  } catch (error) {
    console.error("Error getting trust progress:", error)
    return NextResponse.json({ error: "Failed to get trust progress" }, { status: 500 })
  }
}
