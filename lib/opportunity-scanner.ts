import { createServerClient } from "@/lib/supabase/server"
import { RedditAPI } from "@/lib/reddit-api"

export interface OpportunityAlert {
  id: string
  userId: string
  name: string
  keywords: string[]
  subreddits: string[]
  minUpvotes?: number
  maxAge?: number // hours
  excludeKeywords?: string[]
  isActive: boolean
  alertType: "keyword" | "trending" | "low_competition"
  notificationMethod: "email" | "dashboard" | "both"
  createdAt: string
  lastTriggered?: string
}

export interface Opportunity {
  id: string
  alertId: string
  postId: string
  postTitle: string
  postUrl: string
  subreddit: string
  upvotes: number
  comments: number
  age: number // hours
  matchedKeywords: string[]
  score: number // 0-100 relevance score
  actionSuggestion: "upvote" | "comment" | "both"
  createdAt: string
  status: "new" | "acted" | "dismissed"
}

export class OpportunityScanner {
  private static instance: OpportunityScanner
  private supabase = createServerClient()
  private redditAPI = new RedditAPI()

  static getInstance(): OpportunityScanner {
    if (!OpportunityScanner.instance) {
      OpportunityScanner.instance = new OpportunityScanner()
    }
    return OpportunityScanner.instance
  }

  async createAlert(userId: string, alertData: Omit<OpportunityAlert, "id" | "userId" | "createdAt">): Promise<string> {
    const { data, error } = await this.supabase
      .from("opportunity_alerts")
      .insert({
        user_id: userId,
        name: alertData.name,
        keywords: alertData.keywords,
        subreddits: alertData.subreddits,
        min_upvotes: alertData.minUpvotes,
        max_age_hours: alertData.maxAge,
        exclude_keywords: alertData.excludeKeywords,
        is_active: alertData.isActive,
        alert_type: alertData.alertType,
        notification_method: alertData.notificationMethod,
      })
      .select("id")
      .single()

    if (error) throw error
    return data.id
  }

