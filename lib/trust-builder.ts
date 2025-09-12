import { createServerClient } from "@/lib/supabase/server"

export interface TrustLevel {
  level: number
  name: string
  description: string
  requirements: {
    minAccountAge: number // days
    minKarma: number
    minSuccessfulActions: number
    minSuccessRate: number // 0-1
    maxWarnings: number
  }
  benefits: {
    maxActionsPerHour: number
    maxActionsPerDay: number
    maxCommentsPerHour: number
    maxUpvotesPerHour: number
    minActionInterval: number // seconds
    features: string[]
  }
}

export const TRUST_LEVELS: TrustLevel[] = [
  {
    level: 1,
    name: "Newcomer",
    description: "New to Redix - basic automation with strict limits",
    requirements: {
      minAccountAge: 0,
      minKarma: 0,
      minSuccessfulActions: 0,
      minSuccessRate: 0,
      maxWarnings: 999,
    },
    benefits: {
      maxActionsPerHour: 3,
      maxActionsPerDay: 15,
      maxCommentsPerHour: 1,
      maxUpvotesPerHour: 5,
      minActionInterval: 600, // 10 minutes
      features: ["basic_upvoting", "manual_commenting"],
    },
  },
  {
    level: 2,
    name: "Trusted User",
    description: "Proven reliability - increased limits and AI commenting",
    requirements: {
      minAccountAge: 7,
      minKarma: 100,
      minSuccessfulActions: 20,
      minSuccessRate: 0.8,
      maxWarnings: 2,
    },
    benefits: {
      maxActionsPerHour: 6,
      maxActionsPerDay: 35,
      maxCommentsPerHour: 2,
      maxUpvotesPerHour: 10,
      minActionInterval: 400, // 6.7 minutes
      features: ["basic_upvoting", "manual_commenting", "ai_commenting", "subreddit_joining"],
    },
  },
  {
    level: 3,
    name: "Veteran",
    description: "Experienced user - advanced features and higher limits",
    requirements: {
      minAccountAge: 30,
      minKarma: 500,
      minSuccessfulActions: 100,
      minSuccessRate: 0.85,
      maxWarnings: 1,
    },
    benefits: {
      maxActionsPerHour: 10,
      maxActionsPerDay: 60,
      maxCommentsPerHour: 4,
      maxUpvotesPerHour: 15,
      minActionInterval: 300, // 5 minutes
      features: [
        "basic_upvoting",
        "manual_commenting",
        "ai_commenting",
        "subreddit_joining",
        "opportunity_alerts",
        "batch_actions",
      ],
    },
  },
  {
    level: 4,
    name: "Expert",
    description: "Master user - maximum automation capabilities",
    requirements: {
      minAccountAge: 90,
      minKarma: 2000,
      minSuccessfulActions: 500,
      minSuccessRate: 0.9,
      maxWarnings: 0,
    },
    benefits: {
      maxActionsPerHour: 15,
      maxActionsPerDay: 100,
      maxCommentsPerHour: 6,
      maxUpvotesPerHour: 25,
      minActionInterval: 180, // 3 minutes
      features: [
        "basic_upvoting",
        "manual_commenting",
        "ai_commenting",
        "subreddit_joining",
        "opportunity_alerts",
        "batch_actions",
        "advanced_targeting",
        "custom_schedules",
      ],
    },
  },
  {
    level: 5,
    name: "Elite",
    description: "Elite status - unrestricted access and premium features",
    requirements: {
      minAccountAge: 180,
      minKarma: 10000,
      minSuccessfulActions: 2000,
      minSuccessRate: 0.95,
      maxWarnings: 0,
    },
    benefits: {
      maxActionsPerHour: 25,
      maxActionsPerDay: 200,
      maxCommentsPerHour: 10,
      maxUpvotesPerHour: 40,
      minActionInterval: 120, // 2 minutes
      features: [
        "basic_upvoting",
        "manual_commenting",
        "ai_commenting",
        "subreddit_joining",
        "opportunity_alerts",
        "batch_actions",
        "advanced_targeting",
        "custom_schedules",
        "priority_support",
        "beta_features",
      ],
    },
  },
]

export interface TrustProgress {
  currentLevel: TrustLevel
  nextLevel?: TrustLevel
  progress: {
    accountAge: { current: number; required: number; met: boolean }
    karma: { current: number; required: number; met: boolean }
    successfulActions: { current: number; required: number; met: boolean }
    successRate: { current: number; required: number; met: boolean }
    warnings: { current: number; required: number; met: boolean }
  }
  overallProgress: number // 0-1
  canLevelUp: boolean
}

export class TrustBuilder {
  private static instance: TrustBuilder
  private supabase = createServerClient()

  static getInstance(): TrustBuilder {
    if (!TrustBuilder.instance) {
      TrustBuilder.instance = new TrustBuilder()
    }
    return TrustBuilder.instance
  }

  async getCurrentTrustLevel(userId: string): Promise<TrustLevel> {
    const { data: trustData } = await this.supabase.from("user_trust_levels").select("*").eq("user_id", userId).single()

    if (!trustData) {
      // Initialize new user at level 1
      await this.initializeUserTrust(userId)
      return TRUST_LEVELS[0]
    }

    return TRUST_LEVELS.find((level) => level.level === trustData.current_level) || TRUST_LEVELS[0]
  }

