// Records why a consultation ended and who ended it. The first reason
// recorded wins, so a later generic "ended" never overwrites e.g. a drop.
const db = require('../config/database');

async function recordEnd(consultationId, reason, endedBy) {
  if (!consultationId) return;
  await db.query(
    `UPDATE consultations SET end_reason = COALESCE(end_reason, $2), ended_by = COALESCE(ended_by, $3) WHERE id = $1`,
    [consultationId, reason, endedBy]
  ).catch((err) => console.error('[recordEnd]', err.message));
}

module.exports = { recordEnd };
