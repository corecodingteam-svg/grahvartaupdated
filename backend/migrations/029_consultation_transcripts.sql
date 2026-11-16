-- Voice/video call transcripts (Agora Real-Time Speech-to-Text)
CREATE TABLE IF NOT EXISTS consultation_transcripts (
  id BIGSERIAL PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  speaker_role VARCHAR(20) NOT NULL,         -- 'user' | 'astrologer'
  speaker_uid BIGINT,
  text TEXT NOT NULL,
  language VARCHAR(20),
  start_ms INTEGER,
  spoken_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transcripts_consult ON consultation_transcripts(consultation_id, spoken_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transcripts_segment
  ON consultation_transcripts(consultation_id, speaker_uid, start_ms) WHERE start_ms IS NOT NULL;

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS stt_agent_id VARCHAR(128);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS has_transcript BOOLEAN NOT NULL DEFAULT FALSE;
