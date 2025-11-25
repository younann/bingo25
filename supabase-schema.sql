-- Supabase Schema for Bingo 2025
-- Run this in the Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  called_numbers INTEGER[] DEFAULT '{}',
  current_number INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  auto_call_enabled BOOLEAN DEFAULT FALSE,
  auto_call_interval INTEGER DEFAULT 5,
  winner_card_id TEXT,
  winner_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player cards table
CREATE TABLE IF NOT EXISTS player_cards (
  id TEXT PRIMARY KEY,
  card_numbers INTEGER[][] NOT NULL,
  marked_cells BOOLEAN[][] DEFAULT '{{false,false,false,false,false},{false,false,false,false,false},{false,false,true,false,false},{false,false,false,false,false},{false,false,false,false,false}}',
  game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
  player_name TEXT,
  theme_id TEXT DEFAULT 'default',
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY DEFAULT 'current',
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_is_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_cards_id ON player_cards(id);
CREATE INDEX IF NOT EXISTS idx_player_cards_last_active ON player_cards(last_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_heartbeat ON admin_sessions(last_heartbeat);

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for simplicity)
-- In production, you might want more restrictive policies

-- Games policies
CREATE POLICY "Allow all operations on games" ON games
  FOR ALL USING (true) WITH CHECK (true);

-- Player cards policies
CREATE POLICY "Allow all operations on player_cards" ON player_cards
  FOR ALL USING (true) WITH CHECK (true);

-- Admin sessions policies
CREATE POLICY "Allow all operations on admin_sessions" ON admin_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for games table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_cards_updated_at ON player_cards;
CREATE TRIGGER update_player_cards_updated_at
  BEFORE UPDATE ON player_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: Add new columns to existing tables
-- Run these if you already have the tables created

-- Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS auto_call_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS auto_call_interval INTEGER DEFAULT 5;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_card_id TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_name TEXT;

-- Add new columns to player_cards table
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'default';
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Create index for last_active if not exists
CREATE INDEX IF NOT EXISTS idx_player_cards_last_active ON player_cards(last_active);
