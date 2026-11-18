const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { BillingEngine } = require('./billingEngine');
const { sendPushNotification } = require('../controllers/liveController');
const { saveMessage, insertSessionDivider } = require('../controllers/threadController');
const { detectContactInfo, blockedMessageText } = require('../utils/contactFilter');
const { parseEnvelope, partyKeys } = require('../utils/chatE2e');
const transcription = require('../utils/transcription');

const billingEngines = new Map(); // consultationId -> BillingEngine
const activeRooms = new Map();    // consultationId -> { userId, astrologerId, type }
const onlineUsers = new Map();       // userId -> socketId
const offlineTimers = new Map();     // astrologerId -> pending "go offline" timer

// An astrologer can have several sockets at once (app reconnects, a second
// device, the web portal). Every astrologer socket joins this room; the
// astrologer is "connected" while the room is non-empty.
const astroRoom = (astrologerId) => `astrologer:${astrologerId}`;
const OFFLINE_GRACE_MS = 15000; // ride out quick reconnects (mobile networks, app switching) without flickering offline

const isOnHold = (holdUntil) => !!(holdUntil && new Date(holdUntil).getTime() > Date.now());

function initSocket(io) {
  const isAstrologerConnected = (astrologerId) =>
    (io.sockets.adapter.rooms.get(astroRoom(astrologerId))?.size || 0) > 0;

  /** Broadcast an astrologer's current presence + per-channel availability. */
  async function broadcastAstrologerStatus(astrologerId) {
    const r = await db.query(
      `SELECT id, is_online, is_available, is_chat_available, is_call_available, is_video_available
       FROM astrologers WHERE id = $1`,
      [astrologerId]
    );
    if (!r.rows.length) return;
    const a = r.rows[0];
    const payload = {
      astrologer_id: a.id,
      is_online: a.is_online,
      is_available: a.is_available,
      is_chat_available: a.is_chat_available,
      is_call_available: a.is_call_available,
      is_video_available: a.is_video_available,
    };
    io.emit(a.is_online ? 'astrologer_online' : 'astrologer_offline', payload);
    io.emit('astrologer_availability', payload);
  }

  /**
   * Deliver a call event (started / rejected / ended) to everyone in the call:
   * the consultation room AND both people's personal rooms. Phones reconnect
   * often (new socket each time) and drop out of the consultation room, but
   * every socket joins user:<id> on connect — so nobody misses a hang-up and
   * is left ringing. Socket.IO sends once per socket even if it is in several
   * of these rooms.
   */
  async function emitToParties(consultationId, event, payload) {
    const r = await db.query(
      `SELECT c.user_id, a.user_id AS astro_user_id FROM consultations c
       JOIN astrologers a ON a.id = c.astrologer_id WHERE c.id = $1`,
      [consultationId]
    ).catch(() => ({ rows: [] }));
    let target = io.to(`consultation:${consultationId}`);
    if (r.rows[0]) target = target.to(`user:${r.rows[0].user_id}`).to(`user:${r.rows[0].astro_user_id}`);
    target.emit(event, payload);
  }
  io.emitToParties = (id, ev, data) => emitToParties(id, ev, data).catch(err => console.error('[emitToParties]', err.message));

  // Server start: nobody is connected yet, so nobody is online. Sockets that
  // reconnect re-announce themselves via set_role.
  db.query('UPDATE astrologers SET is_online = FALSE WHERE is_online = TRUE')
    .catch(err => console.error('[presence] reset failed:', err.message));

  // Lets REST controllers (availability toggle) know whether a socket is live
  io.isAstrologerConnected = isAstrologerConnected;
  io.broadcastAstrologerStatus = broadcastAstrologerStatus;

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await db.query('SELECT id, name, sun_sign, is_banned, hold_until FROM users WHERE id = $1', [decoded.userId]);
      if (!result.rows.length) return next(new Error('User not found'));
      if (result.rows[0].is_banned) return next(new Error('Account locked'));
      const { is_banned, hold_until, ...user } = result.rows[0];
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${socket.user.name} (${socket.id})`);
    // Per-user room so admin actions (warn / hold / lock) can reach every device
    socket.join(`user:${userId}`);

    // ─── PRESENCE ───────────────────────────────────────────────
    socket.on('set_role', async ({ role }) => {
      socket.role = role;
      console.log(`[set_role] user=${socket.user.name} (${userId}) role=${role} socket=${socket.id}`);
      if (role === 'astrologer') {
        const result = await db.query(
          `SELECT a.id, a.is_available, a.is_banned, a.status, u.hold_until
           FROM astrologers a JOIN users u ON u.id = a.user_id WHERE a.user_id = $1`,
          [userId]
        );
        console.log(`[set_role] astrologer DB lookup: found=${result.rows.length} rows`);
        if (result.rows.length) {
          const astro = result.rows[0];
          socket.astrologerId = astro.id;
          socket.join(astroRoom(astro.id));
          const pending = offlineTimers.get(astro.id);
          if (pending) { clearTimeout(pending); offlineTimers.delete(astro.id); }
          console.log(`Astrologer registered: ${socket.user.name} (astrologer_id=${socket.astrologerId}, socket=${socket.id})`);

          // Connected is not the same as online: the astrologer's own Online/Offline
          // toggle (is_available), approval, ban and hold all have to allow it.
          const canBeOnline = astro.is_available && !astro.is_banned && astro.status === 'approved' && !isOnHold(astro.hold_until);
          await db.query('UPDATE astrologers SET is_online = $1 WHERE id = $2', [canBeOnline, socket.astrologerId]);
          await broadcastAstrologerStatus(socket.astrologerId);

          // Notify astrologer of any pending queued consultations
          const queued = await db.query(
            `SELECT c.*, u.name as user_name FROM consultations c
             JOIN users u ON c.user_id = u.id
             WHERE c.astrologer_id = $1 AND c.status = 'queued'`,
            [socket.astrologerId]
          );
          for (const c of queued.rows) {
            // Always notify astrologer — user may still be reconnecting
            socket.emit('new_consultation_request', {
              consultation_id: c.id,
              user: { id: c.user_id, name: c.user_name },
              type: c.type,
              rate: c.per_minute_rate,
            });
          }
        }
      } else {
        onlineUsers.set(userId, socket.id);
      }
    });

    // ─── CONSULTATION REQUEST ────────────────────────────────────
    socket.on('request_consultation', async ({ astrologer_id, type }) => {
      try {
        console.log(`[request_consultation] user=${userId} astrologer_id=${astrologer_id} type=${type}`);

        // Reuse existing active/queued consultation if one exists
        const existing = await db.query(
          `SELECT * FROM consultations
           WHERE user_id = $1 AND status IN ('queued', 'active')
           ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );
        if (existing.rows.length) {
          const c = existing.rows[0];

          console.log(`[existing consultation] id=${c.id} status=${c.status} astrologer_id=${c.astrologer_id} requested=${astrologer_id}`);

          // If stale queued consultation is for a DIFFERENT astrologer, cancel it and proceed fresh
          if (c.status === 'queued' && c.astrologer_id !== astrologer_id) {
            await db.query(`UPDATE consultations SET status='cancelled', ended_at=NOW() WHERE id=$1`, [c.id]);
            await db.query(`UPDATE consultation_queue SET status='cancelled' WHERE consultation_id=$1`, [c.id]);
            await db.query(`UPDATE astrologers SET queue_count=GREATEST(queue_count-1,0) WHERE id=$1`, [c.astrologer_id]);
            console.log(`[existing consultation] cancelled stale queued consultation ${c.id} for different astrologer`);
            // fall through to create new consultation below
          } else {
          socket.consultationId = c.id;
          socket.join(`consultation:${c.id}`);

          if (c.status === 'active') {
            // Emit started first so Flutter sets isConnected = true
            socket.emit('consultation_started', { consultation_id: c.id, type: c.type });

            // Sync current billing state so timer and amount are correct
            const engine = billingEngines.get(c.id);
            if (engine) {
              socket.emit('billing_tick', {
                seconds: engine.secondsElapsed,
                amount_charged: engine.totalCharged,
              });
            }
          } else {
            socket.emit('consultation_queued', { consultation_id: c.id, position: 1, estimated_wait: 5 });

            // Re-notify astrologer in case they missed the original request
            const astroConnected = isAstrologerConnected(c.astrologer_id);
            console.log(`[re-notify] astrologer_id=${c.astrologer_id} connected=${astroConnected}`);
            if (astroConnected) {
              io.to(astroRoom(c.astrologer_id)).emit('new_consultation_request', {
                consultation_id: c.id,
                user: socket.user,
                type: c.type,
                rate: c.per_minute_rate,
              });
              console.log(`Re-notified astrologer ${c.astrologer_id} of existing queued consultation ${c.id}`);
            }
          }
          return;
          } // end else (same astrologer)
        }

        // Check wallet balance — create wallet row if it doesn't exist yet
        await db.query(
          `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );
        const walletResult = await db.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
        const balance = parseFloat(walletResult.rows[0]?.balance ?? 0);

        const rateCol = type === 'chat' ? 'per_minute_rate_chat' : type === 'voice' ? 'per_minute_rate_call' : 'per_minute_rate_video';
        const channelCol = type === 'chat' ? 'is_chat_available' : type === 'voice' ? 'is_call_available' : 'is_video_available';
        const astroResult = await db.query(
          `SELECT a.id, a.user_id, a.display_name, a.${rateCol} as rate, a.is_online, a.is_available, a.queue_count,
                  a.is_banned, a.${channelCol} AS channel_available, u.hold_until AS astro_hold_until,
                  (SELECT 1 FROM astrologer_blocked_users b WHERE b.astrologer_id = a.id AND b.user_id = $2) AS blocked,
                  (SELECT hold_until FROM users WHERE id = $2) AS user_hold_until
           FROM astrologers a JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
          [astrologer_id, userId]
        );

        if (!astroResult.rows.length) return socket.emit('error', { message: 'Astrologer not found' });
        const astro = astroResult.rows[0];
        const rate = parseFloat(astro.rate);

        const typeLabel = type === 'chat' ? 'chat' : type === 'voice' ? 'voice calls' : 'video calls';
        let unavailable = null;
        if (isOnHold(astro.user_hold_until)) unavailable = { reason: 'account_on_hold', message: 'Your account is on hold. You cannot start consultations right now.' };
        else if (astro.blocked) unavailable = { reason: 'blocked', message: `${astro.display_name} is not available for consultations with you.` };
        else if (astro.is_banned || isOnHold(astro.astro_hold_until)) unavailable = { reason: 'astrologer_unavailable', message: `${astro.display_name} is not available right now.` };
        else if (!astro.is_online || !astro.is_available) unavailable = { reason: 'astrologer_offline', message: `${astro.display_name} is offline right now. Please try again later.` };
        else if (!astro.channel_available) unavailable = { reason: 'channel_unavailable', message: `${astro.display_name} is not taking ${typeLabel} right now.` };
        if (unavailable) {
          socket.emit('consultation_unavailable', { astrologer_id, type, ...unavailable });
          return socket.emit('error', { message: unavailable.message, code: unavailable.reason });
        }

        if (balance < rate) {
          return socket.emit('insufficient_balance', { required: rate, balance });
        }

        // Create consultation record
        const consultation = await db.query(
          `INSERT INTO consultations (user_id, astrologer_id, type, status, per_minute_rate, session_token)
           VALUES ($1, $2, $3, 'queued', $4, $5) RETURNING *`,
          [userId, astrologer_id, type, astro.rate, require('uuid').v4()]
        );
        const consultationId = consultation.rows[0].id;

        // Add to queue
        const queuePos = await db.query(
          `INSERT INTO consultation_queue (astrologer_id, user_id, consultation_id, consultation_type, position, status)
           VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position),0)+1 FROM consultation_queue WHERE astrologer_id=$1 AND status='waiting'), $5)
           RETURNING position`,
          [astrologer_id, userId, consultationId, type, 'waiting']
        );

        socket.consultationId = consultationId;
        socket.join(`consultation:${consultationId}`);

        socket.emit('consultation_queued', {
          consultation_id: consultationId,
          position: queuePos.rows[0].position,
          estimated_wait: queuePos.rows[0].position * 5,
          astrologer: astro,
        });

        // Notify astrologer via socket (if online) — retry once after 2s in case set_role is still resolving
        const notifyAstrologer = async (attempt = 1) => {
          const astroConnected = isAstrologerConnected(astrologer_id);
          console.log(`[notify attempt ${attempt}] astrologer_id=${astrologer_id} connected=${astroConnected}`);
          if (astroConnected) {
            io.to(astroRoom(astrologer_id)).emit('new_consultation_request', {
              consultation_id: consultationId,
              user: socket.user,
              type,
              rate: astro.rate,
            });
            return true;
          }
          return false;
        };

        const notified = await notifyAstrologer(1);
        if (!notified) {
          // Retry after 2s (astrologer may still be completing set_role)
          setTimeout(() => notifyAstrologer(2), 2000);
        }

        // Always send push notification so astrologer is notified even if app is closed
        const astroUserResult = await db.query('SELECT user_id FROM astrologers WHERE id = $1', [astrologer_id]);
        if (astroUserResult.rows.length) {
          const typeLabel = type === 'chat' ? 'Chat' : type === 'voice' ? 'Voice Call' : 'Video Call';
          await sendPushNotification(
            [astroUserResult.rows[0].user_id],
            `New ${typeLabel} Request 🔔`,
            `${socket.user.name} is requesting a ${typeLabel.toLowerCase()} consultation. Open the app to accept.`,
            { type: 'consultation_request', consultation_id: consultationId }
          );
        }

        await db.query('UPDATE astrologers SET queue_count = queue_count + 1 WHERE id = $1', [astrologer_id]);
      } catch (err) {
        console.error('Consultation request error:', err);
        socket.emit('error', { message: 'Failed to create consultation' });
      }
    });

    // ─── AUTHORIZATION: is this socket's user a party to the consultation? ──
    // Returns 'user' | 'astrologer' | null. Every consultation event below is
    // checked with it, so nobody can join, read, accept, end or post into a
    // session that isn't theirs.
    const partyCache = new Map();
    const partyOf = async (consultationId) => {
      if (!consultationId || typeof consultationId !== 'string') return null;
      if (partyCache.has(consultationId)) return partyCache.get(consultationId);
      const r = await db.query(
        `SELECT c.user_id, a.user_id AS astro_user_id FROM consultations c
         JOIN astrologers a ON a.id = c.astrologer_id WHERE c.id = $1`,
        [consultationId]
      ).catch(() => ({ rows: [] }));
      const row = r.rows[0];
      const party = !row ? null : row.astro_user_id === userId ? 'astrologer' : row.user_id === userId ? 'user' : null;
      if (party) partyCache.set(consultationId, party);
      return party;
    };
    const inRoom = (consultationId) => socket.rooms.has(`consultation:${consultationId}`);

    // ─── ASTROLOGER ACCEPTS ──────────────────────────────────────
    socket.on('accept_consultation', async ({ consultation_id }) => {
      try {
        if ((await partyOf(consultation_id)) !== 'astrologer') return;
        const now = new Date();
        // Only a still-queued request can be accepted (also prevents a double
        // accept from starting two billing engines)
        const consult = await db.query(
          `UPDATE consultations SET status='active', started_at=$1 WHERE id=$2 AND status='queued' RETURNING *`,
          [now, consultation_id]
        );
        if (!consult.rows.length) return;

        await db.query(`UPDATE consultation_queue SET status='called' WHERE consultation_id=$1`, [consultation_id]);

        activeRooms.set(consultation_id, {
          userId: consult.rows[0].user_id,
          astrologerId: consult.rows[0].astrologer_id,
          type: consult.rows[0].type,
          rate: consult.rows[0].per_minute_rate,
        });

        // Start billing engine
        const billing = new BillingEngine(consultation_id, consult.rows[0].per_minute_rate, db, io, sendPushNotification);
        billing.start(consult.rows[0].user_id, consult.rows[0].astrologer_id);
        billingEngines.set(consultation_id, billing);

        socket.join(`consultation:${consultation_id}`);
        // Insert a session-start divider into the persistent thread
        const sessionLabel = `── Session started ${now.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} ──`;
        await insertSessionDivider({
          userId: consult.rows[0].user_id,
          astrologerId: consult.rows[0].astrologer_id,
          consultationId: consultation_id,
          label: sessionLabel,
        });

        io.emitToParties(consultation_id, 'consultation_started', {
          consultation_id,
          started_at: now,
          type: consult.rows[0].type,
          webrtc_room: consultation_id,
        });

        // Voice/video: start Agora speech-to-text so the call gets a transcript
        if (consult.rows[0].type === 'voice' || consult.rows[0].type === 'video') {
          transcription.start(consultation_id).catch(err => console.error('[stt] start failed:', err.message));
        }
      } catch (err) {
        console.error('Accept error:', err);
      }
    });

    // ─── JOIN EXISTING CONSULTATION ROOM (astrologer portal chat) ──
    socket.on('join_consultation', async ({ consultation_id }) => {
      if (!(await partyOf(consultation_id))) return;
      socket.join(`consultation:${consultation_id}`);
      // Reconnected after the other side already hung up / declined? Tell it now.
      const st = await db.query('SELECT status, duration_seconds, total_amount FROM consultations WHERE id = $1', [consultation_id]).catch(() => ({ rows: [] }));
      const status = st.rows[0]?.status;
      if (status === 'cancelled') socket.emit('consultation_rejected', { consultation_id });
      if (['completed', 'cancelled', 'missed'].includes(status)) {
        socket.emit('consultation_ended', { consultation_id, reason: status, duration: st.rows[0].duration_seconds, total_amount: st.rows[0].total_amount });
      }
    });

    // ─── REJECT / DECLINE ────────────────────────────────────────
    socket.on('reject_consultation', async ({ consultation_id }) => {
      if (!(await partyOf(consultation_id))) return;
      const r = await db.query(
        `UPDATE consultations SET status='cancelled', ended_at=NOW() WHERE id=$1 AND status='queued' RETURNING astrologer_id`,
        [consultation_id]
      );
      if (!r.rows.length) return;
      await db.query(`UPDATE consultation_queue SET status='cancelled' WHERE consultation_id=$1`, [consultation_id]).catch(() => {});
      await db.query('UPDATE astrologers SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1', [r.rows[0].astrologer_id]).catch(() => {});
      io.emitToParties(consultation_id, 'consultation_rejected', { consultation_id });
    });

    // ─── CHAT MESSAGES ───────────────────────────────────────────
    socket.on('send_message', async ({ consultation_id, content, message_type = 'text', media_url }) => {
      try {
        // Sender role comes from the consultation itself, never from the client
        const party = await partyOf(consultation_id);
        if (!party) return;
        if (!['text', 'image', 'e2e'].includes(message_type)) return;
        if (typeof content !== 'string' || !content.trim()) return;
        if (message_type !== 'e2e' && content.length > 5000) return;

        // End-to-end encryption: once both people have chat keys, only encrypted
        // envelopes addressed to their current keys are accepted. The server
        // cannot read them; the contact filter runs on the sender's device.
        const keys = await partyKeys(consultation_id);
        const bothHaveKeys = !!(keys && keys.user.publicKey && keys.astrologer.publicKey);
        if (message_type === 'e2e') {
          const env = parseEnvelope(content);
          if (!env) return;
          const mine = keys?.[party]?.publicKey;
          const theirs = keys?.[party === 'user' ? 'astrologer' : 'user']?.publicKey;
          if (!mine || !theirs || env.s !== mine || env.r !== theirs) {
            // Sender used an outdated key (someone reset their chat PIN) — tell it to refresh and resend
            return socket.emit('e2e_key_stale', { consultation_id, my_key: mine || null, peer_key: theirs || null });
          }
        } else if (bothHaveKeys) {
          return socket.emit('e2e_key_stale', { consultation_id, my_key: keys[party].publicKey, peer_key: keys[party === 'user' ? 'astrologer' : 'user'].publicKey });
        }

        // Reset inactivity timer
        const engine = billingEngines.get(consultation_id);
        if (engine) engine.resetActivity();

        const senderRole = party;
        const room = activeRooms.get(consultation_id);

        // Sharing phone numbers / email addresses is not allowed — block and record it
        if (message_type === 'text') {
          const check = detectContactInfo(content);
          if (check.blocked) {
            await db.query(
              `INSERT INTO rule_violations (user_id, role, astrologer_id, consultation_id, violation_type, detected, content, channel)
               VALUES ($1, $2, $3, $4, 'contact_sharing', $5, $6, 'consultation_chat')`,
              [userId, senderRole, senderRole === 'astrologer' ? socket.astrologerId || null : (room?.astrologerId || null),
               consultation_id || null, check.detected, String(content).slice(0, 2000)]
            ).catch(err => console.error('[violation] insert failed:', err.message));
            return socket.emit('message_blocked', {
              consultation_id,
              reason: 'contact_sharing',
              detected: check.detected,
              message: blockedMessageText(check.detected),
            });
          }
        }

        // Save to old per-session table (backward compat)
        const msg = await db.query(
          `INSERT INTO consultation_messages (consultation_id, sender_id, sender_type, message_type, content, media_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [consultation_id, userId, senderRole, message_type, content, media_url]
        );

        // Save to persistent astrologer-wise thread
        if (room) {
          await saveMessage({
            userId: room.userId,
            astrologerId: room.astrologerId,
            consultationId: consultation_id,
            senderId: userId,
            senderRole,
            message: content,
            messageType: message_type,
          });
        }

        io.to(`consultation:${consultation_id}`).emit('new_message', msg.rows[0]);
      } catch (err) {
        console.error('Message error:', err);
      }
    });

    // ─── BLOCKED ON THE DEVICE ───────────────────────────────────
    // With end-to-end encryption the contact filter runs in the app. A message
    // it stops is never sent to the other person; the app reports the attempt
    // here so the Violators page keeps working.
    socket.on('report_blocked_message', async ({ consultation_id, detected, content }) => {
      try {
        const party = await partyOf(consultation_id);
        if (!party) return;
        const kinds = Array.isArray(detected) ? detected.filter(d => d === 'phone' || d === 'email') : [];
        if (!kinds.length) return;
        // Re-check on the server so a client cannot file false violations
        const text = typeof content === 'string' ? content.slice(0, 2000) : '';
        if (!detectContactInfo(text).blocked) return;
        const room = activeRooms.get(consultation_id);
        await db.query(
          `INSERT INTO rule_violations (user_id, role, astrologer_id, consultation_id, violation_type, detected, content, channel)
           VALUES ($1, $2, $3, $4, 'contact_sharing', $5, $6, 'consultation_chat')`,
          [userId, party, party === 'astrologer' ? socket.astrologerId || null : (room?.astrologerId || null),
           consultation_id, [...new Set(kinds)], text]
        );
      } catch (err) {
        console.error('[violation] device report failed:', err.message);
      }
    });

    // ─── TYPING INDICATORS ──────────────────────────────────────
    socket.on('typing_start', ({ consultation_id }) => {
      if (!inRoom(consultation_id)) return;
      socket.to(`consultation:${consultation_id}`).emit('peer_typing', { is_typing: true });
    });
    socket.on('typing_stop', ({ consultation_id }) => {
      if (!inRoom(consultation_id)) return;
      socket.to(`consultation:${consultation_id}`).emit('peer_typing', { is_typing: false });
    });

    // ─── CALL TRANSCRIPT (Agora speech-to-text segments relayed by the app) ──
    // Payload: { consultation_id, segments: [{ uid, text, start_ms, language }] }
    // The astrologer always joins Agora with uid 1 (see astrologer_call_screen.dart),
    // so uid 1 is the astrologer and any other uid is the user.
    socket.on('transcript_segments', async ({ consultation_id, segments }) => {
      try {
        if (!consultation_id || !Array.isArray(segments) || !segments.length) return;
        const c = await db.query(
          `SELECT c.id, c.user_id, a.user_id AS astro_user_id FROM consultations c
           JOIN astrologers a ON a.id = c.astrologer_id WHERE c.id = $1`,
          [consultation_id]
        );
        if (!c.rows.length || (c.rows[0].user_id !== userId && c.rows[0].astro_user_id !== userId)) return;

        let saved = 0;
        for (const seg of segments.slice(0, 50)) {
          const text = String(seg?.text || '').trim();
          if (!text) continue;
          // NB: Number(null) === 0 — keep missing values as NULL, otherwise every
          // sentence gets start_ms 0 and the de-dup index drops all but the first.
          const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Math.trunc(Number(v));
          const uid = num(seg.uid);
          const startMs = num(seg.start_ms);
          const r = await db.query(
            `INSERT INTO consultation_transcripts (consultation_id, speaker_role, speaker_uid, text, language, start_ms)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [consultation_id, uid === 1 ? 'astrologer' : 'user', uid, text.slice(0, 4000), seg.language || null, startMs]
          );
          saved += r.rowCount;
        }
        if (saved) await db.query('UPDATE consultations SET has_transcript = TRUE WHERE id = $1 AND has_transcript = FALSE', [consultation_id]);
      } catch (err) {
        console.error('[transcript] save failed:', err.message);
      }
    });

    // ─── WEBRTC SIGNALING ────────────────────────────────────────
    socket.on('webrtc_offer', ({ consultation_id, sdp }) => {
      if (!inRoom(consultation_id)) return;
      billingEngines.get(consultation_id)?.resetActivity();
      socket.to(`consultation:${consultation_id}`).emit('webrtc_offer', { sdp, from: userId });
    });
    socket.on('webrtc_answer', ({ consultation_id, sdp }) => {
      if (!inRoom(consultation_id)) return;
      billingEngines.get(consultation_id)?.resetActivity();
      socket.to(`consultation:${consultation_id}`).emit('webrtc_answer', { sdp, from: userId });
    });
    socket.on('webrtc_ice_candidate', ({ consultation_id, candidate }) => {
      if (!inRoom(consultation_id)) return;
      billingEngines.get(consultation_id)?.resetActivity();
      socket.to(`consultation:${consultation_id}`).emit('webrtc_ice_candidate', { candidate, from: userId });
    });

    // ─── END CONSULTATION ────────────────────────────────────────
    socket.on('end_consultation', async ({ consultation_id }) => {
      if (!(await partyOf(consultation_id))) return;
      transcription.stop(consultation_id).catch(() => {});
      const engine = billingEngines.get(consultation_id);
      if (engine) {
        await engine.stop();
        billingEngines.delete(consultation_id);
      } else {
        // No billing engine — update DB directly so session doesn't stay active.
        // A request that was never accepted is a cancellation (and frees the queue).
        const prev = await db.query(
          `UPDATE consultations SET status = CASE WHEN status = 'queued' THEN 'cancelled' ELSE 'completed' END, ended_at=NOW()
           WHERE id=$1 AND status NOT IN ('completed','cancelled','missed')
           RETURNING status, astrologer_id`,
          [consultation_id]
        );
        if (prev.rows[0]?.status === 'cancelled') {
          await db.query(`UPDATE consultation_queue SET status='cancelled' WHERE consultation_id=$1`, [consultation_id]).catch(() => {});
          await db.query('UPDATE astrologers SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1', [prev.rows[0].astrologer_id]).catch(() => {});
        }
      }
      activeRooms.delete(consultation_id);

      const result = await db.query('SELECT * FROM consultations WHERE id = $1', [consultation_id]);
      if (result.rows.length) {
        const consult = result.rows[0];
        const durationMin = Math.ceil((consult.duration_seconds || 0) / 60);
        const amount = parseFloat(consult.total_amount || 0).toFixed(2);

        io.emitToParties(consultation_id, 'consultation_ended', {
          consultation_id,
          duration: consult.duration_seconds,
          total_amount: consult.total_amount,
        });

        if (consult.user_id) {
          await sendPushNotification(
            [consult.user_id],
            'Consultation Ended',
            `Your consultation has ended. Duration: ${durationMin} min | ₹${amount} charged.`,
            { type: 'call_ended', consultation_id }
          );
        }

        // Notify astrologer
        if (consult.astrologer_id) {
          const astroUser = await db.query('SELECT user_id FROM astrologers WHERE id = $1', [consult.astrologer_id]);
          if (astroUser.rows.length) {
            const earned = (parseFloat(consult.total_amount || 0) * 0.8).toFixed(2);
            await sendPushNotification(
              [astroUser.rows[0].user_id],
              'Session Completed',
              `Session ended. Duration: ${durationMin} min | ₹${earned} earned.`,
              { type: 'session_ended', consultation_id }
            );
          }
        }
      }
    });

    // ─── LIVE SESSION ────────────────────────────────────────────
    // Users blocked by the hosting astrologer can't join, chat or tip in their live sessions
    const blockedFromLive = async (sessionId) => {
      const r = await db.query(
        `SELECT 1 FROM live_sessions ls JOIN astrologer_blocked_users b ON b.astrologer_id = ls.astrologer_id
         WHERE ls.id = $1 AND b.user_id = $2`,
        [sessionId, userId]
      ).catch(() => ({ rows: [] }));
      return r.rows.length > 0;
    };

    socket.on('join_live', async ({ session_id }) => {
      if (await blockedFromLive(session_id)) {
        return socket.emit('error', { message: 'This live session is not available to you.', code: 'blocked' });
      }
      socket.join(`live:${session_id}`);
      socket.liveSessionId = session_id;
      const count = io.sockets.adapter.rooms.get(`live:${session_id}`)?.size || 0;
      io.to(`live:${session_id}`).emit('viewer_count', { count });
      await db.query('UPDATE live_sessions SET viewer_count = $1 WHERE id = $2', [count, session_id]).catch(() => {});
    });

    socket.on('leave_live', async ({ session_id }) => {
      socket.leave(`live:${session_id}`);
      socket.liveSessionId = null;
      const count = io.sockets.adapter.rooms.get(`live:${session_id}`)?.size || 0;
      io.to(`live:${session_id}`).emit('viewer_count', { count });
      await db.query('UPDATE live_sessions SET viewer_count = $1 WHERE id = $2', [count, session_id]).catch(() => {});
    });

    socket.on('send_tip', async ({ session_id, amount, message }) => {
      try {
        if (await blockedFromLive(session_id)) return socket.emit('error', { message: 'This live session is not available to you.', code: 'blocked' });
        const walletResult = await db.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
        const balance = walletResult.rows[0]?.balance || 0;
        if (balance < amount) return socket.emit('error', { message: 'Insufficient balance' });

        await db.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [amount, userId]);
        await db.query('INSERT INTO live_tips (session_id, user_id, amount, message) VALUES ($1, $2, $3, $4)', [session_id, userId, amount, message]);
        await db.query('UPDATE live_sessions SET total_tips = total_tips + $1 WHERE id = $2', [amount, session_id]);

        io.to(`live:${session_id}`).emit('new_tip', {
          user: socket.user.name,
          amount,
          message,
        });
      } catch (err) {
        console.error('Tip error:', err);
      }
    });

    socket.on('live_chat', async ({ session_id, message }) => {
      if (await blockedFromLive(session_id)) return;
      const check = detectContactInfo(message);
      if (check.blocked) {
        await db.query(
          `INSERT INTO rule_violations (user_id, role, astrologer_id, violation_type, detected, content, channel)
           VALUES ($1, $2, $3, 'contact_sharing', $4, $5, 'live_chat')`,
          [userId, socket.astrologerId ? 'astrologer' : 'user', socket.astrologerId || null, check.detected, String(message).slice(0, 2000)]
        ).catch(err => console.error('[violation] insert failed:', err.message));
        return socket.emit('message_blocked', { session_id, reason: 'contact_sharing', detected: check.detected, message: blockedMessageText(check.detected) });
      }
      io.to(`live:${session_id}`).emit('live_chat_message', {
        user: socket.user.name,
        message,
        timestamp: new Date(),
      });
    });

    // ─── DISCONNECT ──────────────────────────────────────────────
    socket.on('disconnect', async () => {
      // Update live viewer count if socket was in a live room
      if (socket.liveSessionId) {
        // Socket is removed from rooms before disconnect fires, so size is already decremented
        const count = io.sockets.adapter.rooms.get(`live:${socket.liveSessionId}`)?.size || 0;
        io.to(`live:${socket.liveSessionId}`).emit('viewer_count', { count });
        await db.query('UPDATE live_sessions SET viewer_count = $1 WHERE id = $2', [count, socket.liveSessionId]).catch(() => {});
      }

      if (socket.astrologerId) {
        const astrologerId = socket.astrologerId;
        // Only go offline once the LAST socket for this astrologer is gone, and
        // only after a short grace period so a reconnect doesn't flicker offline.
        if (!isAstrologerConnected(astrologerId) && !offlineTimers.has(astrologerId)) {
          offlineTimers.set(astrologerId, setTimeout(async () => {
            offlineTimers.delete(astrologerId);
            if (isAstrologerConnected(astrologerId)) return;
            await db.query('UPDATE astrologers SET is_online = false WHERE id = $1', [astrologerId]).catch(() => {});
            await broadcastAstrologerStatus(astrologerId).catch(() => {});
          }, OFFLINE_GRACE_MS));
        }

        // If astrologer disconnects mid-session, refund user for unused partial minute
        // (skipped while another of their sockets — e.g. a reconnect — is still live)
        if (socket.consultationId && !isAstrologerConnected(astrologerId)) {
          transcription.stop(socket.consultationId).catch(() => {});
          const engine = billingEngines.get(socket.consultationId);
          if (engine) {
            const partialSeconds = engine.secondsElapsed % 60;
            if (partialSeconds > 0) {
              const refund = parseFloat(((partialSeconds / 60) * engine.ratePerMinute).toFixed(2));
              if (refund > 0) {
                await db.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [refund, engine.userId]);
              }
            }
            await engine.stop();
            billingEngines.delete(socket.consultationId);
            io.emitToParties(socket.consultationId, 'consultation_ended', {
              consultation_id: socket.consultationId,
              reason: 'astrologer_disconnected',
              duration: engine.secondsElapsed,
              total_amount: engine.totalCharged,
            });
          }
        }
      }
      // If user disconnects mid-session, end the active consultation
      if (!socket.astrologerId && socket.consultationId) {
        transcription.stop(socket.consultationId).catch(() => {});
        const engine = billingEngines.get(socket.consultationId);
        if (engine) {
          await engine.stop();
          billingEngines.delete(socket.consultationId);
          io.emitToParties(socket.consultationId, 'consultation_ended', {
            consultation_id: socket.consultationId,
            reason: 'user_disconnected',
            duration: engine.secondsElapsed,
            total_amount: engine.totalCharged,
          });
        } else {
          // Consultation may still be queued/active without a billing engine (e.g. chat not yet started)
          await db.query(
            `UPDATE consultations SET status = 'missed', ended_at = NOW() WHERE id = $1 AND status IN ('queued', 'active')`,
            [socket.consultationId]
          ).catch(() => {});
          io.emitToParties(socket.consultationId, 'consultation_ended', {
            consultation_id: socket.consultationId,
            reason: 'user_disconnected',
          });
        }
        activeRooms.delete(socket.consultationId);
      }

      onlineUsers.delete(userId);
    });
  });
}

module.exports = { initSocket };
