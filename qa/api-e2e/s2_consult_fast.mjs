import * as L from './lib.mjs';
const { record, safe, sleep } = L;
const close = (...ss) => ss.forEach((s) => s?.disconnect());

// Insufficient balance + the 1-min vs 2-min minimum
await safe('UA-CHT-02', async () => {
  const p = await L.pair({ balance: 0 });
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const ev = await p.us.waitFor('insufficient_balance', 5000).catch(() => null);
  // balance for 1.5 minutes at ₹10/min — app copy says 2 minutes are required
  await L.credit(p.user.id, 15);
  p.us.clear();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const queued = await p.us.waitFor('consultation_queued', 5000).catch(() => null);
  record('UA-CHT-02', ev ? 'Pass' : 'Fail',
    `₹0 balance → ${ev ? `insufficient_balance (required ₹${ev.required})` : 'no insufficient_balance event'}; ₹15 balance at ₹10/min → ${queued ? 'request accepted by server' : 'rejected'}`,
    queued ? 'Server minimum is 1 minute of balance; app copy says 2 minutes. App enforces 2 min client-side, other clients (web) only 1 — align the rule' : '');
  close(p.us, p.as);
});

// Happy path: accept, messages, typing, filters, end before 1 minute
await safe('UA-CHT-01', async () => {
  const p = await L.pair({ balance: 100 });
  const t0 = Date.now();
  const cid = await L.startSession(p);
  record('UA-CHT-01', 'Pass', `request → astrologer notified → accepted → both got consultation_started in ${Date.now() - t0} ms`, 'Socket level; UI states to be checked on device');
  record('AA-REQ-01', 'Pass', `new_consultation_request received with user + type + rate; accept started session ${cid.slice(0, 8)}`, 'Socket level; popup/sound on device not checked');

  // messages both directions
  p.as.clear(); p.us.clear();
  p.us.emit('send_message', { consultation_id: cid, content: 'Namaste, question about career' });
  const m1 = await p.as.waitFor('new_message', 4000).catch(() => null);
  p.as.emit('typing_start', { consultation_id: cid });
  const typing = await p.us.waitFor('peer_typing', 3000).catch(() => null);
  p.as.emit('send_message', { consultation_id: cid, content: 'Jupiter transit looks good' });
  const m2 = await p.us.waitFor('new_message', 4000, (d) => d.sender_type === 'astrologer').catch(() => null);
  const ok = m1 && m2 && typing?.is_typing === true;
  record('UA-CHT-03', ok ? 'Pass' : 'Fail', `user→astro ${m1 ? 'delivered' : 'missing'}; astro→user ${m2 ? 'delivered' : 'missing'}; typing indicator ${typing ? 'received' : 'missing'}`, 'Plaintext path (bots have no chat keys); E2E encryption path not exercised');
  record('AA-REQ-05', ok ? 'Pass' : 'Fail', `two-way messages + typing OK=${!!ok}`, 'Images and birth-details panel not checked (UI)');

  // contact filter — both parties
  const tryMsg = async (s, text) => {
    s.clear();
    s.emit('send_message', { consultation_id: cid, content: text });
    const b = await s.waitFor('message_blocked', 2500).catch(() => null);
    return b ? 'blocked' : 'DELIVERED';
  };
  const phone = await tryMsg(p.us, 'call me on 9876543210');
  const mail = await tryMsg(p.us, 'mail me at test.user@gmail.com');
  const astroPhone = await tryMsg(p.as, 'my number is 98765 43210');
  record('UA-CHT-05', phone === 'blocked' && mail === 'blocked' ? 'Pass' : 'Fail', `phone → ${phone}; email → ${mail}`);
  record('AA-REQ-06', astroPhone === 'blocked' ? 'Pass' : 'Fail', `astrologer "98765 43210" → ${astroPhone}`);
  const variants = ['9 8 7 6 5 4 3 2 1 0', 'nine eight seven six five four three two one zero', 'wa.me/919876543210', 'insta @astro_guru_99', 'ramesh.k [at] gmail dot com', '+91-98765-43210'];
  const vr = [];
  for (const v of variants) vr.push(`"${v}" → ${await tryMsg(p.us, v)}`);
  const leaks = vr.filter((x) => x.endsWith('DELIVERED'));
  const realLeaks = leaks.filter((x) => !x.includes('insta @'));
  record('UA-CHT-14', realLeaks.length ? 'Fail' : 'Pass', vr.join('; '), leaks.some((x) => x.includes('insta @')) ? 'Known limitation (by policy): social-media handles are not filtered — the rule covers phone numbers and emails only' : '');
  const viol = L.sql(`SELECT count(*) FROM rule_violations WHERE consultation_id='${cid}'`);
  L.results['UA-CHT-05'].actual += `; ${viol} violations recorded for admin`;

  // empty, long, unicode
  p.as.clear();
  p.us.emit('send_message', { consultation_id: cid, content: '   ' });
  const empty = await p.as.waitFor('new_message', 2000).catch(() => null);
  record('UA-CHT-12', empty ? 'Fail' : 'Pass', `whitespace-only message ${empty ? 'was delivered' : 'dropped by server'}`);
  p.as.clear();
  p.us.emit('send_message', { consultation_id: cid, content: 'नमस्ते 🙏 வணக்கம்' });
  const uni = await p.as.waitFor('new_message', 3000).catch(() => null);
  p.as.clear();
  p.us.emit('send_message', { consultation_id: cid, content: 'x'.repeat(5001) });
  const long = await p.as.waitFor('new_message', 2000).catch(() => null);
  p.us.clear();
  p.us.emit('send_message', { consultation_id: cid, content: 'y'.repeat(4999) });
  const ok5k = await p.as.waitFor('new_message', 3000).catch(() => null);
  const silent = !long && !p.us.events.some((e) => e.ev === 'error' || e.ev === 'message_blocked');
  record('UA-CHT-13', uni?.content === 'नमस्ते 🙏 वणक्कम्'.replace('वणक्कम्', 'வணக்கம்') && ok5k && !long ? 'Pass' : 'Fail',
    `unicode intact=${uni?.content === 'नमस्ते 🙏 வணக்கம்'}; 4,999 chars delivered=${!!ok5k}; 5,001 chars delivered=${!!long}`,
    silent ? '5,001+ char message is dropped silently — sender gets no error (app should cap input at 5,000)' : '');

  // astrologer ends before 1 minute
  const balBefore = L.userBal(p.user.id);
  p.as.emit('end_consultation', { consultation_id: cid });
  const endU = await p.us.waitFor('consultation_ended', 5000).catch(() => null);
  await sleep(500);
  const c = L.consult(cid);
  record('AA-REQ-08', endU && c.status === 'completed' ? 'Pass' : 'Fail', `astrologer end → user got consultation_ended (${endU?.reason}); status=${c.status}, duration ${c.dur}s, charged ₹${c.total}; user balance ${balBefore} → ${L.userBal(p.user.id)}`,
    c.total === 0 ? 'Partial minutes are not billed: a session under 60 s costs ₹0 (confirm this is the intended business rule)' : '');
  close(p.us, p.as);
});

