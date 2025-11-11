-- Add timer fields to game_state table
ALTER TABLE IF EXISTS game_state 
ADD COLUMN IF NOT EXISTS timer_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timer_end_time TIMESTAMPTZ;

