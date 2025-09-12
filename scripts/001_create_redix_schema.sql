-- Create users table for NextAuth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounts table for NextAuth (stores OAuth provider info)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Create sessions table for NextAuth
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification_tokens table for NextAuth
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Reddit-specific tables for Redix functionality
CREATE TABLE IF NOT EXISTS reddit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reddit_username TEXT NOT NULL,
  reddit_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  account_created_at TIMESTAMP WITH TIME ZONE,
  karma_comment INTEGER DEFAULT 0,
  karma_link INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  trust_level INTEGER DEFAULT 1,
  warmup_phase INTEGER DEFAULT 1,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reddit_username),
  UNIQUE(reddit_user_id)
);

-- Karma tasks table for tracking automated actions
CREATE TABLE IF NOT EXISTS karma_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reddit_account_id UUID NOT NULL REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('upvote', 'comment', 'join_subreddit')),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'subreddit')),
  target_id TEXT NOT NULL,
  target_url TEXT,
  subreddit TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  ai_generated_content TEXT,
  safety_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunity alerts table for keyword monitoring
CREATE TABLE IF NOT EXISTS opportunity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL,
  subreddits TEXT[] NOT NULL,
  min_upvotes INTEGER DEFAULT 0,
  max_age_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety logs table for tracking actions and preventing bans
CREATE TABLE IF NOT EXISTS safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_account_id UUID NOT NULL REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  subreddit TEXT,
  target_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  risk_score DECIMAL(3,2),
  notes TEXT
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (id = auth.uid()::uuid);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (id = auth.uid()::uuid);

-- RLS policies for accounts table  
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (user_id = auth.uid()::uuid);

-- RLS policies for sessions table
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (user_id = auth.uid()::uuid);

-- RLS policies for reddit_accounts table
CREATE POLICY "Users can view own reddit accounts" ON reddit_accounts FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own reddit accounts" ON reddit_accounts FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own reddit accounts" ON reddit_accounts FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own reddit accounts" ON reddit_accounts FOR DELETE USING (user_id = auth.uid()::uuid);

-- RLS policies for karma_tasks table
CREATE POLICY "Users can view own karma tasks" ON karma_tasks FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own karma tasks" ON karma_tasks FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own karma tasks" ON karma_tasks FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own karma tasks" ON karma_tasks FOR DELETE USING (user_id = auth.uid()::uuid);

-- RLS policies for opportunity_alerts table
CREATE POLICY "Users can view own alerts" ON opportunity_alerts FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own alerts" ON opportunity_alerts FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own alerts" ON opportunity_alerts FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own alerts" ON opportunity_alerts FOR DELETE USING (user_id = auth.uid()::uuid);

-- RLS policies for safety_logs table (users can only view their reddit account's logs)
CREATE POLICY "Users can view own safety logs" ON safety_logs 
FOR SELECT USING (
  reddit_account_id IN (
    SELECT id FROM reddit_accounts WHERE user_id = auth.uid()::uuid
  )
);
CREATE POLICY "Users can insert own safety logs" ON safety_logs 
FOR INSERT WITH CHECK (
  reddit_account_id IN (
    SELECT id FROM reddit_accounts WHERE user_id = auth.uid()::uuid
  )
);
