-- Migration 010: Add audit_data and social_data JSONB columns to businesses
-- These cache AI-generated website audits and social chatter scans per prospect
-- Run in: Supabase Dashboard → SQL Editor → New Query

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS audit_data   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_data  JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS raw_data     TEXT  DEFAULT NULL;