  async getUserAlerts(userId: string): Promise<OpportunityAlert[]> {
    const { data, error } = await this.supabase
      .from("opportunity_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return (data || []).map((alert) => ({
      id: alert.id,
      userId: alert.user_id,
      name: alert.name,
      keywords: alert.keywords || [],
      subreddits: alert.subreddits || [],
      minUpvotes: alert.min_upvotes,
      maxAge: alert.max_age_hours,
      excludeKeywords: alert.exclude_keywords || [],
      isActive: alert.is_active,
      alertType: alert.alert_type,
      notificationMethod: alert.notification_method,
      createdAt: alert.created_at,
      lastTriggered: alert.last_triggered,
    }))
  }

  async scanForOpportunities(userId: string): Promise<Opportunity[]> {
    const alerts = await this.getUserAlerts(userId)
    const activeAlerts = alerts.filter((alert) => alert.isActive)

    if (activeAlerts.length === 0) return []

    // Get Reddit access token
    const { data: redditAccount } = await this.supabase
      .from("reddit_accounts")
      .select("access_token")
      .eq("user_id", userId)
      .single()

    if (!redditAccount?.access_token) {
      throw new Error("Reddit access token not found")
    }

    const opportunities: Opportunity[] = []

    for (const alert of activeAlerts) {
      try {
        const alertOpportunities = await this.scanAlert(alert, redditAccount.access_token)
        opportunities.push(...alertOpportunities)
      } catch (error) {
        console.error(`Error scanning alert ${alert.id}:`, error)
      }
    }

    // Sort by score and remove duplicates
    const uniqueOpportunities = this.deduplicateOpportunities(opportunities)
    const sortedOpportunities = uniqueOpportunities.sort((a, b) => b.score - a.score)

    // Store opportunities in database
    await this.storeOpportunities(sortedOpportunities)

    return sortedOpportunities.slice(0, 50) // Limit to top 50
  }

  private async scanAlert(alert: OpportunityAlert, accessToken: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []

    for (const subreddit of alert.subreddits) {
      try {
        // Search for posts in subreddit
        const posts = await this.redditAPI.searchPosts(alert.keywords.join(" OR "), subreddit, "new", 25, accessToken)

        for (const post of posts) {
          const opportunity = await this.evaluatePost(post, alert)
          if (opportunity) {
            opportunities.push(opportunity)
          }
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error scanning subreddit ${subreddit}:`, error)
      }
    }

    return opportunities
  }

  private async evaluatePost(post: any, alert: OpportunityAlert): Promise<Opportunity | null> {
    const postAge = (Date.now() - post.created_utc * 1000) / (1000 * 60 * 60) // hours
    const postTitle = post.title.toLowerCase()
    const postContent = (post.selftext || "").toLowerCase()
    const fullText = `${postTitle} ${postContent}`

    // Check age filter
    if (alert.maxAge && postAge > alert.maxAge) return null

    // Check upvote filter
    if (alert.minUpvotes && post.score < alert.minUpvotes) return null

    // Check for excluded keywords
    if (alert.excludeKeywords?.some((keyword) => fullText.includes(keyword.toLowerCase()))) {
      return null
    }

    // Find matched keywords
    const matchedKeywords = alert.keywords.filter((keyword) => fullText.includes(keyword.toLowerCase()))

    if (matchedKeywords.length === 0) return null

    // Calculate relevance score
    const score = this.calculateRelevanceScore(post, alert, matchedKeywords)

    // Determine action suggestion
    const actionSuggestion = this.suggestAction(post, alert)

    return {
      id: `${alert.id}_${post.id}`,
      alertId: alert.id,
      postId: post.id,
      postTitle: post.title,
      postUrl: `https://reddit.com${post.permalink}`,
      subreddit: post.subreddit,
      upvotes: post.score,
      comments: post.num_comments,
      age: postAge,
      matchedKeywords,
      score,
      actionSuggestion,
      createdAt: new Date().toISOString(),
      status: "new",
    }
  }

  private calculateRelevanceScore(post: any, alert: OpportunityAlert, matchedKeywords: string[]): number {
    let score = 0

    // Keyword match score (0-40 points)
    const keywordScore = Math.min((matchedKeywords.length / alert.keywords.length) * 40, 40)
    score += keywordScore

    // Engagement potential (0-30 points)
    const engagementRatio = post.num_comments > 0 ? post.score / post.num_comments : post.score
    const engagementScore = Math.min(engagementRatio / 10, 30)
    score += engagementScore

    // Freshness score (0-20 points)
    const postAge = (Date.now() - post.created_utc * 1000) / (1000 * 60 * 60)
    const freshnessScore = Math.max(20 - postAge, 0)
    score += freshnessScore

    // Competition score (0-10 points)
    const competitionScore = Math.max(10 - post.num_comments / 5, 0)
    score += competitionScore

    return Math.round(Math.min(score, 100))
  }

  private suggestAction(post: any, alert: OpportunityAlert): "upvote" | "comment" | "both" {
    const commentRatio = post.num_comments / Math.max(post.score, 1)

    // If low comments relative to upvotes, suggest commenting
    if (commentRatio < 0.1 && post.num_comments < 20) {
      return "comment"
    }

    // If high engagement, suggest both
    if (post.score > 100 && post.num_comments > 10) {
      return "both"
    }

    // Default to upvote for low-risk engagement
    return "upvote"
  }

  private deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
    const seen = new Set<string>()
    return opportunities.filter((opp) => {
      if (seen.has(opp.postId)) return false
      seen.add(opp.postId)
      return true
    })
  }

  private async storeOpportunities(opportunities: Opportunity[]): Promise<void> {
    if (opportunities.length === 0) return

    const opportunityData = opportunities.map((opp) => ({
      id: opp.id,
      alert_id: opp.alertId,
      post_id: opp.postId,
      post_title: opp.postTitle,
      post_url: opp.postUrl,
      subreddit: opp.subreddit,
      upvotes: opp.upvotes,
      comments: opp.comments,
      age_hours: opp.age,
      matched_keywords: opp.matchedKeywords,
      relevance_score: opp.score,
      action_suggestion: opp.actionSuggestion,
      status: opp.status,
    }))

    await this.supabase.from("opportunities").upsert(opportunityData, {
      onConflict: "id",
    })
  }

  async getOpportunities(userId: string, limit = 20): Promise<Opportunity[]> {
    const { data, error } = await this.supabase
      .from("opportunities")
      .select(`
        *,
        opportunity_alerts!inner(user_id)
      `)
      .eq("opportunity_alerts.user_id", userId)
      .eq("status", "new")
      .order("relevance_score", { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((opp) => ({
      id: opp.id,
      alertId: opp.alert_id,
      postId: opp.post_id,
      postTitle: opp.post_title,
      postUrl: opp.post_url,
      subreddit: opp.subreddit,
      upvotes: opp.upvotes,
      comments: opp.comments,
      age: opp.age_hours,
      matchedKeywords: opp.matched_keywords || [],
      score: opp.relevance_score,
      actionSuggestion: opp.action_suggestion,
      createdAt: opp.created_at,
      status: opp.status,
    }))
  }

  async markOpportunityActed(opportunityId: string): Promise<void> {
    await this.supabase.from("opportunities").update({ status: "acted" }).eq("id", opportunityId)
  }

  async dismissOpportunity(opportunityId: string): Promise<void> {
    await this.supabase.from("opportunities").update({ status: "dismissed" }).eq("id", opportunityId)
  }

  async updateAlertLastTriggered(alertId: string): Promise<void> {
    await this.supabase
      .from("opportunity_alerts")
      .update({ last_triggered: new Date().toISOString() })
      .eq("id", alertId)
  }
}

export const opportunityScanner = OpportunityScanner.getInstance()
