interface RedditApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  rateLimitRemaining?: number
  rateLimitReset?: number
}

interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
  permalink: string
  url: string
  is_self: boolean
}

interface RedditComment {
  id: string
  body: string
  author: string
  subreddit: string
  score: number
  created_utc: number
  permalink: string
  parent_id: string
  link_id: string
}

interface RedditUser {
  name: string
  id: string
  comment_karma: number
  link_karma: number
  created_utc: number
  is_verified: boolean
}

export class RedditApiClient {
  private accessToken: string
  private userAgent: string
  private baseUrl = "https://oauth.reddit.com"

  constructor(accessToken: string) {
    this.accessToken = accessToken
    this.userAgent = "Redix/1.0.0 (Reddit Reputation Builder)"
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any,
  ): Promise<RedditApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        "User-Agent": this.userAgent,
      }

      if (method === "POST") {
        headers["Content-Type"] = "application/x-www-form-urlencoded"
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: method === "POST" && body ? new URLSearchParams(body).toString() : undefined,
      })

      const rateLimitRemaining = Number.parseInt(response.headers.get("x-ratelimit-remaining") || "0")
      const rateLimitReset = Number.parseInt(response.headers.get("x-ratelimit-reset") || "0")

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Reddit API error: ${response.status} - ${errorText}`,
          rateLimitRemaining,
          rateLimitReset,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        rateLimitRemaining,
        rateLimitReset,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  // Get current user info
  async getMe(): Promise<RedditApiResponse<RedditUser>> {
    return this.makeRequest<RedditUser>("/api/v1/me")
  }

  // Upvote a post or comment
  async vote(thingId: string, direction: 1 | 0 | -1): Promise<RedditApiResponse> {
    return this.makeRequest("/api/vote", "POST", {
      id: thingId,
      dir: direction.toString(),
    })
  }

  // Post a comment
  async comment(parentId: string, text: string): Promise<RedditApiResponse> {
    return this.makeRequest("/api/comment", "POST", {
      thing_id: parentId,
      text: text,
    })
  }

  // Subscribe to a subreddit
  async subscribe(subreddit: string, action: "sub" | "unsub" = "sub"): Promise<RedditApiResponse> {
    return this.makeRequest("/api/subscribe", "POST", {
      action: action,
      sr_name: subreddit,
    })
  }

  // Get posts from a subreddit
  async getSubredditPosts(
    subreddit: string,
    sort: "hot" | "new" | "top" | "rising" = "hot",
    limit = 25,
    after?: string,
  ): Promise<RedditApiResponse<{ children: Array<{ data: RedditPost }> }>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      sort: sort,
    })

    if (after) {
      params.append("after", after)
    }

    return this.makeRequest(`/r/${subreddit}/${sort}?${params.toString()}`)
  }

  // Search posts across Reddit
  async searchPosts(
    query: string,
    subreddit?: string,
    sort: "relevance" | "hot" | "top" | "new" | "comments" = "relevance",
    time: "hour" | "day" | "week" | "month" | "year" | "all" = "day",
    limit = 25,
  ): Promise<RedditApiResponse<{ children: Array<{ data: RedditPost }> }>> {
    const params = new URLSearchParams({
      q: query,
      sort: sort,
      t: time,
      limit: limit.toString(),
      type: "link",
    })

    if (subreddit) {
      params.append("restrict_sr", "true")
      return this.makeRequest(`/r/${subreddit}/search?${params.toString()}`)
    }

    return this.makeRequest(`/search?${params.toString()}`)
  }

  // Get comments from a post
  async getPostComments(
    subreddit: string,
    postId: string,
    sort: "confidence" | "top" | "new" | "controversial" | "old" | "random" | "qa" | "live" = "top",
  ): Promise<RedditApiResponse<any>> {
    return this.makeRequest(`/r/${subreddit}/comments/${postId}?sort=${sort}`)
  }

  // Get user's karma breakdown
  async getKarmaBreakdown(): Promise<
    RedditApiResponse<Array<{ sr: string; comment_karma: number; link_karma: number }>>
  > {
    return this.makeRequest("/api/v1/me/karma")
  }

  // Check if user is subscribed to subreddit
  async checkSubscription(subreddit: string): Promise<RedditApiResponse<{ is_subscriber: boolean }>> {
    return this.makeRequest(`/r/${subreddit}/about`)
  }
}

// Helper function to create Reddit API client from stored tokens
export async function createRedditClient(userId: string): Promise<RedditApiClient | null> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  const { data: redditAccount, error } = await supabase
    .from("reddit_accounts")
    .select("access_token, token_expires_at")
    .eq("user_id", userId)
    .single()

  if (error || !redditAccount?.access_token) {
    console.error("Failed to get Reddit access token:", error)
    return null
  }

  // Check if token is expired
  if (redditAccount.token_expires_at) {
    const expiresAt = new Date(redditAccount.token_expires_at)
    if (expiresAt < new Date()) {
      console.error("Reddit access token has expired")
      return null
    }
  }

  return new RedditApiClient(redditAccount.access_token)
}

// Utility functions for common Reddit operations
export const RedditUtils = {
  // Extract post ID from Reddit URL
  extractPostId: (url: string): string | null => {
    const match = url.match(/\/comments\/([a-z0-9]+)\//)
    return match ? match[1] : null
  },

  // Extract comment ID from Reddit URL
  extractCommentId: (url: string): string | null => {
    const match = url.match(/\/comments\/[a-z0-9]+\/[^/]+\/([a-z0-9]+)/)
    return match ? match[1] : null
  },

  // Format thing ID for Reddit API (adds prefix)
  formatThingId: (id: string, type: "post" | "comment"): string => {
    const prefix = type === "post" ? "t3_" : "t1_"
    return id.startsWith(prefix) ? id : `${prefix}${id}`
  },

  // Calculate karma score for a post/comment
  calculateKarmaScore: (upvotes: number, downvotes: number): number => {
    return upvotes - downvotes
  },

  // Check if content is likely to be flagged
  isContentSafe: (text: string): boolean => {
    const flaggedWords = ["spam", "bot", "automated", "script"]
    const lowerText = text.toLowerCase()
    return !flaggedWords.some((word) => lowerText.includes(word))
  },

  // Generate delay between actions (in milliseconds)
  generateDelay: (minSeconds = 30, maxSeconds = 180): number => {
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000
  },
}

export { RedditApiClient as RedditAPI }
