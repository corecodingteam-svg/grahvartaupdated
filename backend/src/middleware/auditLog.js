const db = require('../config/database');

// "METHOD /route/pattern" (relative to /api/admin) -> [action, entityType, summary]
// Anything not listed is still logged with a generic action name.
const ACTIONS = {
  'POST /login':                              ['admin.login', 'admin', 'Signed in to admin panel'],
  'POST /users/:id/ban':                      ['user.lock', 'user', 'Locked (banned) user'],
  'POST /users/:id/unban':                    ['user.unlock', 'user', 'Unlocked (unbanned) user'],
  'POST /astrologers/:id/approve':            ['astrologer.approve', 'astrologer', 'Approved astrologer'],
  'POST /astrologers/:id/reject':             ['astrologer.reject', 'astrologer', 'Rejected astrologer'],
  'PUT /astrologers/:id/rates':               ['astrologer.update_rates', 'astrologer', 'Changed astrologer rates'],
  'PUT /astrologers/:id':                     ['astrologer.update_profile', 'astrologer', 'Edited astrologer profile'],
  'POST /astrologers/:id/toggle-online':      ['astrologer.toggle_online', 'astrologer', 'Toggled astrologer online status'],
  'POST /astrologers/:id/ban':                ['astrologer.ban', 'astrologer', 'Banned astrologer'],
  'POST /astrologers/:id/unban':              ['astrologer.unban', 'astrologer', 'Unbanned astrologer'],
  'POST /reports':                            ['report.create', 'report', 'Created report'],
  'PUT /reports/:id':                         ['report.update', 'report', 'Edited report'],
  'DELETE /reports/:id':                      ['report.delete', 'report', 'Deleted report'],
  'POST /reports/:id/toggle':                 ['report.toggle', 'report', 'Toggled report'],
  'POST /wallet/credit':                      ['wallet.manual_credit', 'user', 'Manually credited wallet'],
  'POST /wallet/debit':                       ['wallet.manual_debit', 'user', 'Manually debited wallet'],
  'POST /transactions/:id/refund':            ['transaction.refund', 'transaction', 'Refunded transaction'],
  'POST /withdrawals/:id/approve':            ['withdrawal.approve', 'withdrawal', 'Approved withdrawal'],
  'POST /withdrawals/:id/reject':             ['withdrawal.reject', 'withdrawal', 'Rejected withdrawal'],
  'POST /community/:id/approve':              ['community.approve', 'community_post', 'Approved community post'],
  'POST /community/:id/reject':               ['community.reject', 'community_post', 'Rejected community post'],
  'DELETE /community/:id':                    ['community.delete', 'community_post', 'Deleted community post'],
  'POST /notifications/broadcast':            ['notification.broadcast', 'notification', 'Sent broadcast notification'],
  'POST /notifications/segment':              ['notification.segment', 'notification', 'Sent segmented notification'],
  'PATCH /hirings/:id':                       ['hiring.update_status', 'hiring', 'Changed hiring status'],
  'PUT /hirings/:id/profile':                 ['hiring.update_profile', 'hiring', 'Edited hiring profile'],
  'POST /hirings/:id/activate-as-astrologer': ['hiring.convert', 'hiring', 'Added agent as astrologer'],
  'POST /hirings/:id/resend-email':           ['hiring.resend_email', 'hiring', 'Resent welcome email'],
  'POST /hirings/:id/reset-password':         ['hiring.reset_password', 'hiring', 'Reset agent password'],
  'PATCH /agent-messages/:id':                ['agent_message.update', 'agent_message', 'Updated agent message'],
  'POST /recharge-offers':                    ['recharge_offer.create', 'recharge_offer', 'Created recharge offer'],
  'PUT /recharge-offers/:id':                 ['recharge_offer.update', 'recharge_offer', 'Edited recharge offer'],
  'DELETE /recharge-offers/:id':              ['recharge_offer.delete', 'recharge_offer', 'Deleted recharge offer'],
  'POST /sub-admins':                         ['subadmin.create', 'subadmin', 'Created sub-admin'],
  'PUT /sub-admins/:id':                      ['subadmin.update', 'subadmin', 'Edited sub-admin'],
  'DELETE /sub-admins/:id':                   ['subadmin.delete', 'subadmin', 'Deleted sub-admin'],
  'POST /moderation/:userId/warn':            ['moderation.warn', 'user', 'Sent rule-violation warning'],
  'POST /moderation/:userId/hold':            ['moderation.hold', 'user', 'Put account on hold'],
  'POST /moderation/:userId/release':         ['moderation.release', 'user', 'Released account hold'],
  'POST /moderation/:userId/lock':            ['moderation.lock', 'user', 'Locked account'],
  'POST /moderation/:userId/unlock':          ['moderation.unlock', 'user', 'Unlocked account'],
};

const SECRET_KEYS = /pass(word)?|token|secret|otp|signature|key/i;

function sanitize(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '[redacted]' : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) return value.slice(0, 2000) + '…';
  return value;
}

/**
 * Mount on the admin router BEFORE the routes. Logs every non-GET request once
 * the response has been sent. Controllers can enrich the entry by setting
 * req.auditChanges ({ field: {from, to} }), req.auditSummary and req.auditEntityId.
 */
function auditAdminActions(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') return next();

  let responseBody;
  const originalJson = res.json.bind(res);
  res.json = (body) => { responseBody = body; return originalJson(body); };

  res.on('finish', () => {
    const routePath = req.route?.path || req.path;
    const key = `${req.method} ${routePath}`;
    const [action, entityType, defaultSummary] = ACTIONS[key] || [
      `${req.method.toLowerCase()} ${routePath}`, null, null,
    ];

    let admin = req.admin;
    // Login runs before authentication — identify the admin from the response
    if (!admin && action === 'admin.login') {
      const a = responseBody?.data?.admin;
      admin = a ? { id: a.id, name: a.name, email: a.email, isSuperAdmin: a.role === 'superadmin' } : { email: req.body?.email };
    }

    const entityId = req.auditEntityId || req.params?.id || req.params?.userId || req.body?.user_id || null;
    const ok = res.statusCode < 400;
    const summary = req.auditSummary
      || (ok ? defaultSummary : `${defaultSummary || action} — failed`)
      || null;

    db.query(
      `INSERT INTO admin_audit_logs
         (admin_id, admin_type, admin_name, admin_email, action, entity_type, entity_id, summary,
          method, path, request_body, changes, status_code, success, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        admin?.id || null,
        admin ? (admin.isSuperAdmin ? 'superadmin' : 'subadmin') : null,
        admin?.name || null,
        admin?.email || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        ok ? summary : `${summary}${responseBody?.message ? `: ${responseBody.message}` : ''}`,
        req.method,
        req.originalUrl.split('?')[0],
        JSON.stringify(sanitize(req.body || {})),
        req.auditChanges ? JSON.stringify(sanitize(req.auditChanges)) : null,
        res.statusCode,
        ok,
        (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim() || null,
        (req.headers['user-agent'] || '').slice(0, 500) || null,
      ]
    ).catch(err => console.error('[audit] failed to write log:', err.message));
  });

  next();
}

module.exports = { auditAdminActions };