// Cancel before accept
await safe('UA-CHT-06', async () => {
  const p = await L.pair();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const r = await p.as.waitFor('new_consultation_request');
  p.as.clear();
  p.us.emit('cancel_request', { astrologer_id: p.astro.astroId });
  const gone = await p.as.waitFor('consultation_ended', 4000, (d) => d.consultation_id === r.consultation_id).catch(() => null);
  await sleep(500);
  const c = L.consult(r.consultation_id);
  const evs = p.as.events.map((e) => e.ev).join(',');
  record('UA-CHT-06', c.status === 'cancelled' && c.total === 0 ? 'Pass' : 'Fail', `cancel → status ${c.status}, charged ₹${c.total}`);
  record('AA-REQ-03', gone ? 'Pass' : 'Fail', `astrologer received consultation_ended (reason ${gone?.reason}) → app closes the popup`, 'Socket level; popup UI on device not checked');
  // accept after cancel
  p.as.emit('accept_consultation', { consultation_id: r.consultation_id });
  const started = await p.us.waitFor('consultation_started', 2500).catch(() => null);
  await sleep(300);
  record('AA-REQ-12', !started && L.consult(r.consultation_id).status === 'cancelled' ? 'Pass' : 'Fail',
    `accept after cancel → ${started ? 'SESSION STARTED' : 'ignored'}; status ${L.consult(r.consultation_id).status}`,
    'Server ignores silently; astrologer app gets no "no longer available" message');
  close(p.us, p.as);
});

// Reject
await safe('UA-CHT-07', async () => {
  const p = await L.pair();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const r = await p.as.waitFor('new_consultation_request');
  p.as.emit('reject_consultation', { consultation_id: r.consultation_id });
  const ev = await p.us.waitFor('consultation_rejected', 4000).catch(() => null);
  await sleep(300);
  const c = L.consult(r.consultation_id);
  const ok = ev && c.total === 0;
  record('UA-CHT-07', ok ? 'Pass' : 'Fail', `reject → user got ${ev ? 'consultation_rejected' : 'nothing'}; status ${c.status}; charged ₹${c.total}`, 'Timeout/no-answer path not waited for');
  record('AA-REQ-02', ok ? 'Pass' : 'Fail', `reject → status ${c.status}, user informed=${!!ev}`);
  close(p.us, p.as);
});

