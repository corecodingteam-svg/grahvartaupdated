-- Separate on/off availability for chat, voice call and video call
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS is_chat_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS is_call_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS is_video_available BOOLEAN NOT NULL DEFAULT TRUE;

-- Presence is re-established by live sockets after every server start; nobody is
-- online until their app reconnects (fixes astrologers stuck "online" forever).
UPDATE astrologers SET is_online = FALSE WHERE is_online = TRUE;
