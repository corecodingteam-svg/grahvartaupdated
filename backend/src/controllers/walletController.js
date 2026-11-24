const db = require('../config/database');
const Razorpay = require('razorpay');
const { sendPushNotification } = require('./liveController');

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

// Ensure wallet exists for user
async function ensureWallet(userId) {
  await db.query(
    `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  const result = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  return result.rows[0];
}

// TESTING ONLY: every end user gets a one-time ₹TEST_WALLET_CREDIT (default 1000).
// Set TEST_WALLET_CREDIT=0 in the environment to switch it off. Existing users
// were credited once by migration 030_test_wallet_credit.sql.
async function grantTestCredit(userId) {
  const amount = parseFloat(process.env.TEST_WALLET_CREDIT ?? '1000');
  if (!Number.isFinite(amount) || amount <= 0) return;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const w = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    const already = await client.query(
      "SELECT 1 FROM wallet_transactions WHERE user_id = $1 AND reference_type = 'test_credit' LIMIT 1", [userId]
    );
    if (!already.rows.length) {
      const before = parseFloat(w.rows[0].balance || 0);
      await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2', [amount, userId]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_type, status)
         VALUES ($1, $2, 'bonus', $3, $4, $5, 'Test wallet credit', 'test_credit', 'success')`,
        [w.rows[0].id, userId, amount, before, before + amount]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('grantTestCredit error:', err.message);
  } finally {
    client.release();
  }
}
exports.grantTestCredit = grantTestCredit;

