-- Add safety status table
CREATE TABLE IF NOT EXISTS user_safety_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paused BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  paused_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies for user_safety_status
ALTER TABLE user_safety_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own safety status" ON user_safety_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own safety status" ON user_safety_status
  FOR UPDATE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_safety_status_user_id ON user_safety_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_safety_status_paused_until ON user_safety_status(paused_until);

-- Add safety metrics to safety_logs
ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for safety_logs
CREATE INDEX IF NOT EXISTS idx_safety_logs_action_type ON safety_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_safety_logs_risk_level ON safety_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_safety_logs_created_at ON safety_logs(created_at);

-- Add account health tracking
CREATE TABLE IF NOT EXISTS account_health_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB NOT NULL DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for account_health_history
ALTER TABLE account_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health history" ON account_health_history
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes for account_health_history
CREATE INDEX IF NOT EXISTS idx_account_health_history_user_id ON account_health_history(user_id);
CREATE INDEX IF NOT EXISTS idx_account_health_history_created_at ON account_health_history(created_at);
CREATE INDEX IF NOT EXISTS idx_account_health_history_risk_level ON account_health_history(risk_level);
