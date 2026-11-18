// Server side of end-to-end encrypted chat. The server cannot read messages;
// it only checks that envelopes are well formed and addressed to the current
// keys of the two people in the consultation.
const db = require('../config/database');

const b64Len = (s, bytes) => {
  if (typeof s !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  return Buffer.from(s, 'base64').length === bytes;
};

const MAX_CIPHERTEXT_B64 = 16000; // ~12 KB: 5000 chars of text, or an image reference

/** Parses and validates an encrypted envelope string. Returns the object or null. */
function parseEnvelope(content) {
  if (typeof content !== 'string' || content.length > MAX_CIPHERTEXT_B64 + 400) return null;
  let env;
  try { env = JSON.parse(content); } catch { return null; }
  if (!env || env.v !== 1) return null;
  if (!b64Len(env.s, 32) || !b64Len(env.r, 32) || !b64Len(env.n, 24)) return null;
  if (typeof env.c !== 'string' || !env.c || env.c.length > MAX_CIPHERTEXT_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(env.c)) return null;
  if (Buffer.from(env.c, 'base64').length < 17) return null; // 16-byte MAC + at least 1 byte
  return env;
}

/** Current public keys of both parties of a consultation, keyed by role. */
async function partyKeys(consultationId) {
  const r = await db.query(
    `SELECT c.user_id, a.user_id AS astro_user_id,
            uk.public_key AS user_key, ak.public_key AS astro_key
       FROM consultations c
       JOIN astrologers a ON a.id = c.astrologer_id
       LEFT JOIN chat_keys uk ON uk.user_id = c.user_id
       LEFT JOIN chat_keys ak ON ak.user_id = a.user_id
      WHERE c.id = $1`,
    [consultationId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    user: { userId: row.user_id, publicKey: row.user_key || null },
    astrologer: { userId: row.astro_user_id, publicKey: row.astro_key || null },
  };
}

/** Validates the key backup a client uploads. Returns an error string or null. */
function validateBackup(b) {
  if (!b || typeof b !== 'object') return 'Invalid key data';
  if (!b64Len(b.public_key, 32)) return 'Invalid public key';
  if (!b64Len(b.enc_private_key, 48)) return 'Invalid encrypted key';
  if (!b64Len(b.salt, 16)) return 'Invalid salt';
  if (!b64Len(b.nonce, 24)) return 'Invalid nonce';
  const k = b.kdf;
  if (!k || k.alg !== 'argon2id') return 'Unsupported key derivation';
  const ok = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!ok(k.m, 19456, 262144) || !ok(k.t, 2, 10) || !ok(k.p, 1, 4)) return 'Key derivation settings out of range';
  return null;
}

module.exports = { parseEnvelope, partyKeys, validateBackup };
