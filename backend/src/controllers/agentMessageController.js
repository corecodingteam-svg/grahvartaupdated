// "Write to Us" messages from the agent onboarding app.
const db = require('../config/database');
const { sendAgentMessageToSupport } = require('../utils/mailer');

/**
 * The agent app has no login token — an agent is identified by their mobile
 * number, and the request must come from the device the application was
 * registered on (older applications without a stored device are allowed).
 */
async function findAgentApplication(phone, deviceId) {
  if (!phone) return null;
  const r = await db.query('SELECT id, name, email, token_no, device_id FROM agent_hirings WHERE phone = $1', [phone]);
  const app = r.rows[0];
  if (!app) return null;
  if (app.device_id && app.device_id !== deviceId) return null;
  return app;
}

// POST /api/hirings/messages  { phone, device_id, message }
exports.sendMessage = async (req, res) => {
  try {
    const { phone, device_id } = req.body || {};
    const message = String(req.body?.message || '').trim();
    if (message.length < 2) return res.status(400).json({ success: false, message: 'Please type your message' });
    if (message.length > 2000) return res.status(400).json({ success: false, message: 'Message is too long (max 2000 characters)' });
    const app = await findAgentApplication(phone, device_id);
    if (!app) return res.status(403).json({ success: false, message: 'We could not find your application on this device.' });

    const recent = await db.query(
      `SELECT COUNT(*)::int AS n FROM agent_messages WHERE hiring_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [app.id]
    );
    if (recent.rows[0].n >= 5) return res.status(429).json({ success: false, message: 'You have sent several messages recently. Please wait for our reply.' });

    const r = await db.query(
      `INSERT INTO agent_messages (hiring_id, phone, message) VALUES ($1, $2, $3) RETURNING id, message, status, created_at`,
      [app.id, phone, message]
    );
    // Forward to support@grahvarta.com (non-fatal: the message is already saved for the admin panel)
    sendAgentMessageToSupport({ name: app.name, phone, email: app.email, tokenNo: app.token_no, message })
      .catch(e => console.error('agent message email to support failed:', e.message));
    res.status(201).json({ success: true, data: r.rows[0], message: 'Message sent. We will get back to you soon.' });
  } catch (err) {
    console.error('agent sendMessage error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/hirings/messages?phone=&device_id=  — the agent's own messages and replies
exports.listOwnMessages = async (req, res) => {
  try {
    const app = await findAgentApplication(req.query.phone, req.query.device_id);
    if (!app) return res.status(403).json({ success: false, message: 'We could not find your application on this device.' });
    const r = await db.query(
      `SELECT id, message, status, admin_reply, replied_at, created_at FROM agent_messages
       WHERE hiring_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [app.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/agent-messages?status=open|replied|closed&page=&limit=
exports.adminList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const status = ['open', 'replied', 'closed'].includes(req.query.status) ? req.query.status : null;
    const params = [];
    const where = status ? (params.push(status), `WHERE m.status = $1`) : '';
    const [rows, count, counts] = await Promise.all([
      db.query(
        `SELECT m.*, h.name AS agent_name, h.email AS agent_email, h.token_no, h.status AS application_status,
                h.profile_picture_url
         FROM agent_messages m LEFT JOIN agent_hirings h ON h.id = m.hiring_id
         ${where} ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit]
      ),
      db.query(`SELECT COUNT(*)::int AS n FROM agent_messages m ${where}`, params),
      db.query(`SELECT status, COUNT(*)::int AS n FROM agent_messages GROUP BY status`),
    ]);
    const tabCounts = { open: 0, replied: 0, closed: 0 };
    counts.rows.forEach(r => { tabCounts[r.status] = r.n; });
    res.json({ success: true, data: rows.rows, total: count.rows[0].n, tab_counts: tabCounts, page, limit });
  } catch (err) {
    console.error('agent messages adminList error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/agent-messages/:id  { reply?, status? }
// A reply is saved and shown to the agent in the app (no email is sent).
exports.adminUpdate = async (req, res) => {
  try {
    const cur = await db.query(
      `SELECT m.*, h.name AS agent_name, h.email AS agent_email FROM agent_messages m
       LEFT JOIN agent_hirings h ON h.id = m.hiring_id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!cur.rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
    const msg = cur.rows[0];
    const reply = typeof req.body?.reply === 'string' ? req.body.reply.trim() : null;
    const status = ['open', 'replied', 'closed'].includes(req.body?.status) ? req.body.status : null;
    if (!reply && !status) return res.status(400).json({ success: false, message: 'Nothing to update' });
    if (reply && reply.length > 4000) return res.status(400).json({ success: false, message: 'Reply is too long' });

    const r = await db.query(
      `UPDATE agent_messages SET
         admin_reply = COALESCE($1, admin_reply),
         replied_by  = CASE WHEN $1::text IS NOT NULL THEN $2 ELSE replied_by END,
         replied_at  = CASE WHEN $1::text IS NOT NULL THEN NOW() ELSE replied_at END,
         status      = COALESCE($3, CASE WHEN $1::text IS NOT NULL THEN 'replied' ELSE status END)
       WHERE id = $4 RETURNING *`,
      [reply, req.admin?.name || req.admin?.email || 'Admin', status, req.params.id]
    );

    req.auditSummary = reply ? `Replied to agent message from ${msg.agent_name || msg.phone}` : `Marked agent message ${status}`;
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('agent messages adminUpdate error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