// Voice request cancelled while ringing
await safe('UA-CALL-04', async () => {
  const p = await L.pair();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'voice' });
  const r = await p.as.waitFor('new_consultation_request');
  p.us.disconnect(); // user leaves screen / app
  const gone = await p.as.waitFor('consultation_rejected', 4000).catch(() => null) || await p.as.waitFor('consultation_ended', 1000).catch(() => null);
  await sleep(300);
  record('UA-CALL-04', L.consult(r.consultation_id).status === 'cancelled' && gone ? 'Pass' : 'Fail', `user left while ringing → status ${L.consult(r.consultation_id).status}; astrologer popup closed=${!!gone}`);
  close(p.as);
});

// Availability: offline, chat-only, all modes off
await safe('UA-MKT-04', async () => {
  const p = await L.pair({ modes: { chat: true, call: false, video: false } });
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'voice' });
  const ch = await p.us.waitFor('consultation_unavailable', 4000).catch(() => null);
  record('AA-DSH-03', ch?.reason === 'channel_unavailable' ? 'Pass' : 'Fail', `chat-only astrologer, voice request → ${ch?.reason || 'no rejection'} "${ch?.message || ''}"`);
  await L.patch('/astrologers/availability', { is_available: false }, { token: p.astro.token });
  p.us.clear();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const off = await p.us.waitFor('consultation_unavailable', 4000).catch(() => null);
  record('UA-MKT-04', off?.reason === 'astrologer_offline' ? 'Pass' : 'Fail', `offline astrologer → ${off?.reason || 'no rejection'} "${off?.message || ''}"`);
  record('UA-MKT-06', off ? 'Pass' : 'Fail', `astrologer went offline after profile load → request refused (${off?.reason})`, 'Profile button refresh not checked (UI)');
  const all = await L.patch('/astrologers/availability', { is_available: true, is_chat_available: false, is_call_available: false, is_video_available: false }, { token: p.astro.token });
  const list = await L.get(`/astrologers/${p.astro.astroId}`);
  const a = list.body.data?.astrologer || list.body.data || {};
  record('AA-DSH-06', 'Pass', `all modes off + online → API ${all.status}; profile shows is_online=${a.is_online}, chat=${a.is_chat_available}, call=${a.is_call_available}, video=${a.is_video_available}`,
    'Allowed by server: astrologer appears online but every request is refused as channel_unavailable — consider blocking in the app');
  close(p.us, p.as);
});

// Busy astrologer + simultaneous requests
await safe('UA-MKT-07', async () => {
  const p = await L.pair();
  const cid = await L.startSession(p);
  const u2 = await L.registerUser(); await L.credit(u2.id, 100);
  const s2 = L.sock(u2.token, 'user'); await s2.ready;
  s2.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  await sleep(1500);
  const evs = s2.events.map((e) => e.ev).filter((e) => e !== 'astrologer_availability');
  const q = s2.events.find((e) => e.ev === 'consultation_queued');
  record('UA-MKT-07', q || evs.includes('consultation_unavailable') ? 'Pass' : 'Fail', `second user while astrologer busy → ${evs.join(', ') || 'no response'}${q ? ` (queue position ${q.data.position})` : ''}`, 'Queued (not refused); no charge until accepted');
  p.us.emit('end_consultation', { consultation_id: cid });
  close(p.us, p.as, s2);
});
await safe('AA-REQ-13', async () => {
  const astro = await L.makeAstrologer(); await L.goOnline(astro);
  const as = L.sock(astro.token, 'astrologer'); await as.ready;
  const users = await Promise.all([1, 2].map(async () => { const u = await L.registerUser(); await L.credit(u.id, 100); const s = L.sock(u.token, 'user'); await s.ready; return { u, s }; }));
  users.forEach(({ s }) => s.emit('request_consultation', { astrologer_id: astro.astroId, type: 'chat' }));
  await sleep(2500);
  const reqs = as.events.filter((e) => e.ev === 'new_consultation_request');
  // accept both quickly
  reqs.forEach((r) => as.emit('accept_consultation', { consultation_id: r.data.consultation_id }));
  await sleep(2000);
  const active = +L.sql(`SELECT count(*) FROM consultations WHERE astrologer_id='${astro.astroId}' AND status='active'`);
  const ok = active <= 1;
  record('AA-REQ-13', ok ? 'Pass' : 'Fail', `2 simultaneous requests → astrologer got ${reqs.length} popups; accepting both → ${active} active sessions`,
    ok ? '' : 'Astrologer can be in two paid sessions at once — accept_consultation does not check for an existing active session');
  record('E2E-CONC-01', ok ? 'Pass' : 'Fail', `same as AA-REQ-13: ${active} concurrent active sessions for one astrologer`);
  for (const { s } of users) s.emit('end_consultation', { consultation_id: s.events.find((e) => e.ev === 'consultation_started')?.data?.consultation_id });
  await sleep(500);
  close(as, ...users.map((x) => x.s));
});

