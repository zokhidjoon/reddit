import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-auth"
import { RedditService } from "@/lib/reddit-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 })
    }

    const redditService = new RedditService(session.user.id)

    // Get the specific task
    const { createServerClient } = await import("@/lib/supabase/server")
    const supabase = createServerClient()

    const { data: task, error } = await supabase
      .from("karma_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", session.user.id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (task.status !== "pending") {
      return NextResponse.json({ error: "Task is not pending" }, { status: 400 })
    }

    let result

    switch (task.task_type) {
      case "upvote":
        result = await redditService.executeUpvoteTask(task)
        break
      case "comment":
        result = await redditService.executeCommentTask(task)
        break
      case "join_subreddit":
        result = await redditService.executeJoinTask(task)
        break
      default:
        return NextResponse.json({ error: "Invalid task type" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error executing task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
