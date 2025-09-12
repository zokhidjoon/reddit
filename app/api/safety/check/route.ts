import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { safetyManager } from "@/lib/safety-manager"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { actionType, targetData } = body

    if (!actionType) {
      return NextResponse.json({ error: "Action type is required" }, { status: 400 })
    }

    // Check if user is paused
    const pauseStatus = await safetyManager.isUserPaused(session.user.id)
    if (pauseStatus.paused) {
      return NextResponse.json({
        allowed: false,
        reason: pauseStatus.reason,
        resumeAt: pauseStatus.resumeAt,
        riskLevel: "high",
      })
    }

    // Perform safety check
    const safetyCheck = await safetyManager.checkActionSafety(session.user.id, actionType, targetData)

    return NextResponse.json(safetyCheck)
  } catch (error) {
    console.error("Error in safety check:", error)
    return NextResponse.json({ error: "Safety check failed" }, { status: 500 })
  }
}
