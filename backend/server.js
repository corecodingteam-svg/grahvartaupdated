require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*')
  .split(',').map(o => o.trim());

// Socket.io setup
const io = new Server(server, {
  cors: { origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  upgradeTimeout: 30000,
  allowEIO3: true,
  maxHttpBufferSize: 1e6,
});

// Security middleware
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
// Behind exactly one reverse proxy (nginx) — use the real client IP from
// X-Forwarded-For. Without this every visitor shares nginx's IP, so the rate
// limiter below would throttle the whole site as if it were one person.
app.set('trust proxy', 1);
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));

// Brute-force protection for credentials and one-time codes (per client IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
});
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many verification requests. Please try again in an hour.' },
});
app.use(['/api/auth/login', '/api/auth/register', '/api/admin/login', '/api/auth/change-password'], authLimiter);
app.use(['/api/hirings/send-otp', '/api/hirings/verify-otp'], otpLimiter);
app.use(morgan('dev'));
// Razorpay webhook needs the raw body for signature verification — must be before express.json()
app.post('/api/wallet/razorpay-webhook', express.raw({ type: '*/*', limit: '1mb' }), require('./src/controllers/walletController').razorpayWebhook);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// User uploads: never let an uploaded file run as a web page on this domain.
// Only known image/PDF types are shown inline; everything else downloads,
// and a locked-down CSP blocks scripts even inside SVGs.
const INLINE_UPLOAD = /\.(jpe?g|png|gif|webp|heic|heif|pdf)$/i;
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    if (!INLINE_UPLOAD.test(filePath)) res.setHeader('Content-Disposition', 'attachment');
  },
}));

// Attach io to req for use in controllers
app.use((req, _, next) => { req.io = io; next(); });

// REST Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/horoscope', require('./src/routes/horoscope'));
app.use('/api', require('./src/routes/content'));
app.use('/api/astrologers', require('./src/routes/astrologers'));
app.use('/api/threads', require('./src/routes/threads'));
app.use('/api/wallet', require('./src/routes/wallet'));
app.use('/api/live', require('./src/routes/live'));
app.use('/api/agora', require('./src/routes/agora'));
app.use('/api/withdrawal', require('./src/routes/withdrawal'));
app.use('/api/consultations', require('./src/routes/consultations'));
app.use('/api/family-members', require('./src/routes/familyMembers'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/hirings', require('./src/routes/hirings'));

// Health
app.get('/health', (_, res) => res.json({ success: true, message: 'Astro Talk API v2', ts: new Date() }));

// Socket.io
const { initSocket } = require('./src/socket/index');
initSocket(io);

// Cron: daily horoscope push at 7am
cron.schedule('0 7 * * *', async () => {
  const { sendDailyHoroscopePush } = require('./src/controllers/liveController');
  await sendDailyHoroscopePush();
});

// Cron: process due withdrawals every hour
cron.schedule('0 * * * *', async () => {
  const { processDueWithdrawals } = require('./src/controllers/withdrawalController');
  await processDueWithdrawals();
});

// Cron: credit wallet top-ups that were paid but never confirmed by the app (every 5 min)
cron.schedule('*/5 * * * *', async () => {
  const { reconcileStaleOrders } = require('./src/controllers/walletController');
  await reconcileStaleOrders();
});

// Cron: clear stale queued consultations every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const db = require('./src/config/database');

    // Cancel consultations that have been queued for more than 10 minutes
    const stale = await db.query(
      `UPDATE consultations
       SET status = 'cancelled', ended_at = NOW()
       WHERE status = 'queued'
         AND created_at < NOW() - INTERVAL '10 minutes'
       RETURNING id, astrologer_id`
    );

    if (stale.rows.length === 0) return;

    for (const row of stale.rows) {
      // Clear from queue table
      await db.query(
        `UPDATE consultation_queue SET status = 'cancelled'
         WHERE consultation_id = $1 AND status = 'waiting'`,
        [row.id]
      );

      // Decrement astrologer queue count
      await db.query(
        `UPDATE astrologers SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1`,
        [row.astrologer_id]
      );

      // Notify user via socket if still connected
      io.to(`consultation:${row.id}`).emit('consultation_ended', {
        consultation_id: row.id,
        reason: 'queue_timeout',
      });
    }

    console.log(`[Queue cleaner] Cleared ${stale.rows.length} stale consultation(s)`);
  } catch (err) {
    console.error('[Queue cleaner] Error:', err.message);
  }
});

// 404 & error handler
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, _, res, __) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

server.listen(PORT, () => console.log(`🔮 Astro Talk API v2 running on port ${PORT}`));
module.exports = { app, io };
