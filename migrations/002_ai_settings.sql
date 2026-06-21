-- Migration 002: AI subscription tier and BYOK API key support
-- Run against an existing classerize database (schema.sql already applied).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier ENUM('free', 'pro') NOT NULL DEFAULT 'free'
      COMMENT 'free = platform free quota; pro = platform paid models',
  ADD COLUMN IF NOT EXISTS gemini_api_key    VARCHAR(512) NULL
      COMMENT 'AES-256-CBC encrypted user-supplied Google AI API key (BYOK)',
  ADD COLUMN IF NOT EXISTS ai_model          VARCHAR(100) NULL
      COMMENT 'Preferred Gemini model when using BYOK key';
