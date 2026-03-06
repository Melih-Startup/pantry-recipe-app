-- SQL script to create tables for Pantry Recipe App
-- Run this in Supabase SQL Editor

-- Create pantry_items table
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);




  