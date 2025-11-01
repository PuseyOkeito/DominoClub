-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  has_partner BOOLEAN DEFAULT false,
  partner_name TEXT,
  table_id UUID,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player1_name TEXT,
  player2_name TEXT,
  table_number INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables
CREATE TABLE IF NOT EXISTS game_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL UNIQUE,
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  max_players INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game state
CREATE TABLE IF NOT EXISTS game_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  started BOOLEAN DEFAULT false,
  session_id TEXT DEFAULT 'session-1',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial sessions
INSERT INTO sessions (id, name, start_time, max_players)
VALUES ('session-1', 'Evening Session 1', '6:00 PM', 24)
ON CONFLICT (id) DO NOTHING;

-- Insert initial game state
INSERT INTO game_state (id, started, session_id)
VALUES ('current', false, 'session-1')
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for all tables (may fail if already added, that's OK)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE players;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication, ignore error
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE teams;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication, ignore error
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_tables;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication, ignore error
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication, ignore error
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication, ignore error
END $$;

-- Since we don't need authentication for this app, disable RLS
ALTER TABLE IF EXISTS players DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions DISABLE ROW LEVEL SECURITY;
