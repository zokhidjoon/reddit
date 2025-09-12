import { createServerClient } from "@/lib/supabase/server"

export interface SafetyLimits {
  maxActionsPerHour: number
  maxActionsPerDay: number
  maxCommentsPerHour: number
  maxUpvotesPerHour: number
  maxSubredditJoinsPerDay: number
  minActionInterval: number // seconds
  cooldownAfterSuspiciousActivity: number // minutes
}

export interface AccountHealth {
  score: number // 0-100
  riskLevel: "low" | "medium" | "high" | "critical"
  factors: {
    accountAge: number
    karmaRatio: number
    activityPattern: number
    recentWarnings: number
    successRate: number
  }
  recommendations: string[]
}

export interface SafetyCheck {
  allowed: boolean
  reason?: string
  waitTime?: number // seconds
  riskLevel: "low" | "medium" | "high"
}

export class SafetyManager {
  private static instance: SafetyManager
  private supabase = createServerClient()

  static getInstance(): SafetyManager {
    if (!SafetyManager.instance) {
      SafetyManager.instance = new SafetyManager()
    }
    return SafetyManager.instance
  }

  async getSafetyLimits(userId: string, accountAge: number): Promise<SafetyLimits> {
    // Progressive limits based on account age and trust level
    const baseLimits: SafetyLimits = {
      maxActionsPerHour: 5,
      maxActionsPerDay: 30,
      maxCommentsPerHour: 2,
      maxUpvotesPerHour: 8,
      maxSubredditJoinsPerDay: 3,
      minActionInterval: 300, // 5 minutes
      cooldownAfterSuspiciousActivity: 60, // 1 hour
    }

    // Get user's trust level
    const { data: trustData } = await this.supabase.from("user_trust_levels").select("*").eq("user_id", userId).single()

    const trustLevel = trustData?.current_level || 1
    const multiplier = Math.min(1 + (trustLevel - 1) * 0.3, 2.5) // Max 2.5x increase

    // Account age bonus (days)
    const ageMultiplier = Math.min(1 + Math.floor(accountAge / 30) * 0.1, 1.5) // Max 1.5x for age

    return {
      maxActionsPerHour: Math.floor(baseLimits.maxActionsPerHour * multiplier * ageMultiplier),
      maxActionsPerDay: Math.floor(baseLimits.maxActionsPerDay * multiplier * ageMultiplier),
      maxCommentsPerHour: Math.floor(baseLimits.maxCommentsPerHour * multiplier),
      maxUpvotesPerHour: Math.floor(baseLimits.maxUpvotesPerHour * multiplier * ageMultiplier),
      maxSubredditJoinsPerDay: Math.floor(baseLimits.maxSubredditJoinsPerDay * multiplier),
      minActionInterval: Math.max(baseLimits.minActionInterval / multiplier, 60), // Min 1 minute
      cooldownAfterSuspiciousActivity: baseLimits.cooldownAfterSuspiciousActivity,
    }
  }

