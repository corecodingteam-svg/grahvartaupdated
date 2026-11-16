const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query('SELECT id, email, name, sun_sign, subscription_plan, role, is_banned, hold_until FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (result.rows[0].is_banned) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Your account has been locked. Please contact support@grahvarta.com for assistance.',
      });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requirePremium = (req, res, next) => {
  if (req.user.subscription_plan === 'free') {
    return res.status(403).json({ success: false, message: 'Premium subscription required' });
  }
  next();
};

module.exports = { authenticate, requirePremium };
