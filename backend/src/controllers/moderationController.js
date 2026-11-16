const db = require('../config/database');
const { sendPushNotification } = require('./liveController');

const HOLD_PRESETS_HOURS = [24, 72, 168, 720];

async function recordAction(req, userId, action, { reason = null, holdUntil = null } = {}) {
  await db.query(
    `INSERT INTO moderation_actions (user_id, action, reason, hold_until, admin_id, admin_name)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, reason, holdUntil, req.admin?.id || null, req.admin?.name || null]
  );
}

async function loadSubject(userId) {
  const r = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_banned, u.hold_until, a.id AS astrologer_id, a.display_name
     FROM users u LEFT JOIN astrologers a ON a.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return r.rows[0] || null;
}

// GET /admin/moderation/violators?role=astrologer|user&q=&page=&limit=
exports.listViolators = async (req, res) => {
  try {
    const role = req.query.role === 'astrologer' ? 'astrologer' : 'user';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const q = (req.query.q || '').trim();

    const params = [role];
    let search = '';
    if (q) {
      params.push(`%${q}%`);
      search = `AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR a.display_name ILIKE $${params.length})`;
    }

    const base = `
      FROM rule_violations v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN astrologers a ON a.user_id = u.id
      WHERE v.role = $1 ${search}`;

    params.push(limit, (page - 1) * limit);
    const rows = await db.query(`
      SELECT u.id AS user_id, u.name, u.email, u.phone, u.is_banned, u.lock_reason,
             u.hold_until, u.hold_reason, u.warning_count,
             a.id AS astrologer_id, a.display_name, a.is_banned AS astrologer_banned,
             COUNT(v.id)::int AS violation_count,
             MAX(v.created_at) AS last_violation_at,
             (ARRAY_AGG(v.content ORDER BY v.created_at DESC))[1] AS last_content,
             (ARRAY_AGG(v.detected ORDER BY v.created_at DESC))[1] AS last_detected
      ${base}
      GROUP BY u.id, a.id
      ORDER BY MAX(v.created_at) DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

    const count = await db.query(`SELECT COUNT(DISTINCT u.id)::int AS n ${base}`, params.slice(0, params.length - 2));
    const counts = await db.query(
      `SELECT role, COUNT(DISTINCT user_id)::int AS n FROM rule_violations GROUP BY role`
    );
    const tabCounts = { user: 0, astrologer: 0 };
    counts.rows.forEach(r => { tabCounts[r.role] = r.n; });

    const now = Date.now();
    res.json({
      success: true,
      data: rows.rows.map(r => ({
        ...r,
        is_on_hold: !!(r.hold_until && new Date(r.hold_until).getTime() > now),
        is_locked: !!(r.is_banned || r.astrologer_banned),
      })),
      total: count.rows[0].n,
      tab_counts: tabCounts,
      page,
      limit,
    });
  } catch (err) {
    console.error('listViolators error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /admin/moderation/:userId — violation history + moderation history
exports.getSubjectHistory = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    const [violations, actions] = await Promise.all([
      db.query(
        `SELECT v.*, c.type AS consultation_type,
                CASE WHEN v.role = 'user' THEN ca.display_name ELSE cu.name END AS counterpart_name
         FROM rule_violations v
         LEFT JOIN consultations c ON c.id = v.consultation_id
         LEFT JOIN astrologers ca ON ca.id = c.astrologer_id
         LEFT JOIN users cu ON cu.id = c.user_id
         WHERE v.user_id = $1 ORDER BY v.created_at DESC LIMIT 200`,
        [req.params.userId]
      ),
      db.query('SELECT * FROM moderation_actions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [req.params.userId]),
    ]);
    res.json({ success: true, data: { subject, violations: violations.rows, actions: actions.rows } });
  } catch (err) {
    console.error('getSubjectHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /admin/moderation/:userId/warn { message? }
exports.warn = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    const message = (req.body.message || '').trim()
      || 'Sharing phone numbers, email addresses or other contact details is against Grahvarta rules. Repeated violations will lead to your account being put on hold or locked.';

    await db.query('UPDATE users SET warning_count = warning_count + 1 WHERE id = $1', [subject.id]);
    await recordAction(req, subject.id, 'warn', { reason: message });
    await sendPushNotification([subject.id], '⚠️ Warning from Grahvarta', message, { type: 'rule_warning' });
    req.io?.to(`user:${subject.id}`).emit('account_warning', { message });

    req.auditSummary = `Warned ${subject.display_name || subject.name} (${subject.role})`;
    res.json({ success: true, message: 'Warning sent' });
  } catch (err) {
    console.error('warn error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /admin/moderation/:userId/hold { hours, reason? }
exports.hold = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    const hours = parseInt(req.body.hours);
    if (!hours || hours < 1 || hours > 24 * 90) {
      return res.status(400).json({ success: false, message: `hours must be between 1 and ${24 * 90} (presets: ${HOLD_PRESETS_HOURS.join(', ')})` });
    }
    const reason = (req.body.reason || '').trim() || 'Violation of Grahvarta communication rules';
    const r = await db.query(
      `UPDATE users SET hold_until = NOW() + ($1 || ' hours')::interval, hold_reason = $2 WHERE id = $3 RETURNING hold_until`,
      [String(hours), reason, subject.id]
    );
    const holdUntil = r.rows[0].hold_until;
    if (subject.astrologer_id) {
      await db.query('UPDATE astrologers SET is_online = FALSE, is_available = FALSE WHERE id = $1', [subject.astrologer_id]);
      req.io?.emit('astrologer_offline', { astrologer_id: subject.astrologer_id });
    }
    await recordAction(req, subject.id, 'hold', { reason, holdUntil });

    const untilText = new Date(holdUntil).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const body = subject.astrologer_id
      ? `Your account is on hold until ${untilText}. You cannot go online or take consultations until then. Reason: ${reason}`
      : `Your account is on hold until ${untilText}. You cannot start chats or calls until then. Reason: ${reason}`;
    await sendPushNotification([subject.id], 'Account on hold', body, { type: 'account_hold' });
    req.io?.to(`user:${subject.id}`).emit('account_on_hold', { hold_until: holdUntil, reason });

    req.auditSummary = `Put ${subject.display_name || subject.name} (${subject.role}) on hold for ${hours}h`;
    res.json({ success: true, data: { hold_until: holdUntil } });
  } catch (err) {
    console.error('hold error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /admin/moderation/:userId/release
exports.release = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    await db.query('UPDATE users SET hold_until = NULL, hold_reason = NULL WHERE id = $1', [subject.id]);
    await recordAction(req, subject.id, 'release');
    await sendPushNotification([subject.id], 'Account hold lifted', 'Your account hold has been removed. Thank you for following the community rules.', { type: 'account_hold_released' });
    req.auditSummary = `Released hold on ${subject.display_name || subject.name}`;
    res.json({ success: true });
  } catch (err) {
    console.error('release error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /admin/moderation/:userId/lock { reason? }
exports.lock = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    if (subject.role === 'admin') return res.status(400).json({ success: false, message: 'Admin accounts cannot be locked here' });
    const reason = (req.body.reason || '').trim() || 'Repeated violation of Grahvarta communication rules';

    await db.query('UPDATE users SET is_banned = TRUE, lock_reason = $1 WHERE id = $2', [reason, subject.id]);
    if (subject.astrologer_id) {
      await db.query(
        'UPDATE astrologers SET is_banned = TRUE, ban_reason = $1, is_online = FALSE, is_available = FALSE WHERE id = $2',
        [reason, subject.astrologer_id]
      );
      req.io?.emit('astrologer_offline', { astrologer_id: subject.astrologer_id });
    }
    await recordAction(req, subject.id, 'lock', { reason });
    await sendPushNotification([subject.id], 'Account locked', `Your Grahvarta account has been locked. Reason: ${reason}. Contact support@grahvarta.com for help.`, { type: 'account_locked' });
    req.io?.to(`user:${subject.id}`).emit('account_locked', { reason });
    req.io?.in(`user:${subject.id}`).disconnectSockets(true);

    req.auditSummary = `Locked ${subject.display_name || subject.name} (${subject.role})`;
    res.json({ success: true });
  } catch (err) {
    console.error('lock error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /admin/moderation/:userId/unlock
exports.unlock = async (req, res) => {
  try {
    const subject = await loadSubject(req.params.userId);
    if (!subject) return res.status(404).json({ success: false, message: 'User not found' });
    await db.query('UPDATE users SET is_banned = FALSE, lock_reason = NULL WHERE id = $1', [subject.id]);
    if (subject.astrologer_id) {
      await db.query('UPDATE astrologers SET is_banned = FALSE, ban_reason = NULL WHERE id = $1', [subject.astrologer_id]);
    }
    await recordAction(req, subject.id, 'unlock');
    req.auditSummary = `Unlocked ${subject.display_name || subject.name}`;
    res.json({ success: true });
  } catch (err) {
    console.error('unlock error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helpers used by the socket layer / REST guards
exports.isOnHold = (holdUntil) => !!(holdUntil && new Date(holdUntil).getTime() > Date.now());