  async checkActionSafety(userId: string, actionType: string, targetData?: any): Promise<SafetyCheck> {
    try {
      // Get recent activity
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const { data: recentActions } = await this.supabase
        .from("karma_tasks")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", oneDayAgo.toISOString())
        .order("created_at", { ascending: false })

      if (!recentActions) {
        return { allowed: false, reason: "Unable to verify recent activity", riskLevel: "high" }
      }

      // Get user's Reddit account info
      const { data: redditAccount } = await this.supabase
        .from("reddit_accounts")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (!redditAccount) {
        return { allowed: false, reason: "Reddit account not found", riskLevel: "high" }
      }

      const accountAge = Math.floor(
        (now.getTime() - new Date(redditAccount.created_at).getTime()) / (1000 * 60 * 60 * 24),
      )

      const limits = await this.getSafetyLimits(userId, accountAge)

      // Check rate limits
      const actionsLastHour = recentActions.filter((action) => new Date(action.created_at) >= oneHourAgo).length
      const actionsLastDay = recentActions.length
      const commentsLastHour = recentActions.filter(
        (action) => action.task_type === "comment" && new Date(action.created_at) >= oneHourAgo,
      ).length
      const upvotesLastHour = recentActions.filter(
        (action) => action.task_type === "upvote" && new Date(action.created_at) >= oneHourAgo,
      ).length

      // Rate limit checks
      if (actionsLastHour >= limits.maxActionsPerHour) {
        return {
          allowed: false,
          reason: `Hourly limit reached (${actionsLastHour}/${limits.maxActionsPerHour})`,
          riskLevel: "medium",
          waitTime: 3600 - Math.floor((now.getTime() - oneHourAgo.getTime()) / 1000),
        }
      }

      if (actionsLastDay >= limits.maxActionsPerDay) {
        return {
          allowed: false,
          reason: `Daily limit reached (${actionsLastDay}/${limits.maxActionsPerDay})`,
          riskLevel: "medium",
          waitTime: 86400 - Math.floor((now.getTime() - oneDayAgo.getTime()) / 1000),
        }
      }

      if (actionType === "comment" && commentsLastHour >= limits.maxCommentsPerHour) {
        return {
          allowed: false,
          reason: `Comment limit reached (${commentsLastHour}/${limits.maxCommentsPerHour})`,
          riskLevel: "medium",
          waitTime: 3600,
        }
      }

      if (actionType === "upvote" && upvotesLastHour >= limits.maxUpvotesPerHour) {
        return {
          allowed: false,
          reason: `Upvote limit reached (${upvotesLastHour}/${limits.maxUpvotesPerHour})`,
          riskLevel: "medium",
          waitTime: 3600,
        }
      }

      // Check minimum interval between actions
      if (recentActions.length > 0) {
        const lastAction = recentActions[0]
        const timeSinceLastAction = Math.floor((now.getTime() - new Date(lastAction.created_at).getTime()) / 1000)

        if (timeSinceLastAction < limits.minActionInterval) {
          return {
            allowed: false,
            reason: `Too soon since last action (${timeSinceLastAction}s < ${limits.minActionInterval}s)`,
            riskLevel: "low",
            waitTime: limits.minActionInterval - timeSinceLastAction,
          }
        }
      }

      // Check for suspicious patterns
      const suspiciousCheck = await this.detectSuspiciousPatterns(userId, recentActions)
      if (!suspiciousCheck.allowed) {
        return suspiciousCheck
      }

      // Check account health
      const healthScore = await this.calculateAccountHealth(userId, redditAccount, recentActions)
      if (healthScore.riskLevel === "critical") {
        return {
          allowed: false,
          reason: "Account health critical - manual review required",
          riskLevel: "high",
        }
      }

      // All checks passed
      return {
        allowed: true,
        riskLevel: healthScore.riskLevel,
      }
    } catch (error) {
      console.error("Error in safety check:", error)
      return {
        allowed: false,
        reason: "Safety check failed",
        riskLevel: "high",
      }
    }
  }

