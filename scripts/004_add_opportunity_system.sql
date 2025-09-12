-- Create opportunity alerts table
CREATE TABLE IF NOT EXISTS opportunity_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  subreddits TEXT[] NOT NULL DEFAULT '{}',
  min_upvotes INTEGER,
  max_age_hours INTEGER,
  exclude_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('keyword', 'trending', 'low_competition')),
  notification_method TEXT NOT NULL CHECK (notification_method IN ('email', 'dashboard', 'both')),
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for opportunity_alerts
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts" ON opportunity_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES opportunity_alerts(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  post_title TEXT NOT NULL,
  post_url TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  age_hours DECIMAL NOT NULL,
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  relevance_score INTEGER NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  action_suggestion TEXT NOT NULL CHECK (action_suggestion IN ('upvote', 'comment', 'both')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acted', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opportunities from their alerts" ON opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunity_alerts 
      WHERE opportunity_alerts.id = opportunities.alert_id 
      AND opportunity_alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update opportunities from their alerts" ON opportunities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM opportunity_alerts 
      WHERE opportunity_alerts.id = opportunities.alert_id 
      AND opportunity_alerts.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_user_id ON opportunity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_is_active ON opportunity_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_created_at ON opportunity_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_opportunities_alert_id ON opportunities(alert_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_post_id ON opportunities(post_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_relevance_score ON opportunities(relevance_score);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);

-- Add opportunity interaction tracking
CREATE TABLE IF NOT EXISTS opportunity_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'clicked', 'acted', 'dismissed')),
  karma_task_id UUID REFERENCES karma_tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for opportunity_interactions
ALTER TABLE opportunity_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interactions" ON opportunity_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes for opportunity_interactions
CREATE INDEX IF NOT EXISTS idx_opportunity_interactions_user_id ON opportunity_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interactions_opportunity_id ON opportunity_interactions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interactions_created_at ON opportunity_interactions(created_at);

-- Function to clean up old opportunities
CREATE OR REPLACE FUNCTION cleanup_old_opportunities()
RETURNS void AS $$
BEGIN
  -- Delete opportunities older than 7 days
  DELETE FROM opportunities 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete interactions for deleted opportunities
  DELETE FROM opportunity_interactions 
  WHERE opportunity_id NOT IN (SELECT id FROM opportunities);
END;
$$ LANGUAGE plpgsql;
