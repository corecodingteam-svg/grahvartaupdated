// Astrologer tools: welcome message + saved remedies, sound/vibration
// preferences, and the performance dashboard.
const db = require('../config/database');
const { detectContactInfo, blockedMessageText } = require('../utils/contactFilter');

async function astrologerIdOf(req, res) {
  const r = await db.query('SELECT id FROM astrologers WHERE user_id = $1', [req.user.id]);
  if (!r.rows.length) {
    res.status(403).json({ success: false, message: 'Astrologer profile not found' });
    return null;
  }
  return r.rows[0].id;
}

// Saved texts are sent into chats, so they follow the same contact-details rule
function contactError(...texts) {
  for (const t of texts) {
    const check = detectContactInfo(t || '');
    if (check.blocked) return blockedMessageText(check.detected).replace('Message not sent: ', 'Not saved: ');
  }
  return null;
}

// ── Welcome message ─────────────────────────────────────────────────────────

exports.getChatSettings = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const a = (await db.query('SELECT welcome_enabled, welcome_message FROM astrologers WHERE id = $1', [id])).rows[0];
    const remedies = (await db.query(
      'SELECT id, title, body, sort_order FROM astrologer_remedies WHERE astrologer_id = $1 ORDER BY sort_order, created_at',
      [id]
    )).rows;
    res.json({ success: true, data: { welcome_enabled: a.welcome_enabled, welcome_message: a.welcome_message || '', remedies } });
  } catch (err) {
    console.error('[tools] getChatSettings:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateWelcome = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const enabled = req.body?.welcome_enabled === true;
    const message = typeof req.body?.welcome_message === 'string' ? req.body.welcome_message.trim() : '';
    if (message.length > 1000) return res.status(400).json({ success: false, message: 'Welcome message can be at most 1000 characters' });
    if (enabled && !message) return res.status(400).json({ success: false, message: 'Write a welcome message before turning it on' });
    const err = contactError(message);
    if (err) return res.status(400).json({ success: false, message: err });
    await db.query('UPDATE astrologers SET welcome_enabled = $1, welcome_message = $2 WHERE id = $3', [enabled, message || null, id]);
    res.json({ success: true, data: { welcome_enabled: enabled, welcome_message: message } });
  } catch (err) {
    console.error('[tools] updateWelcome:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Remedies ────────────────────────────────────────────────────────────────

const MAX_REMEDIES = 50;

function readRemedy(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!title || title.length > 80) return { error: 'Title is required (up to 80 characters)' };
  if (!text || text.length > 1500) return { error: 'Remedy text is required (up to 1500 characters)' };
  const err = contactError(title, text);
  if (err) return { error: err };
  return { title, text };
}

exports.createRemedy = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const r = readRemedy(req.body);
    if (r.error) return res.status(400).json({ success: false, message: r.error });
    const count = (await db.query('SELECT COUNT(*)::int n FROM astrologer_remedies WHERE astrologer_id = $1', [id])).rows[0].n;
    if (count >= MAX_REMEDIES) return res.status(400).json({ success: false, message: `You can save up to ${MAX_REMEDIES} remedies` });
    const row = (await db.query(
      `INSERT INTO astrologer_remedies (astrologer_id, title, body, sort_order) VALUES ($1, $2, $3, $4)
       RETURNING id, title, body, sort_order`,
      [id, r.title, r.text, count]
    )).rows[0];
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('[tools] createRemedy:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateRemedy = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const r = readRemedy(req.body);
    if (r.error) return res.status(400).json({ success: false, message: r.error });
    const row = (await db.query(
      `UPDATE astrologer_remedies SET title = $1, body = $2, updated_at = NOW()
       WHERE id = $3 AND astrologer_id = $4 RETURNING id, title, body, sort_order`,
      [r.title, r.text, req.params.id, id]
    ).catch(() => ({ rows: [] }))).rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Remedy not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[tools] updateRemedy:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteRemedy = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const r = await db.query('DELETE FROM astrologer_remedies WHERE id = $1 AND astrologer_id = $2', [req.params.id, id]).catch(() => ({ rowCount: 0 }));
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'Remedy not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[tools] deleteRemedy:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Sounds & vibration ──────────────────────────────────────────────────────

const RINGTONES = ['classic', 'temple_bell', 'soft_chime', 'marimba', 'digital', 'silent'];
const MESSAGE_TONES = ['ding', 'pop', 'chime', 'silent'];
const DEFAULT_PREFS = {
  chat_request: { sound: 'classic', vibrate: true },
  call_request: { sound: 'classic', vibrate: true },
  message: { sound: 'ding', vibrate: true },
};

function normalizePrefs(p) {
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_PREFS)) {
    const v = (p && typeof p[k] === 'object' && p[k]) || {};
    const allowed = k === 'message' ? MESSAGE_TONES : RINGTONES;
    out[k] = {
      sound: allowed.includes(v.sound) ? v.sound : def.sound,
      vibrate: typeof v.vibrate === 'boolean' ? v.vibrate : def.vibrate,
    };
  }
  return out;
}
exports.normalizePrefs = normalizePrefs;

/** Android notification channel the astrologer app creates for a ringtone + vibration combo. */
exports.requestChannelFor = (prefs, type) => {
  const p = normalizePrefs(prefs)[type === 'chat' ? 'chat_request' : 'call_request'];
  return { channelId: `astro_req_${p.sound}_${p.vibrate ? 'v1' : 'v0'}`, silent: p.sound === 'silent' };
};

exports.getNotificationPrefs = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const a = (await db.query('SELECT notification_prefs FROM astrologers WHERE id = $1', [id])).rows[0];
    res.json({ success: true, data: normalizePrefs(a.notification_prefs) });
  } catch (err) {
    console.error('[tools] getNotificationPrefs:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateNotificationPrefs = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const prefs = normalizePrefs(req.body);
    await db.query('UPDATE astrologers SET notification_prefs = $1 WHERE id = $2', [JSON.stringify(prefs), id]);
    res.json({ success: true, data: prefs });
  } catch (err) {
    console.error('[tools] updateNotificationPrefs:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Performance ─────────────────────────────────────────────────────────────

// One outcome per consultation, from the astrologer's point of view.
// Requests from before end reasons were recorded that were never accepted
// count as "missed".
const OUTCOME = `
  CASE
    WHEN c.status IN ('queued', 'pending', 'connecting') THEN 'waiting'
    WHEN c.status = 'active' THEN 'in_progress'
    WHEN c.started_at IS NOT NULL AND c.end_reason IN ('astrologer_disconnected', 'user_disconnected') THEN 'dropped'
    WHEN c.started_at IS NOT NULL THEN 'completed'
    WHEN c.end_reason IN ('declined', 'blocked') THEN 'declined'
    ELSE 'missed'
  END`;
const DURATION = `COALESCE(NULLIF(c.duration_seconds, 0),
  CASE WHEN c.started_at IS NOT NULL AND c.ended_at IS NOT NULL THEN GREATEST(EXTRACT(EPOCH FROM (c.ended_at - c.started_at)), 0) ELSE 0 END)`;
const IST = `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'`;

exports.getPerformance = async (req, res) => {
  try {
    const id = await astrologerIdOf(req, res);
    if (!id) return;
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const since = `NOW() - INTERVAL '${days} days'`;
    const base = `FROM consultations c WHERE c.astrologer_id = $1 AND c.created_at >= ${since}`;

    const [byType, daily, hours, reasons, messages, firstReply, users, reviews, recent] = await Promise.all([
      db.query(
        `SELECT c.type, ${OUTCOME} AS outcome, COUNT(*)::int AS n,
                COALESCE(SUM(${DURATION}), 0)::float AS seconds,
                COALESCE(SUM(c.astrologer_earning), 0)::float AS earned,
                COUNT(*) FILTER (WHERE c.started_at IS NOT NULL AND ${DURATION} < 60)::int AS short_sessions,
                AVG(EXTRACT(EPOCH FROM (c.started_at - c.created_at))) FILTER (WHERE c.started_at IS NOT NULL)::float AS avg_answer_seconds
         ${base} GROUP BY 1, 2`, [id]),
      db.query(
        `SELECT TO_CHAR(DATE(c.created_at ${IST}), 'YYYY-MM-DD') AS day, ${OUTCOME} AS outcome, COUNT(*)::int AS n,
                COALESCE(SUM(${DURATION}), 0)::float AS seconds, COALESCE(SUM(c.astrologer_earning), 0)::float AS earned
         ${base} GROUP BY 1, 2 ORDER BY 1`, [id]),
      db.query(
        `SELECT EXTRACT(HOUR FROM c.created_at ${IST})::int AS hour, COUNT(*)::int AS requests,
                COUNT(*) FILTER (WHERE c.started_at IS NOT NULL)::int AS accepted
         ${base} GROUP BY 1 ORDER BY 1`, [id]),
      db.query(
        `SELECT COALESCE(c.end_reason, 'not_recorded') AS reason, COUNT(*)::int AS n
         ${base} AND c.status NOT IN ('queued', 'active') GROUP BY 1 ORDER BY 2 DESC`, [id]),
      db.query(
        `SELECT m.sender_type, COUNT(*)::int AS n, COUNT(DISTINCT m.consultation_id)::int AS chats
         FROM consultation_messages m JOIN consultations c ON c.id = m.consultation_id
         WHERE c.astrologer_id = $1 AND c.created_at >= ${since} AND m.sender_type IN ('user', 'astrologer')
         GROUP BY 1`, [id]),
      db.query(
        `SELECT AVG(s)::float AS avg_seconds, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s)::float AS median_seconds, COUNT(*)::int AS n
         FROM (
           SELECT EXTRACT(EPOCH FROM (MIN(m.created_at) - c.started_at)) AS s
           FROM consultations c JOIN consultation_messages m ON m.consultation_id = c.id AND m.sender_type = 'astrologer'
           WHERE c.astrologer_id = $1 AND c.created_at >= ${since} AND c.type = 'chat' AND c.started_at IS NOT NULL
           GROUP BY c.id, c.started_at
         ) t WHERE s >= 0`, [id]),
      db.query(
        `SELECT COUNT(DISTINCT c.user_id)::int AS unique_users,
                COUNT(*) FILTER (WHERE n > 1)::int AS repeat_users
         FROM (SELECT c.user_id, COUNT(*) AS n ${base} AND c.started_at IS NOT NULL GROUP BY c.user_id) c`, [id]),
      db.query(
        `SELECT COUNT(*)::int AS n, AVG(rating)::float AS avg
         FROM astrologer_reviews WHERE astrologer_id = $1 AND created_at >= ${since}`, [id]),
      db.query(
        `SELECT c.id, c.type, ${OUTCOME} AS outcome, c.end_reason, c.ended_by, c.created_at, c.started_at,
                ${DURATION}::float AS seconds, c.astrologer_earning::float AS earned,
                SPLIT_PART(COALESCE(u.name, 'User'), ' ', 1) AS user_name,
                (SELECT COUNT(*) FROM consultation_messages m WHERE m.consultation_id = c.id AND m.sender_type IN ('user', 'astrologer'))::int AS messages
         FROM consultations c LEFT JOIN users u ON u.id = c.user_id
         WHERE c.astrologer_id = $1 AND c.created_at >= ${since}
         ORDER BY c.created_at DESC LIMIT 30`, [id]),
    ]);

    // ── Fold rows into totals ──
    const outcomes = { completed: 0, dropped: 0, declined: 0, missed: 0, waiting: 0, in_progress: 0 };
    const types = {};
    let seconds = 0, earned = 0, shortSessions = 0, answerWeighted = 0, answered = 0;
    for (const r of byType.rows) {
      outcomes[r.outcome] = (outcomes[r.outcome] || 0) + r.n;
      const t = (types[r.type] ||= { requests: 0, completed: 0, dropped: 0, declined: 0, missed: 0, seconds: 0, earned: 0 });
      t.requests += r.n;
      if (t[r.outcome] !== undefined) t[r.outcome] += r.n;
      t.seconds += r.seconds;
      t.earned += r.earned;
      seconds += r.seconds;
      earned += r.earned;
      shortSessions += r.short_sessions;
      if (r.avg_answer_seconds != null) {
        const acceptedHere = r.outcome === 'completed' || r.outcome === 'dropped' || r.outcome === 'in_progress' ? r.n : 0;
        answerWeighted += r.avg_answer_seconds * acceptedHere;
        answered += acceptedHere;
      }
    }
    for (const t of Object.values(types)) {
      const sessions = t.completed + t.dropped;
      t.sessions = sessions;
      t.avg_seconds = sessions ? Math.round(t.seconds / sessions) : 0;
      t.seconds = Math.round(t.seconds);
      t.earned = Math.round(t.earned * 100) / 100;
    }
    const requests = Object.values(outcomes).reduce((a, b) => a + b, 0);
    const sessions = outcomes.completed + outcomes.dropped;
    const decided = sessions + outcomes.declined + outcomes.missed;
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

    // Daily series with zero-filled days (IST)
    const dayMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() + 5.5 * 3600e3 - i * 86400e3).toISOString().slice(0, 10);
      dayMap.set(d, { day: d, requests: 0, completed: 0, dropped: 0, declined: 0, missed: 0, seconds: 0, earned: 0 });
    }
    for (const r of daily.rows) {
      const d = dayMap.get(r.day);
      if (!d) continue;
      d.requests += r.n;
      if (d[r.outcome] !== undefined) d[r.outcome] += r.n;
      d.seconds += Math.round(r.seconds);
      d.earned = Math.round((d.earned + r.earned) * 100) / 100;
    }

    const msg = Object.fromEntries(messages.rows.map((r) => [r.sender_type, r]));
    const hourArr = Array.from({ length: 24 }, (_, h) => ({ hour: h, requests: 0, accepted: 0 }));
    for (const r of hours.rows) hourArr[r.hour] = r;

    res.json({
      success: true,
      data: {
        days,
        summary: {
          requests,
          sessions,
          completed: outcomes.completed,
          dropped: outcomes.dropped,
          declined: outcomes.declined,
          missed: outcomes.missed,
          waiting: outcomes.waiting + outcomes.in_progress,
          acceptance_rate: pct(sessions, decided),
          drop_rate: pct(outcomes.dropped, sessions),
          total_seconds: Math.round(seconds),
          avg_session_seconds: sessions ? Math.round(seconds / sessions) : 0,
          avg_answer_seconds: answered ? Math.round(answerWeighted / answered) : null,
          short_sessions: shortSessions,
          earned: Math.round(earned * 100) / 100,
          unique_users: users.rows[0]?.unique_users || 0,
          repeat_users: users.rows[0]?.repeat_users || 0,
          rating_avg: reviews.rows[0]?.avg ? Math.round(reviews.rows[0].avg * 10) / 10 : null,
          rating_count: reviews.rows[0]?.n || 0,
        },
        by_type: types,
        messages: {
          sent: msg.astrologer?.n || 0,
          received: msg.user?.n || 0,
          chats: Math.max(msg.astrologer?.chats || 0, msg.user?.chats || 0),
          first_reply_avg_seconds: firstReply.rows[0]?.n ? Math.round(firstReply.rows[0].avg_seconds) : null,
          first_reply_median_seconds: firstReply.rows[0]?.n ? Math.round(firstReply.rows[0].median_seconds) : null,
        },
        end_reasons: reasons.rows,
        daily: [...dayMap.values()],
        hours: hourArr,
        recent: recent.rows,
      },
    });
  } catch (err) {
    console.error('[tools] getPerformance:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