  async detectSuspiciousPatterns(userId: string, recentActions: any[]): Promise<SafetyCheck> {
    // Pattern 1: Too many identical actions in short time
    const actionTypes = recentActions.slice(0, 10).map((a) => a.task_type)
    const identicalActions = actionTypes.filter((type, index) => actionTypes.indexOf(type) === index).length
    if (identicalActions === 1 && actionTypes.length >= 5) {
      return {
        allowed: false,
        reason: "Suspicious pattern: Too many identical actions",
        riskLevel: "high",
        waitTime: 3600,
      }
    }

    // Pattern 2: Actions too evenly spaced (bot-like)
    if (recentActions.length >= 5) {
      const intervals = []
      for (let i = 0; i < Math.min(5, recentActions.length - 1); i++) {
        const interval =
          new Date(recentActions[i].created_at).getTime() - new Date(recentActions[i + 1].created_at).getTime()
        intervals.push(interval)
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance =
        intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
      const stdDev = Math.sqrt(variance)

      // If intervals are too consistent (low variance), it's suspicious
      if (stdDev < avgInterval * 0.1 && avgInterval < 600000) {
        // Less than 10% variance and avg < 10 minutes
        return {
          allowed: false,
          reason: "Suspicious pattern: Too consistent timing",
          riskLevel: "high",
          waitTime: 1800,
        }
      }
    }

    // Pattern 3: High failure rate
    const failedActions = recentActions.filter((a) => a.status === "failed").length
    const failureRate = recentActions.length > 0 ? failedActions / recentActions.length : 0
    if (failureRate > 0.3 && recentActions.length >= 5) {
      return {
        allowed: false,
        reason: "High failure rate detected",
        riskLevel: "high",
        waitTime: 3600,
      }
    }

    return { allowed: true, riskLevel: "low" }
  }

  async calculateAccountHealth(userId: string, redditAccount: any, recentActions: any[]): Promise<AccountHealth> {
    const now = new Date()
    const accountAge = Math.floor(
      (now.getTime() - new Date(redditAccount.created_at).getTime()) / (1000 * 60 * 60 * 24),
    )

    // Calculate factors
    const factors = {
      accountAge: Math.min(accountAge / 365, 1), // 0-1 based on years
      karmaRatio: Math.min((redditAccount.comment_karma + redditAccount.link_karma) / 1000, 1), // 0-1 based on karma
      activityPattern: this.calculateActivityPatternScore(recentActions),
      recentWarnings: await this.getRecentWarningsCount(userId),
      successRate: this.calculateSuccessRate(recentActions),
    }

    // Weighted score calculation
    const weights = {
      accountAge: 0.2,
      karmaRatio: 0.15,
      activityPattern: 0.25,
      recentWarnings: 0.2,
      successRate: 0.2,
    }

    const score = Math.round(
      factors.accountAge * weights.accountAge * 100 +
        factors.karmaRatio * weights.karmaRatio * 100 +
        factors.activityPattern * weights.activityPattern * 100 +
        (1 - factors.recentWarnings) * weights.recentWarnings * 100 +
        factors.successRate * weights.successRate * 100,
    )

    let riskLevel: "low" | "medium" | "high" | "critical"
    const recommendations: string[] = []

    if (score >= 80) {
      riskLevel = "low"
    } else if (score >= 60) {
      riskLevel = "medium"
      recommendations.push("Consider reducing activity frequency")
    } else if (score >= 40) {
      riskLevel = "high"
      recommendations.push("Significantly reduce activity", "Focus on organic engagement")
    } else {
      riskLevel = "critical"
      recommendations.push("Stop all automated activity", "Manual review required")
    }

    // Specific recommendations based on factors
    if (factors.accountAge < 0.3) recommendations.push("Account needs more aging time")
    if (factors.karmaRatio < 0.2) recommendations.push("Build karma through organic participation")
    if (factors.activityPattern < 0.5) recommendations.push("Vary your activity patterns")
    if (factors.recentWarnings > 0.2) recommendations.push("Address recent warnings")
    if (factors.successRate < 0.7) recommendations.push("Investigate action failures")

    return {
      score,
      riskLevel,
      factors,
      recommendations,
    }
  }

  private calculateActivityPatternScore(recentActions: any[]): number {
    if (recentActions.length < 3) return 0.5

    // Analyze time distribution
    const hours = recentActions.map((action) => new Date(action.created_at).getHours())
    const uniqueHours = new Set(hours).size
    const hourDistribution = uniqueHours / 24 // 0-1, higher is better

    // Analyze action type diversity
    const actionTypes = recentActions.map((action) => action.task_type)
    const uniqueTypes = new Set(actionTypes).size
    const typeDistribution = Math.min(uniqueTypes / 3, 1) // 0-1, assuming 3 main types

    return (hourDistribution + typeDistribution) / 2
  }

  private async getRecentWarningsCount(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const { data: warnings } = await this.supabase
      .from("safety_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", "warning")
      .gte("created_at", thirtyDaysAgo.toISOString())

    return warnings?.length || 0
  }

  private calculateSuccessRate(recentActions: any[]): number {
    if (recentActions.length === 0) return 1

    const successfulActions = recentActions.filter((action) => action.status === "completed").length
    return successfulActions / recentActions.length
  }

  async logSafetyEvent(userId: string, eventType: string, details: any): Promise<void> {
    await this.supabase.from("safety_logs").insert({
      user_id: userId,
      action_type: eventType,
      details,
      created_at: new Date().toISOString(),
    })
  }

  async pauseUserActivity(userId: string, reason: string, durationMinutes: number): Promise<void> {
    const resumeAt = new Date(Date.now() + durationMinutes * 60 * 1000)

    await this.supabase.from("user_safety_status").upsert({
      user_id: userId,
      is_paused: true,
      pause_reason: reason,
      paused_until: resumeAt.toISOString(),
      updated_at: new Date().toISOString(),
    })

    await this.logSafetyEvent(userId, "activity_paused", {
      reason,
      durationMinutes,
      resumeAt: resumeAt.toISOString(),
    })
  }

  async isUserPaused(userId: string): Promise<{ paused: boolean; reason?: string; resumeAt?: Date }> {
    const { data: status } = await this.supabase.from("user_safety_status").select("*").eq("user_id", userId).single()

    if (!status || !status.is_paused) {
      return { paused: false }
    }

    const resumeAt = new Date(status.paused_until)
    if (resumeAt <= new Date()) {
      // Pause expired, remove it
      await this.supabase
        .from("user_safety_status")
        .update({ is_paused: false, pause_reason: null, paused_until: null })
        .eq("user_id", userId)

      return { paused: false }
    }

    return {
      paused: true,
      reason: status.pause_reason,
      resumeAt,
    }
  }
}

export const safetyManager = SafetyManager.getInstance()