  async getTrustProgress(userId: string): Promise<TrustProgress> {
    const currentLevel = await this.getCurrentTrustLevel(userId)
    const nextLevel = TRUST_LEVELS.find((level) => level.level === currentLevel.level + 1)

    if (!nextLevel) {
      // Already at max level
      return {
        currentLevel,
        progress: {
          accountAge: { current: 999, required: 0, met: true },
          karma: { current: 999999, required: 0, met: true },
          successfulActions: { current: 999999, required: 0, met: true },
          successRate: { current: 1, required: 0, met: true },
          warnings: { current: 0, required: 999, met: true },
        },
        overallProgress: 1,
        canLevelUp: false,
      }
    }

    // Get user stats
    const stats = await this.getUserStats(userId)

    const progress = {
      accountAge: {
        current: stats.accountAge,
        required: nextLevel.requirements.minAccountAge,
        met: stats.accountAge >= nextLevel.requirements.minAccountAge,
      },
      karma: {
        current: stats.totalKarma,
        required: nextLevel.requirements.minKarma,
        met: stats.totalKarma >= nextLevel.requirements.minKarma,
      },
      successfulActions: {
        current: stats.successfulActions,
        required: nextLevel.requirements.minSuccessfulActions,
        met: stats.successfulActions >= nextLevel.requirements.minSuccessfulActions,
      },
      successRate: {
        current: stats.successRate,
        required: nextLevel.requirements.minSuccessRate,
        met: stats.successRate >= nextLevel.requirements.minSuccessRate,
      },
      warnings: {
        current: stats.recentWarnings,
        required: nextLevel.requirements.maxWarnings,
        met: stats.recentWarnings <= nextLevel.requirements.maxWarnings,
      },
    }

    const metRequirements = Object.values(progress).filter((req) => req.met).length
    const totalRequirements = Object.values(progress).length
    const overallProgress = metRequirements / totalRequirements
    const canLevelUp = metRequirements === totalRequirements

    return {
      currentLevel,
      nextLevel,
      progress,
      overallProgress,
      canLevelUp,
    }
  }

  async checkAndUpdateTrustLevel(userId: string): Promise<{ leveledUp: boolean; newLevel?: TrustLevel }> {
    const progress = await this.getTrustProgress(userId)

    if (progress.canLevelUp && progress.nextLevel) {
      await this.levelUpUser(userId, progress.nextLevel.level)
      return { leveledUp: true, newLevel: progress.nextLevel }
    }

    return { leveledUp: false }
  }

  async getUserStats(userId: string): Promise<{
    accountAge: number
    totalKarma: number
    successfulActions: number
    successRate: number
    recentWarnings: number
  }> {
    // Get Reddit account info
    const { data: redditAccount } = await this.supabase
      .from("reddit_accounts")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (!redditAccount) {
      return {
        accountAge: 0,
        totalKarma: 0,
        successfulActions: 0,
        successRate: 0,
        recentWarnings: 0,
      }
    }

    const accountAge = Math.floor((Date.now() - new Date(redditAccount.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const totalKarma = (redditAccount.comment_karma || 0) + (redditAccount.link_karma || 0)

    // Get action stats
    const { data: allActions } = await this.supabase
      .from("karma_tasks")
      .select("status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    const successfulActions = allActions?.filter((action) => action.status === "completed").length || 0
    const totalActions = allActions?.length || 0
    const successRate = totalActions > 0 ? successfulActions / totalActions : 0

    // Get recent warnings (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const { data: warnings } = await this.supabase
      .from("safety_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", "warning")
      .gte("created_at", thirtyDaysAgo.toISOString())

    const recentWarnings = warnings?.length || 0

    return {
      accountAge,
      totalKarma,
      successfulActions,
      successRate,
      recentWarnings,
    }
  }

  private async initializeUserTrust(userId: string): Promise<void> {
    await this.supabase.from("user_trust_levels").insert({
      user_id: userId,
      current_level: 1,
      level_up_date: new Date().toISOString(),
      total_points_earned: 0,
    })
  }

  private async levelUpUser(userId: string, newLevel: number): Promise<void> {
    await this.supabase.from("user_trust_levels").upsert({
      user_id: userId,
      current_level: newLevel,
      level_up_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Log the level up event
    await this.supabase.from("safety_logs").insert({
      user_id: userId,
      action_type: "level_up",
      details: {
        newLevel,
        levelName: TRUST_LEVELS.find((l) => l.level === newLevel)?.name,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async awardPoints(userId: string, points: number, reason: string): Promise<void> {
    const { data: trustData } = await this.supabase.from("user_trust_levels").select("*").eq("user_id", userId).single()

    if (trustData) {
      const newTotal = (trustData.total_points_earned || 0) + points

      await this.supabase
        .from("user_trust_levels")
        .update({
          total_points_earned: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      // Log the points award
      await this.supabase.from("safety_logs").insert({
        user_id: userId,
        action_type: "points_awarded",
        details: {
          points,
          reason,
          newTotal,
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const currentLevel = await this.getCurrentTrustLevel(userId)
    return currentLevel.benefits.features.includes(feature)
  }

  async getFeatureRequirement(feature: string): Promise<TrustLevel | null> {
    return TRUST_LEVELS.find((level) => level.benefits.features.includes(feature)) || null
  }
}

export const trustBuilder = TrustBuilder.getInstance()
