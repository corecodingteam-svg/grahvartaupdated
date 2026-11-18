// Records when astrologers are online, for the performance scorecard.
const db = require('../config/database');

/** Opens an online stretch when online, closes the open one when offline. */
async function recordPresence(astrologerId, isOnline) {
  if (!astrologerId) return;
  const q = isOnline
    ? `INSERT INTO astrologer_online_sessions (astrologer_id) VALUES ($1) ON CONFLICT DO NOTHING`
    : `UPDATE astrologer_online_sessions SET ended_at = NOW() WHERE astrologer_id = $1 AND ended_at IS NULL`;
  await db.query(q, [astrologerId]).catch((err) => console.error('[presenceLog]', err.message));
}

/** Server start: nobody is online any more, so close every open stretch. */
async function closeAllOpen() {
  await db.query('UPDATE astrologer_online_sessions SET ended_at = NOW() WHERE ended_at IS NULL')
    .catch((err) => console.error('[presenceLog] closeAll', err.message));
}

module.exports = { recordPresence, closeAllOpen };
