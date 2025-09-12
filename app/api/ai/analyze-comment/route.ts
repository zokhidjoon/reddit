import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { aiCommentGenerator } from "@/lib/ai-comment-generator"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { comment, subreddit } = body

    if (!comment || !subreddit) {
      return NextResponse.json({ error: "Comment text and subreddit are required" }, { status: 400 })
    }

    const analysis = await aiCommentGenerator.analyzeComment(comment, subreddit)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error analyzing comment:", error)
    return NextResponse.json({ error: "Failed to analyze comment" }, { status: 500 })
  }
}