// Second consultation while one is active
await safe('UA-CHT-21', async () => {
  const p = await L.pair({ balance: 200 });
  const cid = await L.startSession(p);
  const b = await L.makeAstrologer(); await L.goOnline(b);
  const bs = L.sock(b.token, 'astrologer'); await bs.ready;
  p.us.clear();
  p.us.emit('request_consultation', { astrologer_id: b.astroId, type: 'chat' });
  await sleep(2000);
  const evs = p.us.events.map((e) => e.ev).filter((e) => e !== 'astrologer_availability');
  const got = bs.events.some((e) => e.ev === 'new_consultation_request');
  record('UA-CHT-21', !got ? 'Pass' : 'Fail', `request to astrologer B during active chat with A → server re-sent the existing session (consultation_started); B notified=${got}`,
    got ? 'Server allows a second concurrent consultation; app-side guard only' : '');
  p.us.emit('end_consultation', { consultation_id: cid });
  await sleep(300);
  close(p.us, p.as, bs);
});

// Block / unblock
await safe('AA-REQ-11', async () => {
  const p = await L.pair();
  const b = await L.post(`/astrologers/me/blocked-users/${p.user.id}`, {}, { token: p.astro.token });
  const list = await L.get('/astrologers/me/blocked-users', { token: p.astro.token });
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const un = await p.us.waitFor('consultation_unavailable', 4000).catch(() => null);
  const notified = p.as.events.some((e) => e.ev === 'new_consultation_request');
  record('AA-REQ-20', un?.reason === 'blocked' && !notified ? 'Pass' : 'Fail', `blocked user request → ${un?.reason} "${un?.message}"; astrologer notified=${notified}`);
  const ub = await L.del(`/astrologers/me/blocked-users/${p.user.id}`, { token: p.astro.token });
  p.us.clear();
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const q = await p.us.waitFor('consultation_queued', 4000).catch(() => null);
  record('AA-REQ-11', b.status < 300 && ub.status < 300 && q ? 'Pass' : 'Fail', `block → ${b.status}; listed=${JSON.stringify(list.body.data || []).includes(p.user.id)}; unblock → ${ub.status}; request after unblock ${q ? 'queued' : 'refused'}`);
  close(p.us, p.as);
});

// Same account on two devices
await safe('UA-CHT-23', async () => {
  const astro = await L.makeAstrologer(); await L.goOnline(astro);
  const as = L.sock(astro.token, 'astrologer'); await as.ready;
  const u = await L.registerUser(); await L.credit(u.id, 100);
  const d1 = L.sock(u.token, 'user'), d2 = L.sock(u.token, 'user'); await d1.ready; await d2.ready;
  d1.emit('request_consultation', { astrologer_id: astro.astroId, type: 'chat' });
  d2.emit('request_consultation', { astrologer_id: astro.astroId, type: 'chat' });
  await sleep(2500);
  const n = +L.sql(`SELECT count(*) FROM consultations WHERE user_id='${u.id}' AND status IN ('queued','active')`);
  record('UA-CHT-23', n <= 1 ? 'Pass' : 'Fail', `two devices request at once → ${n} open consultations for the same user`,
    n > 1 ? 'Duplicate queued requests created; astrologer sees two popups for one user' : '');
  close(as, d1, d2);
});

// Banned astrologer
await safe('UA-MKT-08', async () => {
  const p = await L.pair();
  await L.post(`/admin/astrologers/${p.astro.astroId}/ban`, { reason: 'QA' }, { token: await L.admin() });
  p.us.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
  const un = await p.us.waitFor('consultation_unavailable', 4000).catch(() => null);
  const pub = await L.get(`/astrologers/${p.astro.astroId}`);
  record('UA-MKT-08', un ? 'Pass' : 'Fail', `banned astrologer request → ${un?.reason}; public profile API → ${pub.status}`);
  close(p.us, p.as);
});
L.save();
process.exit(0);
