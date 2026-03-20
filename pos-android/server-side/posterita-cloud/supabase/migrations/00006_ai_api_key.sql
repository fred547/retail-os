-- Add AI API key column to preference table
ALTER TABLE preference ADD COLUMN IF NOT EXISTS ai_api_key TEXT DEFAULT '';
