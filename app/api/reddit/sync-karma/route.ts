import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { RedditService } from "@/lib/reddit-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const redditService = new RedditService(session.user.id)
    const result = await redditService.updateKarmaFromReddit()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error syncing karma:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
