-- GameGauge: Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database tables for users, devices, and checks.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Devices Table (Stores Laptops and PCs owned by users)
CREATE TABLE IF NOT EXISTS public.user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('laptop', 'desktop')),
  specs JSONB NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Saved Rig Checks Table
CREATE TABLE IF NOT EXISTS public.rig_checks (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  hardware_summary TEXT NOT NULL,
  is_laptop BOOLEAN NOT NULL,
  score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  fps_estimate INTEGER NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_rig_checks_game_id ON public.rig_checks(game_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rig_checks ENABLE ROW LEVEL SECURITY;

-- Allow public read/write with anon key for frictionless usage
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Allow public read devices" ON public.user_devices FOR SELECT USING (true);
CREATE POLICY "Allow public insert devices" ON public.user_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update devices" ON public.user_devices FOR UPDATE USING (true);
CREATE POLICY "Allow public delete devices" ON public.user_devices FOR DELETE USING (true);

CREATE POLICY "Allow public read checks" ON public.rig_checks FOR SELECT USING (true);
CREATE POLICY "Allow public insert checks" ON public.rig_checks FOR INSERT WITH CHECK (true);