exports.getWallet = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id);
    res.json({ success: true, data: wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM wallet_transactions WHERE user_id = $1';
    const params = [req.user.id];

    if (type) { query += ` AND type = $${params.length + 1}`; params.push(type); }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRechargeOffers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM recharge_offers WHERE is_active = true ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Recharge Offer CRUD ────────────────────────────────────────────────

exports.adminListOffers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM recharge_offers ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Validates offer values that are present: amount ₹1–₹100000, bonus 0–100%. */
function offerError(amount, bonusPercent) {
  if (amount != null) {
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 1 || a > 100000) return 'Amount must be between ₹1 and ₹100000';
  }
  if (bonusPercent != null) {
    const b = Number(bonusPercent);
    if (!Number.isFinite(b) || b < 0 || b > 100) return 'Bonus must be between 0% and 100%';
  }
  return null;
}

exports.adminCreateOffer = async (req, res) => {
  try {
    const { amount, bonus_percent, label, sort_order = 0 } = req.body;
    if (!amount || bonus_percent == null) return res.status(400).json({ success: false, message: 'amount and bonus_percent are required' });
    const offerErr = offerError(amount, bonus_percent);
    if (offerErr) return res.status(400).json({ success: false, message: offerErr });
    const result = await db.query(
      'INSERT INTO recharge_offers (amount, bonus_percent, label, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [amount, bonus_percent, label || null, sort_order]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'An active offer for this amount already exists. Edit or disable it instead.' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.adminUpdateOffer = async (req, res) => {
  try {
    const { amount, bonus_percent, label, sort_order, is_active } = req.body;
    const offerErr = offerError(amount, bonus_percent);
    if (offerErr) return res.status(400).json({ success: false, message: offerErr });
    const result = await db.query(
      `UPDATE recharge_offers SET amount = COALESCE($1, amount), bonus_percent = COALESCE($2, bonus_percent),
       label = COALESCE($3, label), sort_order = COALESCE($4, sort_order), is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [amount, bonus_percent, label, sort_order, is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Another active offer already uses this amount. Disable it first.' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.adminDeleteOffer = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM recharge_offers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create Razorpay order to add money
const MAX_RECHARGE = 100000; // ₹1 lakh per top-up

exports.createAddMoneyOrder = async (req, res) => {
  try {
    // Always work with a real number: a string amount ("100") would otherwise be
    // concatenated below (walletCredit "100" + 50 → "10050").
    const amount = Number(req.body.amount); // INR
    if (!Number.isFinite(amount)) return res.status(400).json({ success: false, message: 'Enter a valid amount' });
    if (amount < 50) return res.status(400).json({ success: false, message: 'Minimum recharge is ₹50' });
    if (amount > MAX_RECHARGE) return res.status(400).json({ success: false, message: `Maximum recharge is ₹${MAX_RECHARGE}` });
    if (Math.round(amount * 100) !== amount * 100) return res.status(400).json({ success: false, message: 'Amount can have at most 2 decimal places' });

    // Look up bonus for this amount
    const offerResult = await db.query(
      'SELECT bonus_percent FROM recharge_offers WHERE amount = $1 AND is_active = true LIMIT 1',
      [amount]
    );
    const bonusPercent = offerResult.rows[0]?.bonus_percent || 0;
    const bonusAmount = Math.round(amount * bonusPercent) / 100;
    const walletCredit = amount + bonusAmount;

    if (!razorpay) {
      // Dev mode: simulate
      const orderId = `order_demo_${Date.now()}`;
      await db.query(
        'INSERT INTO wallet_orders (order_id, user_id, amount_paid, wallet_credit, bonus_amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (order_id) DO NOTHING',
        [orderId, req.user.id, amount, walletCredit, bonusAmount]
      );
      return res.json({
        success: true,
        data: {
          order_id: orderId,
          amount: amount * 100,
          currency: 'INR',
          key: 'rzp_test_demo',
          wallet_credit: walletCredit,
          bonus_amount: bonusAmount,
          bonus_percent: bonusPercent,
        }
      });
    }

    const chargeAmount = Math.round(amount * 1.18 * 100); // base amount + 18% GST in paise
    const order = await razorpay.orders.create({
      amount: chargeAmount,
      currency: 'INR',
      receipt: `w_${Date.now()}`,
      notes: { user_id: req.user.id, wallet_credit: walletCredit },
    });

    await db.query(
      'INSERT INTO wallet_orders (order_id, user_id, amount_paid, wallet_credit, bonus_amount) VALUES ($1, $2, $3, $4, $5)',
      [order.id, req.user.id, amount, walletCredit, bonusAmount]
    );

    res.json({ success: true, data: { order_id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID, wallet_credit: walletCredit, bonus_amount: bonusAmount, bonus_percent: bonusPercent } });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, message: 'Payment gateway error' });
  }
};

// ── Payment crediting ─────────────────────────────────────────────────────────
// A wallet order is credited exactly once, by whichever path sees the payment
// first: the app's verify call, the app's reconcile call, the Razorpay webhook
// or the periodic reconciliation cron. This matters for wallet/redirect
// payment methods (e.g. MobiKwik) where checkout reports success but the app's
// success callback — and therefore the verify call — can be lost.

const crypto = require('crypto');

/** Atomically mark a pending order completed and credit the wallet. */
async function creditOrder(orderId, { paymentId = null, method = null } = {}) {
  const client = await db.pool.connect();
  let credited = null;
  try {
    await client.query('BEGIN');
    const o = await client.query(
      `UPDATE wallet_orders
         SET status = 'completed', payment_id = COALESCE($2, payment_id), method = COALESCE($3, method),
             credited_at = NOW(), updated_at = NOW()
       WHERE order_id = $1 AND status = 'pending'
       RETURNING *`,
      [orderId, paymentId, method]
    );
    if (!o.rows.length) { await client.query('ROLLBACK'); return null; } // unknown or already credited
    const order = o.rows[0];
    const userId = order.user_id;
    const creditAmount = parseFloat(order.wallet_credit);
    const bonusAmount = parseFloat(order.bonus_amount || 0);

    await client.query('INSERT INTO wallets (user_id) VALUES ($1::uuid) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const w = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1::uuid FOR UPDATE', [userId]);
    const before = parseFloat(w.rows[0].balance || 0);
    await client.query(
      'UPDATE wallets SET balance = balance + $1, total_added = total_added + $1, updated_at = NOW() WHERE user_id = $2::uuid',
      [creditAmount, userId]
    );

    const baseAmount = creditAmount - bonusAmount;
    const description = bonusAmount > 0
      ? `Wallet recharge ₹${baseAmount.toFixed(0)} + ₹${bonusAmount.toFixed(0)} bonus`
      : 'Wallet recharge';
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description,
                                        reference_id, reference_type, gateway_transaction_id, payment_gateway, status)
       VALUES ($1, $2::uuid, 'credit', $3, $4, $5, $6, $7, 'wallet_order', $8, 'razorpay', 'success')`,
      [w.rows[0].id, userId, creditAmount, before, before + creditAmount, description, orderId, order.payment_id]
    );
    await client.query('COMMIT');
    credited = { userId, creditAmount, bonusAmount };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const notifMsg = credited.bonusAmount > 0
    ? `₹${credited.creditAmount} credited (includes ₹${credited.bonusAmount} bonus)!`
    : `₹${credited.creditAmount} has been credited to your wallet.`;
  sendPushNotification([credited.userId], '💰 Money Added!', notifMsg, { type: 'wallet_credit', amount: String(credited.creditAmount) })
    .catch(() => {});
  return credited;
}

/**
 * Ask Razorpay whether an order has been paid. Captures an authorized-but-not-
 * captured payment (accounts without auto-capture) and credits the wallet.
 * Returns 'credited' | 'already' | 'unpaid' | 'unavailable'.
 */
async function reconcileOrder(orderId) {
  if (!razorpay) return 'unavailable';
  const order = await db.query('SELECT * FROM wallet_orders WHERE order_id = $1', [orderId]);
  if (!order.rows.length) return 'unpaid';
  if (order.rows[0].status === 'completed') return 'already';

  const expectedPaise = Math.round(parseFloat(order.rows[0].amount_paid) * 1.18 * 100);
  const { items = [] } = await razorpay.orders.fetchPayments(orderId);
  let payment = items.find(p => p.status === 'captured');
  if (!payment) {
    const authorized = items.find(p => p.status === 'authorized');
    if (authorized) {
      try {
        payment = await razorpay.payments.capture(authorized.id, authorized.amount, authorized.currency || 'INR');
      } catch (e) {
        console.error(`[wallet] capture failed for ${authorized.id}:`, e.error?.description || e.message);
        return 'unpaid';
      }
    }
  }
  if (!payment || payment.status !== 'captured') return 'unpaid';
  if (Math.abs(Number(payment.amount) - expectedPaise) > 1) {
    console.error(`[wallet] amount mismatch on ${orderId}: paid ${payment.amount}, expected ${expectedPaise} — not crediting`);
    return 'unpaid';
  }
  const result = await creditOrder(orderId, { paymentId: payment.id, method: payment.wallet || payment.method || null });
  return result ? 'credited' : 'already';
}
exports.reconcileOrder = reconcileOrder;

// Verify and credit wallet after the app's payment-success callback
exports.verifyAndCredit = async (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;
    if (!order_id) return res.status(400).json({ success: false, message: 'order_id is required' });

    const orderRow = await db.query('SELECT * FROM wallet_orders WHERE order_id = $1 AND user_id = $2', [order_id, req.user.id]);
    if (!orderRow.rows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderRow.rows[0];

    let outcome;
    if (order.status === 'completed') {
      outcome = 'already';
    } else if (!razorpay) {
      // Dev mode only (no gateway configured): demo orders are credited directly
      outcome = (await creditOrder(order_id, { paymentId: payment_id || null, method: 'demo' })) ? 'credited' : 'already';
    } else {
      const validSignature = !!(signature && payment_id && process.env.RAZORPAY_KEY_SECRET) &&
        crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${order_id}|${payment_id}`).digest('hex') === signature;
      outcome = validSignature
        ? ((await creditOrder(order_id, { paymentId: payment_id })) ? 'credited' : 'already')
        : await reconcileOrder(order_id); // no/invalid signature: trust only Razorpay's own record
    }

    if (outcome !== 'credited' && outcome !== 'already') {
      return res.status(400).json({ success: false, message: 'Payment not confirmed yet. If money was deducted it will be added automatically within a few minutes.' });
    }
    const updated = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    const credit = parseFloat(order.wallet_credit);
    res.json({
      success: true,
      data: updated.rows[0],
      message: `₹${credit} added to wallet`,
      bonus_amount: parseFloat(order.bonus_amount || 0),
      already_credited: outcome === 'already',
    });
  } catch (err) {
    console.error('verifyAndCredit error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// App: check the caller's recent pending top-ups against Razorpay and credit
// any that were actually paid. Called when the wallet screen opens/resumes and
// after every checkout outcome (success, error or external wallet).
exports.reconcilePending = async (req, res) => {
  try {
    const { order_id } = req.body || {};
    const pending = await db.query(
      `SELECT order_id FROM wallet_orders
       WHERE user_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '3 days'
         AND ($2::text IS NULL OR order_id = $2)
       ORDER BY created_at DESC LIMIT 10`,
      [req.user.id, order_id || null]
    );
    const credited = [];
    for (const row of pending.rows) {
      try {
        if ((await reconcileOrder(row.order_id)) === 'credited') credited.push(row.order_id);
      } catch (e) {
        console.error(`[wallet] reconcile ${row.order_id} failed:`, e.error?.description || e.message);
      }
    }
    const wallet = await ensureWallet(req.user.id);
    res.json({ success: true, data: { wallet, credited_orders: credited } });
  } catch (err) {
    console.error('reconcilePending error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Razorpay webhook (configure in Razorpay dashboard → Webhooks:
//   URL  https://api.grahvarta.com/api/wallet/razorpay-webhook
//   events: payment.captured, order.paid
//   secret: same value as RAZORPAY_WEBHOOK_SECRET)
// Mounted with express.raw() in server.js so the signature is computed on the raw body.
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ success: false, message: 'Webhook not configured' });
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const given = String(req.headers['x-razorpay-signature'] || '');
    if (given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    const event = JSON.parse(raw.toString('utf8'));
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id || event.payload?.order?.entity?.id;
    if (orderId && (event.event === 'payment.captured' || event.event === 'order.paid')) {
      const order = await db.query('SELECT amount_paid FROM wallet_orders WHERE order_id = $1', [orderId]);
      if (order.rows.length) {
        const expectedPaise = Math.round(parseFloat(order.rows[0].amount_paid) * 1.18 * 100);
        if (payment && Math.abs(Number(payment.amount) - expectedPaise) > 1) {
          console.error(`[wallet] webhook amount mismatch on ${orderId}`);
        } else {
          await creditOrder(orderId, { paymentId: payment?.id || null, method: payment?.wallet || payment?.method || null });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('razorpayWebhook error:', err);
    res.status(500).json({ success: false });
  }
};

// Cron: credit any top-ups paid in the last 24h that no client path reported
exports.reconcileStaleOrders = async () => {
  if (!razorpay) return;
  try {
    const pending = await db.query(
      `SELECT order_id FROM wallet_orders
       WHERE status = 'pending' AND order_id NOT LIKE 'order_demo_%'
         AND created_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '2 minutes'
       ORDER BY created_at DESC LIMIT 50`
    );
    for (const row of pending.rows) {
      try {
        const r = await reconcileOrder(row.order_id);
        if (r === 'credited') console.log(`[wallet] reconciled & credited ${row.order_id}`);
      } catch (e) {
        console.error(`[wallet] cron reconcile ${row.order_id}:`, e.error?.description || e.message);
      }
    }
  } catch (err) {
    console.error('[wallet] reconcileStaleOrders error:', err.message);
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.purchaseSubscription = async (req, res) => {
  try {
    const { plan_id } = req.body;

    const planResult = await db.query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [plan_id]);
    if (!planResult.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });
    const plan = planResult.rows[0];

    const wallet = await ensureWallet(req.user.id);
    if (wallet.balance < plan.price) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance', required: plan.price, balance: wallet.balance });
    }

    // Deduct from wallet
    await db.query('UPDATE wallets SET balance = balance - $1, total_spent = total_spent + $1 WHERE user_id = $2', [plan.price, req.user.id]);

    const tx = await db.query(`
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_type)
      VALUES ($1, $2, 'debit', $3, $4, $5, $6, 'subscription') RETURNING id
    `, [wallet.id, req.user.id, plan.price, wallet.balance, wallet.balance - plan.price, `${plan.name} plan subscription`]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    await db.query(`
      INSERT INTO user_subscriptions (user_id, plan_id, starts_at, expires_at, amount_paid, transaction_id)
      VALUES ($1, $2, NOW(), $3, $4, $5)
    `, [req.user.id, plan_id, expiresAt, plan.price, tx.rows[0].id]);

    await db.query('UPDATE users SET subscription_plan = $1, subscription_expires_at = $2 WHERE id = $3', [plan.name.toLowerCase(), expiresAt, req.user.id]);

    // Credit free minutes if plan includes them
    if (plan.free_minutes > 0) {
      const freeCredit = plan.free_minutes; // convert to rupees at base rate
      await db.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [freeCredit, req.user.id]);
    }

    res.json({ success: true, message: `Subscribed to ${plan.name} plan`, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getWalletStats = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id);
    const txStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'credit') as total_credits,
        COUNT(*) FILTER (WHERE type = 'debit') as total_debits,
        SUM(amount) FILTER (WHERE type = 'credit') as total_credited,
        SUM(amount) FILTER (WHERE type = 'debit') as total_debited,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as transactions_this_month
      FROM wallet_transactions WHERE user_id = $1
    `, [req.user.id]);

    const subscription = await db.query(`
      SELECT us.*, sp.name, sp.features FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active' AND us.expires_at > NOW()
      ORDER BY us.expires_at DESC LIMIT 1
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        wallet,
        stats: txStats.rows[0],
        active_subscription: subscription.rows[0] || null,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
