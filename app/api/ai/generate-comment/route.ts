import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { aiCommentGenerator } from "@/lib/ai-comment-generator"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postTitle, postContent, subreddit, tone = "casual", generateMultiple = false } = body

    if (!postTitle || !subreddit) {
      return NextResponse.json({ error: "Post title and subreddit are required" }, { status: 400 })
    }

    // Get user's writing style
    const userStyle = await aiCommentGenerator.analyzeUserStyle(session.user.id)

    const options = {
      postTitle,
      postContent: postContent || "",
      subreddit,
      userStyle,
      tone,
      maxLength: 200,
    }

    let comments: string[]
    if (generateMultiple) {
      comments = await aiCommentGenerator.generateMultipleOptions(options, 3)
    } else {
      const comment = await aiCommentGenerator.generateComment(options)
      comments = [comment]
    }

    // Analyze each comment for safety
    const analyzedComments = await Promise.all(
      comments.map(async (comment) => {
        const analysis = await aiCommentGenerator.analyzeComment(comment, subreddit)
        return {
          text: comment,
          analysis,
        }
      }),
    )

    // Log the generation for tracking
    const supabase = createServerClient()
    await supabase.from("safety_logs").insert({
      user_id: session.user.id,
      action_type: "ai_comment_generation",
      details: {
        subreddit,
        postTitle,
        commentsGenerated: comments.length,
        safetyAnalysis: analyzedComments.map((c) => c.analysis),
      },
    })

    return NextResponse.json({
      comments: analyzedComments,
      userStyle,
    })
  } catch (error) {
    console.error("Error generating comment:", error)
    return NextResponse.json({ error: "Failed to generate comment" }, { status: 500 })
  }
}
