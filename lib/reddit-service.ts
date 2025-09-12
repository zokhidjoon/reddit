import { createClient } from "@/lib/supabase/server"
import { createRedditClient, type RedditApiClient, RedditUtils } from "./reddit-api"

interface KarmaTaskData {
  id: string
  task_type: "upvote" | "comment" | "join_subreddit"
  target_type: "post" | "comment" | "subreddit"
  target_id: string
  target_url?: string
  subreddit?: string
  ai_generated_content?: string
}

interface SafetyCheck {
  canProceed: boolean
  reason?: string
  suggestedDelay?: number
}

export class RedditService {
  private userId: string
  private redditClient: RedditApiClient | null = null

  constructor(userId: string) {
    this.userId = userId
  }

  private async initializeClient(): Promise<boolean> {
    if (!this.redditClient) {
      this.redditClient = await createRedditClient(this.userId)
    }
    return this.redditClient !== null
  }

  // Safety check before performing any action
  private async performSafetyCheck(action: string, subreddit?: string): Promise<SafetyCheck> {
    const supabase = await createClient()

    // Get recent actions in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: recentActions } = await supabase
      .from("safety_logs")
      .select("*")
      .gte("timestamp", oneHourAgo)
      .order("timestamp", { ascending: false })

    if (!recentActions) {
      return { canProceed: true }
    }

    // Check action frequency limits
    const actionCounts = recentActions.reduce(
      (acc, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Safety limits per hour
    const limits = {
      upvote: 20,
      comment: 5,
      join_subreddit: 3,
    }

    const currentCount = actionCounts[action] || 0
    const limit = limits[action as keyof typeof limits] || 10

    if (currentCount >= limit) {
      return {
        canProceed: false,
        reason: `Hourly limit reached for ${action} (${currentCount}/${limit})`,
        suggestedDelay: 60 * 60 * 1000, // 1 hour
      }
    }

    // Check subreddit-specific limits
    if (subreddit) {
      const subredditActions = recentActions.filter((log) => log.subreddit === subreddit)
      if (subredditActions.length >= 5) {
        return {
          canProceed: false,
          reason: `Too many actions in r/${subreddit} recently`,
          suggestedDelay: 30 * 60 * 1000, // 30 minutes
        }
      }
    }

    return { canProceed: true }
  }

  // Log action for safety tracking
  private async logAction(action: string, subreddit?: string, targetId?: string, riskScore = 0.1): Promise<void> {
    const supabase = await createClient()

    const { data: redditAccount } = await supabase
      .from("reddit_accounts")
      .select("id")
      .eq("user_id", this.userId)
      .single()

    if (redditAccount) {
      await supabase.from("safety_logs").insert({
        reddit_account_id: redditAccount.id,
        action_type: action,
        subreddit,
        target_id: targetId,
        risk_score: riskScore,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Execute upvote task
  async executeUpvoteTask(task: KarmaTaskData): Promise<{ success: boolean; error?: string }> {
    if (!(await this.initializeClient()) || !this.redditClient) {
      return { success: false, error: "Failed to initialize Reddit client" }
    }

    // Safety check
    const safetyCheck = await this.performSafetyCheck("upvote", task.subreddit)
    if (!safetyCheck.canProceed) {
      return { success: false, error: safetyCheck.reason }
    }

    try {
      const thingId = RedditUtils.formatThingId(task.target_id, task.target_type)
      const result = await this.redditClient.vote(thingId, 1)

      if (result.success) {
        await this.logAction("upvote", task.subreddit, task.target_id, 0.1)
        await this.updateTaskStatus(task.id, "completed")
        return { success: true }
      } else {
        await this.updateTaskStatus(task.id, "failed", result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await this.updateTaskStatus(task.id, "failed", errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Execute comment task
  async executeCommentTask(task: KarmaTaskData): Promise<{ success: boolean; error?: string }> {
    if (!(await this.initializeClient()) || !this.redditClient) {
      return { success: false, error: "Failed to initialize Reddit client" }
    }

    if (!task.ai_generated_content) {
      return { success: false, error: "No comment content provided" }
    }

    // Safety check
    const safetyCheck = await this.performSafetyCheck("comment", task.subreddit)
    if (!safetyCheck.canProceed) {
      return { success: false, error: safetyCheck.reason }
    }

    // Content safety check
    if (!RedditUtils.isContentSafe(task.ai_generated_content)) {
      return { success: false, error: "Comment content flagged as potentially unsafe" }
    }

    try {
      const parentId = RedditUtils.formatThingId(task.target_id, task.target_type)
      const result = await this.redditClient.comment(parentId, task.ai_generated_content)

      if (result.success) {
        await this.logAction("comment", task.subreddit, task.target_id, 0.3)
        await this.updateTaskStatus(task.id, "completed")
        return { success: true }
      } else {
        await this.updateTaskStatus(task.id, "failed", result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await this.updateTaskStatus(task.id, "failed", errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Execute subreddit join task
  async executeJoinTask(task: KarmaTaskData): Promise<{ success: boolean; error?: string }> {
    if (!(await this.initializeClient()) || !this.redditClient) {
      return { success: false, error: "Failed to initialize Reddit client" }
    }

    // Safety check
    const safetyCheck = await this.performSafetyCheck("join_subreddit", task.subreddit)
    if (!safetyCheck.canProceed) {
      return { success: false, error: safetyCheck.reason }
    }

    try {
      const result = await this.redditClient.subscribe(task.target_id, "sub")

      if (result.success) {
        await this.logAction("join_subreddit", task.subreddit, task.target_id, 0.2)
        await this.updateTaskStatus(task.id, "completed")
        return { success: true }
      } else {
        await this.updateTaskStatus(task.id, "failed", result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await this.updateTaskStatus(task.id, "failed", errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Update task status in database
  private async updateTaskStatus(
    taskId: string,
    status: "completed" | "failed" | "skipped",
    errorMessage?: string,
  ): Promise<void> {
    const supabase = await createClient()

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    await supabase.from("karma_tasks").update(updateData).eq("id", taskId)
  }

  // Get pending tasks for user
  async getPendingTasks(): Promise<KarmaTaskData[]> {
    const supabase = await createClient()

    const { data: tasks } = await supabase
      .from("karma_tasks")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(10)

    return tasks || []
  }

  // Update Reddit account karma from API
  async updateKarmaFromReddit(): Promise<{ success: boolean; error?: string }> {
    if (!(await this.initializeClient()) || !this.redditClient) {
      return { success: false, error: "Failed to initialize Reddit client" }
    }

    try {
      const userResult = await this.redditClient.getMe()

      if (!userResult.success || !userResult.data) {
        return { success: false, error: userResult.error }
      }

      const supabase = await createClient()
      const { error } = await supabase
        .from("reddit_accounts")
        .update({
          karma_comment: userResult.data.comment_karma,
          karma_link: userResult.data.link_karma,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", this.userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Search for posts matching keywords
  async searchOpportunities(
    keywords: string[],
    subreddits: string[],
    minUpvotes = 0,
    maxAgeHours = 24,
  ): Promise<Array<{ post: any; subreddit: string; matchedKeywords: string[] }>> {
    if (!(await this.initializeClient()) || !this.redditClient) {
      return []
    }

    const opportunities: Array<{ post: any; subreddit: string; matchedKeywords: string[] }> = []
    const maxAgeSeconds = maxAgeHours * 60 * 60
    const now = Math.floor(Date.now() / 1000)

    try {
      for (const subreddit of subreddits) {
        for (const keyword of keywords) {
          const result = await this.redditClient.searchPosts(keyword, subreddit, "new", "day", 10)

          if (result.success && result.data?.children) {
            for (const child of result.data.children) {
              const post = child.data

              // Check age and upvotes
              if (now - post.created_utc <= maxAgeSeconds && post.score >= minUpvotes) {
                // Check for keyword matches in title or content
                const matchedKeywords = keywords.filter(
                  (kw) =>
                    post.title.toLowerCase().includes(kw.toLowerCase()) ||
                    (post.selftext && post.selftext.toLowerCase().includes(kw.toLowerCase())),
                )

                if (matchedKeywords.length > 0) {
                  opportunities.push({
                    post,
                    subreddit,
                    matchedKeywords,
                  })
                }
              }
            }
          }

          // Add delay between searches to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error("Error searching opportunities:", error)
    }

    return opportunities
  }
}
