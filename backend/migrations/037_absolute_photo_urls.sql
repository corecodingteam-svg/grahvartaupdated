-- Photos uploaded through agent hirings were stored as server-relative paths
-- ("/uploads/hirings/...") and copied into astrologer/user profiles. Apps and
-- the website load images from other origins and need full URLs.
UPDATE agent_hirings SET profile_picture_url = 'https://api.grahvarta.com' || profile_picture_url WHERE profile_picture_url LIKE '/uploads/%';
UPDATE astrologers   SET avatar_url          = 'https://api.grahvarta.com' || avatar_url          WHERE avatar_url LIKE '/uploads/%';
UPDATE users         SET avatar_url          = 'https://api.grahvarta.com' || avatar_url          WHERE avatar_url LIKE '/uploads/%';
