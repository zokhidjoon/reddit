export interface User {
  id: string
  created_at: string
  updated_at: string
  email: string
  name?: string
  image?: string
}

export interface RedditAccount {
  id: string
  user_id: string
  reddit_username: string
  reddit_user_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  account_created_at: string
  karma_comment: number
  karma_link: number
  is_verified: boolean
  trust_level: number
  warmup_phase: number
  last_activity: string
  created_at: string
  updated_at: string
}

export interface KarmaTask {
  id: string
  user_id: string
  reddit_account_id: string
  task_type: string
  target_type: string
  target_id: string
  target_url?: string
  subreddit?: string
  scheduled_for: string
  completed_at?: string
  status: string
  safety_score: number
  ai_generated_content?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  alert_id: string
  post_id: string
  post_title: string
  post_url: string
  subreddit: string
  upvotes: number
  comments: number
  age_hours: number
  relevance_score: number
  matched_keywords: string[]
  status: string
  action_suggestion?: string
  created_at: string
  updated_at: string
}

export interface OpportunityAlert {
  id: string
  user_id: string
  keywords: string[]
  subreddits: string[]
  min_upvotes: number
  max_age_hours: number
  is_active: boolean
  last_checked: string
  created_at: string
  updated_at: string
}

export interface OpportunityInteraction {
  id: string
  user_id: string
  opportunity_id: string
  karma_task_id: string
  interaction_type: string
  created_at: string
}

export interface SafetyLog {
  id: string
  reddit_account_id: string
  action_type: string
  target_id: string
  subreddit: string
  risk_score: number
  notes?: string
  timestamp: string
}
