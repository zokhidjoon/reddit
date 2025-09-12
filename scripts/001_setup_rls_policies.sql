-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Reddit accounts policies
CREATE POLICY "Users can view their own reddit accounts" ON reddit_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reddit accounts" ON reddit_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reddit accounts" ON reddit_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reddit accounts" ON reddit_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Karma tasks policies
CREATE POLICY "Users can view their own karma tasks" ON karma_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own karma tasks" ON karma_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own karma tasks" ON karma_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own karma tasks" ON karma_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Opportunities policies
CREATE POLICY "Users can view opportunities for their alerts" ON opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunity_alerts 
      WHERE opportunity_alerts.id = opportunities.alert_id 
      AND opportunity_alerts.user_id = auth.uid()
    )
  );

-- Opportunity alerts policies
CREATE POLICY "Users can view their own opportunity alerts" ON opportunity_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opportunity alerts" ON opportunity_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunity alerts" ON opportunity_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunity alerts" ON opportunity_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Opportunity interactions policies
CREATE POLICY "Users can view their own opportunity interactions" ON opportunity_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opportunity interactions" ON opportunity_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Safety logs policies
CREATE POLICY "Users can view safety logs for their reddit accounts" ON safety_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts 
      WHERE reddit_accounts.id = safety_logs.reddit_account_id 
      AND reddit_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert safety logs for their reddit accounts" ON safety_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reddit_accounts 
      WHERE reddit_accounts.id = safety_logs.reddit_account_id 
      AND reddit_accounts.user_id = auth.uid()
    )
  );
