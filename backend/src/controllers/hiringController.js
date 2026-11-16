const db = require('../config/database');
const multer = require('multer');
const IMAGE_EXT = /^\.(jpe?g|png|gif|webp|heic|heif)$/i;
const safeImageExt = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (IMAGE_EXT.test(ext)) return ext;
  const fromMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif' }[file.mimetype];
  return fromMime || '.jpg';
};
// Images only (SVG excluded — it can carry script). Some Android pickers send
// application/octet-stream, which is accepted only with an image extension.
const isAllowedImage = (file) =>
  (/^image\/(jpeg|png|gif|webp|heic|heif)$/.test(file.mimetype)) ||
  (file.mimetype === 'application/octet-stream' && IMAGE_EXT.test(path.extname(file.originalname || '')));
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendAstrologerWelcome, sendHiringOtp } = require('../utils/mailer');

const VALID_STATUSES = ['pending', 'shortlisted', 'round1', 'round2', 'activated', 'rejected'];

const uploadDir = path.join(__dirname, '../../uploads/hirings');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${safeImageExt(file)}`),
});
exports.upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    // Accept image/* plus application/octet-stream (some Android pickers send this)
    if (isAllowedImage(file)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

exports.uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file received. Ensure field name is "photo" and file is an image.' });
  res.json({ success: true, data: { url: `/uploads/hirings/${req.file.filename}` } });
};

async function generateTokenNo() {
  const r = await db.query('SELECT COUNT(*) FROM agent_hirings');
  const n = parseInt(r.rows[0].count) + 1000 + 1;
  return 'GRH-' + String(n).padStart(5, '0');
}

// ── Registration guards (shared by send-otp and apply) ───────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+91\d{10}$/;
const OTP_TTL_MIN = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (email, otp) =>
  crypto.createHash('sha256').update(`${email.toLowerCase()}:${otp}:${process.env.JWT_SECRET || ''}`).digest('hex');

/**
 * Returns an error message if this phone / email / device can't start a new
 * registration, otherwise null. One device = one registration.
 */
async function findRegistrationConflict({ phone, email, deviceId }) {
  if (phone) {
    const r = await db.query('SELECT token_no FROM agent_hirings WHERE phone = $1', [phone]);
    if (r.rows.length) return 'An application has already been submitted with this mobile number.';
  }
  if (email) {
    const r = await db.query('SELECT 1 FROM agent_hirings WHERE LOWER(email) = LOWER($1)', [email]);
    if (r.rows.length) return 'An application has already been submitted with this email address.';
    const u = await db.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (u.rows.length) return 'This email is already linked to a Grahvarta account. Please use a different email.';
  }
  if (deviceId) {
    const r = await db.query('SELECT token_no FROM agent_hirings WHERE device_id = $1', [deviceId]);
    if (r.rows.length) {
      return `This device has already been used to register (token ${r.rows[0].token_no || 'on file'}). Only one registration is allowed per device.`;
    }
  }
  return null;
}

// App: step 1 — send a 5-digit OTP to the applicant's email
exports.sendEmailOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const deviceId = String(req.body.device_id || '').trim();

    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    if (!deviceId) return res.status(400).json({ success: false, message: 'Device could not be identified. Please update the app.' });

    const conflict = await findRegistrationConflict({ phone, email, deviceId });
    if (conflict) return res.status(409).json({ success: false, message: conflict });

    const recent = await db.query(
      `SELECT created_at FROM hiring_email_otps
       WHERE LOWER(email) = $1 AND created_at > NOW() - ($2 || ' seconds')::interval
       ORDER BY created_at DESC LIMIT 1`,
      [email, String(OTP_RESEND_SECONDS)]
    );
    if (recent.rows.length) {
      const waited = (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000;
      const retryAfter = Math.max(1, Math.ceil(OTP_RESEND_SECONDS - waited));
      return res.status(429).json({ success: false, message: `Please wait ${retryAfter}s before requesting another code`, retry_after: retryAfter });
    }

    const otp = String(crypto.randomInt(10000, 100000)); // always 5 digits
    await db.query(
      `INSERT INTO hiring_email_otps (email, phone, device_id, otp_hash, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval)`,
      [email, phone, deviceId, hashOtp(email, otp), String(OTP_TTL_MIN)]
    );

    try {
      await sendHiringOtp({ to: email, otp });
    } catch (mailErr) {
      console.error('OTP email failed:', mailErr.message);
      return res.status(502).json({ success: false, message: 'Could not send the verification email. Please check the address and try again.' });
    }

    res.json({ success: true, message: `A 5-digit code was sent to ${email}`, expires_in: OTP_TTL_MIN * 60, resend_after: OTP_RESEND_SECONDS });
  } catch (err) {
    console.error('sendEmailOtp error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// App: step 1 — verify the OTP, returns a one-time verification token for /apply
exports.verifyEmailOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    if (!EMAIL_RE.test(email) || !/^\d{5}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter the 5-digit code' });
    }

    const r = await db.query(
      `SELECT * FROM hiring_email_otps
       WHERE LOWER(email) = $1 AND verified_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    const row = r.rows[0];
    if (!row) return res.status(400).json({ success: false, message: 'No code requested for this email. Tap "Send code" first.' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    if (row.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({ success: false, message: 'Too many wrong attempts. Please request a new code.' });

    if (row.otp_hash !== hashOtp(email, otp)) {
      await db.query('UPDATE hiring_email_otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      const left = OTP_MAX_ATTEMPTS - row.attempts - 1;
      return res.status(400).json({ success: false, message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.' });
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    await db.query(
      'UPDATE hiring_email_otps SET verified_at = NOW(), verification_token = $1 WHERE id = $2',
      [verificationToken, row.id]
    );
    res.json({ success: true, data: { verification_token: verificationToken } });
  } catch (err) {
    console.error('verifyEmailOtp error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const { phone, name, dob, gender, languages, skills, profile_picture_url, phone_type, works_online, online_platforms, hours_available, about_me, device_id, device_platform, email_verification_token } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });
    if (!device_id) return res.status(400).json({ success: false, message: 'Device could not be identified. Please update the app.' });
    if (!email_verification_token) return res.status(400).json({ success: false, message: 'Please verify your email address first' });

    // The verified email must be the one submitted, and the token is single-use
    const otpRow = await db.query(
      `SELECT id, email, phone FROM hiring_email_otps
       WHERE verification_token = $1 AND verified_at IS NOT NULL AND consumed_at IS NULL
         AND verified_at > NOW() - INTERVAL '2 hours'`,
      [email_verification_token]
    );
    if (!otpRow.rows.length || otpRow.rows[0].email.toLowerCase() !== email) {
      return res.status(400).json({ success: false, message: 'Email verification expired. Please verify your email again.' });
    }

    const conflict = await findRegistrationConflict({ phone, email, deviceId: device_id });
    if (conflict) return res.status(409).json({ success: false, message: conflict });

    const worksOnline = works_online === true || works_online === 'true';
    const tokenNo = await generateTokenNo();
    const result = await db.query(
      `INSERT INTO agent_hirings (phone, name, dob, gender, languages, skills, profile_picture_url, phone_type, email, works_online, online_platforms, hours_available, about_me, token_no, device_id, device_platform, email_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW()) RETURNING *`,
      [phone, name, dob || null, gender, JSON.stringify(languages || []), JSON.stringify(skills || []), profile_picture_url, phone_type, email,
       worksOnline, worksOnline ? (String(online_platforms || '').trim() || null) : null,
       parseInt(hours_available) || 0, about_me || null, tokenNo, device_id, device_platform || null]
    );
    await db.query('UPDATE hiring_email_otps SET consumed_at = NOW() WHERE id = $1', [otpRow.rows[0].id]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'An application has already been submitted with these details.' });
    }
    console.error('Hiring submission error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// App: check status by phone. With device_id, also reports whether this device
// is the one the application was registered from (never returns the id itself).
exports.getStatus = async (req, res) => {
  try {
    const { phone, device_id } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
    const r = await db.query(
      'SELECT name, phone, token_no, status, profile_picture_url, admin_notes, welcome_email_sent, converted_to_astrologer, device_id FROM agent_hirings WHERE phone = $1',
      [phone]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const { device_id: registeredDevice, ...data } = r.rows[0];
    data.device_match = !registeredDevice || !device_id ? null : registeredDevice === device_id;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: list
exports.listApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let q = 'SELECT * FROM agent_hirings';
    const params = [];
    if (status) { q += ' WHERE status = $1'; params.push(status); }
    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const countQ = status ? 'SELECT COUNT(*) FROM agent_hirings WHERE status = $1' : 'SELECT COUNT(*) FROM agent_hirings';
    const [rows, count] = await Promise.all([db.query(q, params), db.query(countQ, status ? [status] : [])]);
    res.json({ success: true, data: rows.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: activate as astrologer
exports.activateAsAstrologer = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const hiring = await client.query('SELECT * FROM agent_hirings WHERE id = $1', [id]);
    if (!hiring.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });

    const app = hiring.rows[0];
    if (app.status !== 'activated') return res.status(400).json({ success: false, message: 'Application must be activated first' });
    if (app.converted_to_astrologer) return res.status(409).json({ success: false, message: 'Already added as astrologer' });
    if (!app.email) return res.status(400).json({ success: false, message: 'Agent has no email address' });

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user account
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, avatar_url, role, must_change_password)
       VALUES ($1, $2, $3, $4, 'astrologer', TRUE) RETURNING id`,
      [app.email, passwordHash, app.name || 'Astrologer', app.profile_picture_url || null]
    );
    const userId = userResult.rows[0].id;

    // Create wallet for the user
    await client.query(
      `INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
      [userId]
    );

    // Create astrologer profile
    const langs = Array.isArray(app.languages) ? app.languages : (app.languages ? JSON.parse(app.languages) : ['English']);
    const skills = Array.isArray(app.skills) ? app.skills : (app.skills ? JSON.parse(app.skills) : []);
    await client.query(
      `INSERT INTO astrologers (user_id, display_name, bio, avatar_url, languages, specializations, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
      [userId, app.name, app.about_me || '', app.profile_picture_url || null,
       langs, skills]
    );

    // Mark hiring as converted and store temp password for admin reference
    await client.query(
      `UPDATE agent_hirings SET converted_to_astrologer = TRUE, astrologer_user_id = $1, temp_password = $2, updated_at = NOW() WHERE id = $3`,
      [userId, tempPassword, id]
    );

    await client.query('COMMIT');

    // Send welcome email (non-fatal — DB changes already committed)
    let emailSent = false;
    try {
      await sendAstrologerWelcome({
        to: app.email,
        name: app.name || 'Astrologer',
        email: app.email,
        password: tempPassword,
      });
      emailSent = true;
      await db.query(
        'UPDATE agent_hirings SET welcome_email_sent = TRUE WHERE id = $1',
        [id]
      );
    } catch (mailErr) {
      console.error('Welcome email failed (non-fatal):', mailErr.message);
    }

    res.json({
      success: true,
      message: emailSent
        ? 'Astrologer account created and welcome email sent'
        : 'Astrologer account created but email failed — please resend manually',
      email_sent: emailSent,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('activateAsAstrologer error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

// Admin: resend welcome email
exports.resendWelcomeEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const hiring = await db.query('SELECT * FROM agent_hirings WHERE id = $1', [id]);
    if (!hiring.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });

    const app = hiring.rows[0];
    if (!app.converted_to_astrologer) return res.status(400).json({ success: false, message: 'Astrologer account not created yet' });
    if (app.welcome_email_sent) return res.status(409).json({ success: false, message: 'Welcome email already sent' });
    if (!app.email) return res.status(400).json({ success: false, message: 'No email address on file' });

    // Get the user to generate a new temp password
    const userResult = await db.query('SELECT id FROM users WHERE id = $1', [app.astrologer_user_id]);
    if (!userResult.rows.length) return res.status(404).json({ success: false, message: 'Astrologer user account not found' });

    // Generate and set a new temp password
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, app.astrologer_user_id]);
    await db.query('UPDATE agent_hirings SET temp_password = $1 WHERE id = $2', [tempPassword, id]);

    await sendAstrologerWelcome({
      to: app.email,
      name: app.name || 'Astrologer',
      email: app.email,
      password: tempPassword,
    });

    await db.query('UPDATE agent_hirings SET welcome_email_sent = TRUE WHERE id = $1', [id]);

    res.json({ success: true, message: `Welcome email resent to ${app.email}` });
  } catch (err) {
    console.error('resendWelcomeEmail error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to resend email' });
  }
};

// Admin: reset temp password (for agents activated before password storage was added)
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const hiring = await db.query('SELECT * FROM agent_hirings WHERE id = $1', [id]);
    if (!hiring.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const app = hiring.rows[0];
    if (!app.converted_to_astrologer || !app.astrologer_user_id) {
      return res.status(400).json({ success: false, message: 'Agent has not been onboarded yet' });
    }
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.query('UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2', [passwordHash, app.astrologer_user_id]);
    await db.query('UPDATE agent_hirings SET temp_password = $1 WHERE id = $2', [tempPassword, id]);
    res.json({ success: true, data: { password: tempPassword } });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: edit the applicant's profile details. If the agent has already been
// converted, the shared fields are also pushed to the live astrologer profile
// (unless sync_astrologer === false).
const HIRING_EDITABLE = {
  name: 'text', phone: 'text', email: 'text', dob: 'date', gender: 'text',
  languages: 'json', skills: 'json', phone_type: 'text', works_online: 'bool',
  online_platforms: 'text', hours_available: 'int', about_me: 'text', profile_picture_url: 'text',
};

exports.updateProfile = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const before = await client.query('SELECT * FROM agent_hirings WHERE id = $1', [id]);
    if (!before.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const app = before.rows[0];

    const sets = [];
    const params = [];
    const changes = {};
    for (const [field, kind] of Object.entries(HIRING_EDITABLE)) {
      if (req.body[field] === undefined) continue;
      let v = req.body[field];
      if (kind === 'json') v = JSON.stringify(Array.isArray(v) ? v.map(String).filter(Boolean) : []);
      else if (kind === 'bool') v = v === true || v === 'true';
      else if (kind === 'int') v = parseInt(v) || 0;
      else if (kind === 'date') v = v || null;
      else v = v === null ? null : String(v).trim();
      if (field === 'email' && v) {
        v = v.toLowerCase();
        if (!EMAIL_RE.test(v)) return res.status(400).json({ success: false, message: 'Invalid email address' });
      }
      if (field === 'name' && !v) return res.status(400).json({ success: false, message: 'Name cannot be empty' });

      const prev = kind === 'json' ? JSON.stringify(app[field] || []) : app[field];
      const prevCmp = prev instanceof Date ? prev.toISOString().slice(0, 10) : prev;
      if (String(prevCmp ?? '') === String(v ?? '')) continue;
      changes[field] = { from: kind === 'json' ? app[field] : prevCmp, to: kind === 'json' ? JSON.parse(v) : v };
      params.push(v);
      sets.push(`${field} = $${params.length}`);
    }

    if (!sets.length) return res.json({ success: true, data: app, message: 'No changes' });

    await client.query('BEGIN');
    params.push(id);
    const updated = await client.query(
      `UPDATE agent_hirings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    const row = updated.rows[0];

    let astrologerSynced = false;
    if (row.converted_to_astrologer && row.astrologer_user_id && req.body.sync_astrologer !== false) {
      const asArr = (v) => (Array.isArray(v) ? v : (v ? JSON.parse(v) : []));
      await client.query(
        `UPDATE astrologers SET display_name = $1, bio = $2, languages = $3, specializations = $4,
                avatar_url = COALESCE($5, avatar_url)
         WHERE user_id = $6`,
        [row.name, row.about_me || '', asArr(row.languages), asArr(row.skills), row.profile_picture_url || null, row.astrologer_user_id]
      );
      await client.query(
        'UPDATE users SET name = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3',
        [row.name, row.profile_picture_url || null, row.astrologer_user_id]
      );
      astrologerSynced = true;
    }
    await client.query('COMMIT');

    req.auditChanges = changes;
    req.auditSummary = `Edited hiring profile ${row.token_no || id}: ${Object.keys(changes).join(', ')}${astrologerSynced ? ' (synced to astrologer)' : ''}`;
    res.json({ success: true, data: row, astrologer_synced: astrologerSynced });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Another application already uses this phone number' });
    console.error('hiring updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// Admin: update status
exports.updateStatus = async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const result = await db.query(
      `UPDATE agent_hirings SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, admin_notes || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
