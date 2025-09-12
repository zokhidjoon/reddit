-- Update user_trust_levels table with additional fields
ALTER TABLE user_trust_levels ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;
ALTER TABLE user_trust_levels ADD COLUMN IF NOT EXISTS level_up_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_trust_levels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trust level history tracking
CREATE TABLE IF NOT EXISTS trust_level_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  reason TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for trust_level_history
ALTER TABLE trust_level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trust history" ON trust_level_history
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes for trust_level_history
CREATE INDEX IF NOT EXISTS idx_trust_level_history_user_id ON trust_level_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_level_history_created_at ON trust_level_history(created_at);

-- Add trust points tracking
CREATE TABLE IF NOT EXISTS trust_points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  action_type TEXT,
  reference_id UUID, -- Can reference karma_tasks or other tables
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for trust_points_log
ALTER TABLE trust_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points log" ON trust_points_log
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes for trust_points_log
CREATE INDEX IF NOT EXISTS idx_trust_points_log_user_id ON trust_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_points_log_created_at ON trust_points_log(created_at);
CREATE INDEX IF NOT EXISTS idx_trust_points_log_action_type ON trust_points_log(action_type);

-- Add feature access tracking
CREATE TABLE IF NOT EXISTS feature_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  trust_level_required INTEGER,
  user_trust_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for feature_access_log
ALTER TABLE feature_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature access log" ON feature_access_log
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes for feature_access_log
CREATE INDEX IF NOT EXISTS idx_feature_access_log_user_id ON feature_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_access_log_feature_name ON feature_access_log(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_access_log_created_at ON feature_access_log(created_at);

-- Function to automatically award points for successful actions
CREATE OR REPLACE FUNCTION award_trust_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points for successful karma tasks
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO trust_points_log (user_id, points, reason, action_type, reference_id)
    VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.task_type = 'comment' THEN 5
        WHEN NEW.task_type = 'upvote' THEN 2
        WHEN NEW.task_type = 'join_subreddit' THEN 3
        ELSE 1
      END,
      'Successful ' || NEW.task_type || ' action',
      'karma_task_completed',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic point awarding
DROP TRIGGER IF EXISTS trigger_award_trust_points ON karma_tasks;
CREATE TRIGGER trigger_award_trust_points
  AFTER UPDATE ON karma_tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_trust_points();
