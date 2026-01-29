-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_duration_minutes INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT,
  page_url TEXT,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_time ON user_sessions(login_time DESC);
CREATE INDEX idx_user_sessions_email ON user_sessions(email);
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_session_id ON user_activity_logs(session_id);
CREATE INDEX idx_user_activity_logs_timestamp ON user_activity_logs(timestamp DESC);
CREATE INDEX idx_user_activity_logs_action_type ON user_activity_logs(action_type);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
CREATE POLICY "Master can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'master')
  );

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Policies for user_activity_logs
CREATE POLICY "Master can view all activity logs" ON user_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'master')
  );

CREATE POLICY "Users can view own activity logs" ON user_activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_time IS NOT NULL THEN
    NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate duration
CREATE TRIGGER calculate_session_duration
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  WHEN (NEW.logout_time IS NOT NULL AND OLD.logout_time IS NULL)
  EXECUTE FUNCTION update_session_duration();

-- Function to close inactive sessions (run via pg_cron)
CREATE OR REPLACE FUNCTION close_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET logout_time = NOW()
  WHERE logout_time IS NULL
    AND last_activity < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (run every 10 minutes)
-- Uncomment if pg_cron extension is enabled:
-- SELECT cron.schedule('close-inactive-sessions', '*/10 * * * *', 'SELECT close_inactive_sessions();');
