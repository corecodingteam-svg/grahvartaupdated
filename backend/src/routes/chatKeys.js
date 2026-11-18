// End-to-end chat keys: the caller's encrypted key backup, and the other
// party's public key for a consultation.
const router = require('express').Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { partyKeys, validateBackup } = require('../utils/chatE2e');

const publicRow = (r) => r && ({
  public_key: r.public_key,
  enc_private_key: r.enc_private_key,
  salt: r.salt,
  nonce: r.nonce,
  kdf: r.kdf,
  key_version: r.key_version,
  updated_at: r.updated_at,
});

// GET /api/chat-keys/me — my encrypted key backup (null if I have not set a chat PIN yet)
router.get('/me', authenticate, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM chat_keys WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, key: publicRow(r.rows[0]) || null });
  } catch (err) {
    console.error('[chat-keys] get me:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/chat-keys/me — create my key, re-lock it with a new PIN (same public key),
// or replace it after a forgotten PIN (reset: true; older chats become unreadable).
router.put('/me', authenticate, async (req, res) => {
  try {
    const b = req.body || {};
    const err = validateBackup(b);
    if (err) return res.status(400).json({ success: false, message: err });

    const existing = (await db.query('SELECT public_key, key_version FROM chat_keys WHERE user_id = $1', [req.user.id])).rows[0];
    if (existing && existing.public_key !== b.public_key && b.reset !== true) {
      return res.status(409).json({ success: false, code: 'KEY_EXISTS', message: 'A chat key already exists for this account' });
    }
    const version = !existing ? 1 : existing.public_key === b.public_key ? existing.key_version : existing.key_version + 1;
    const r = await db.query(
      `INSERT INTO chat_keys (user_id, public_key, enc_private_key, salt, nonce, kdf, key_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         public_key = EXCLUDED.public_key, enc_private_key = EXCLUDED.enc_private_key,
         salt = EXCLUDED.salt, nonce = EXCLUDED.nonce, kdf = EXCLUDED.kdf,
         key_version = EXCLUDED.key_version, updated_at = NOW()
       RETURNING *`,
      [req.user.id, b.public_key, b.enc_private_key, b.salt, b.nonce, JSON.stringify(b.kdf), version]
    );
    res.json({ success: true, key: publicRow(r.rows[0]) });
  } catch (err) {
    console.error('[chat-keys] put me:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/chat-keys/consultation/:id — both parties' current public keys for a
// consultation I am part of. "peer" is the other person; null when they have
// not set up encrypted chat yet.
router.get('/consultation/:id', authenticate, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const keys = await partyKeys(req.params.id);
    if (!keys) return res.status(404).json({ success: false, message: 'Not found' });
    const me = keys.user.userId === req.user.id ? 'user' : keys.astrologer.userId === req.user.id ? 'astrologer' : null;
    if (!me) return res.status(403).json({ success: false, message: 'Forbidden' });
    const peer = me === 'user' ? keys.astrologer : keys.user;
    res.json({ success: true, role: me, my_key: keys[me].publicKey, peer_key: peer.publicKey });
  } catch (err) {
    console.error('[chat-keys] consultation:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
