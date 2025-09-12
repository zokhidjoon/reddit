import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { RedditService } from "@/lib/reddit-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { keywords, subreddits, minUpvotes = 0, maxAgeHours = 24 } = await request.json()

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Keywords array required" }, { status: 400 })
    }

    if (!subreddits || !Array.isArray(subreddits) || subreddits.length === 0) {
      return NextResponse.json({ error: "Subreddits array required" }, { status: 400 })
    }

    const redditService = new RedditService(session.user.id)
    const opportunities = await redditService.searchOpportunities(keywords, subreddits, minUpvotes, maxAgeHours)

    return NextResponse.json({ opportunities })
  } catch (error) {
    console.error("Error searching opportunities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
