import * as L from './lib.mjs';
const { record, safe, sleep } = L;
const close = (...ss) => ss.forEach((s) => s?.disconnect());
const RATE = 10;

const scenarios = [
  // 1 full minute then user ends + review + histories
  safe('UA-CHT-08', async () => {
    const p = await L.pair({ balance: 100 });
    const a0 = L.astroBal(p.astro.astroId);
    const cid = await L.startSession(p);
    await sleep(65000);
    p.us.emit('end_consultation', { consultation_id: cid });
    const ev = await p.us.waitFor('consultation_ended', 5000).catch(() => null);
    await sleep(800);
    const c = L.consult(cid), ub = L.userBal(p.user.id), ab = L.astroBal(p.astro.astroId);
    const rev = await L.post(`/astrologers/${p.astro.astroId}/reviews`, { rating: 5, review_text: 'Very helpful', consultation_id: cid }, { token: p.user.token });
    const revs = await L.get(`/astrologers/${p.astro.astroId}/reviews`);
    const revShown = JSON.stringify(revs.body).includes('Very helpful');
    const debit = +(100 - ub).toFixed(2);
    const okMoney = debit === c.total && Math.abs(ab - a0 - c.earn) < 0.01 && Math.abs(c.earn - c.total * 0.8) < 0.02;
    record('UA-CHT-08', ev && okMoney && rev.status < 300 && revShown ? 'Pass' : 'Fail',
      `~65 s chat → duration ${c.dur}s, user debited ₹${debit} (consultation total ₹${c.total}); astrologer credited ₹${(ab - a0).toFixed(2)} (= 80% after 20% platform fee: ${okMoney}); review → ${rev.status}, visible on profile=${revShown}`);
    record('E2E-CHAT-01', okMoney && revShown ? 'Pass' : 'Fail', `ledgers agree: user −₹${debit}, astrologer +₹${(ab - a0).toFixed(2)}, platform ₹${(debit - (ab - a0)).toFixed(2)}; review visible=${revShown}`, 'Razorpay recharge replaced by admin credit (no Razorpay test keys locally); image message not sent');
    const dupe = await L.post(`/astrologers/${p.astro.astroId}/reviews`, { rating: 4, review_text: 'edited', consultation_id: cid }, { token: p.user.token });
    const cnt = +L.sql(`SELECT count(*) FROM astrologer_reviews WHERE consultation_id='${cid}'`);
    record('UA-CHT-25', dupe.status === 200 && cnt === 1 ? 'Pass' : 'Fail', `re-submitting a review for the same consultation → ${dupe.status}, stored reviews = ${cnt} (updated, not duplicated)`, 'Skip/stars-only UI paths not checked');
    // abuse: no consultation, someone else's consultation, out-of-range rating
    const stranger = await L.registerUser();
    const r1 = await L.post(`/astrologers/${p.astro.astroId}/reviews`, { rating: 1, review_text: 'fake' }, { token: stranger.token });
    const r2 = await L.post(`/astrologers/${p.astro.astroId}/reviews`, { rating: 1, review_text: 'fake', consultation_id: cid }, { token: stranger.token });
    const r3 = await L.post(`/astrologers/${p.astro.astroId}/reviews`, { rating: 99, consultation_id: cid }, { token: p.user.token });
    const allRefused = [r1, r2, r3].every((r) => r.status >= 400 && r.status < 500);
    record('UA-CHT-26', allRefused ? 'Pass' : 'Fail', `review with no consultation → ${r1.status}; on someone else's consultation → ${r2.status}; rating 99 → ${r3.status}`);
    // histories
    const uh = await L.get('/consultations/history', { token: p.user.token });
    const ah = await L.get('/astrologers/consultations/history', { token: p.astro.token });
    const tr = await L.get(`/astrologers/consultations/${cid}/messages`, { token: p.astro.token });
    const th = await L.get('/astrologers/threads', { token: p.astro.token });
    const ut = await L.get('/threads', { token: p.user.token });
    record('AA-HIS-01', ah.status === 200 && JSON.stringify(ah.body).includes(cid) ? 'Pass' : 'Fail', `astrologer history → ${ah.status}, contains session=${JSON.stringify(ah.body).includes(cid)}`, 'Status filter UI not checked');
    record('AA-HIS-02', tr.status === 200 ? 'Pass' : 'Fail', `transcript/messages → ${tr.status}, ${(tr.body.data?.messages || tr.body.data || []).length} items`);
    record('AA-HIS-03', th.status === 200 ? 'Pass' : 'Fail', `astrologer threads → ${th.status}, ${(th.body.data || []).length} thread(s)`);
    record('UA-CHT-11', uh.status === 200 && ut.status === 200 ? 'Pass' : 'Fail', `user history → ${uh.status}; user threads → ${ut.status}, ${(ut.body.data || []).length} thread(s)`, 'Pagination of older messages not checked');
    const ae = await L.get('/astrologers/me/wallet', { token: p.astro.token });
    record('AA-ERN-01', ae.status === 200 ? 'Pass' : 'Fail', `earnings wallet → ${ae.status}: ${JSON.stringify(ae.body.data?.wallet || ae.body.data || {}).slice(0, 120)}`);
    close(p.us, p.as);
  }),

  // balance runs out: ₹15 at ₹10/min
  safe('UA-CHT-09', async () => {
    const p = await L.pair({ balance: 15 });
    const cid = await L.startSession(p);
    const ev = await p.us.waitFor('consultation_ended', 140000).catch(() => null);
    await sleep(800);
    const c = L.consult(cid), ub = L.userBal(p.user.id);
    // try to keep messaging after end
    p.as.clear();
    p.as.emit('send_message', { consultation_id: cid, content: 'are you there?' });
    const after = await p.us.waitFor('new_message', 2500).catch(() => null);
    const ok = ev?.reason === 'insufficient_balance' && ub >= 0;
    const warned = p.us.events.some((e) => /low_balance|balance_warning/.test(e.ev));
    record('UA-CHT-09', ok ? 'Pass' : 'Fail', `₹15 balance → ended after ${c.dur}s, reason ${ev?.reason}; charged ₹${c.total}; final balance ₹${ub}; low-balance warning event=${warned}`,
      warned ? '' : 'No server-side low-balance warning before auto-end (check whether the app computes it from billing_tick)');
    record('E2E-BAL-01', ok ? 'Pass' : 'Fail', `auto-end reason ${ev?.reason}, wallet never negative (₹${ub}), astrologer earning ₹${c.earn}`);
    record('AA-REQ-19', !after ? 'Pass' : 'Fail', `message after auto-end ${after ? 'DELIVERED' : 'not delivered'}`);
    close(p.us, p.as);
  }),

  // astrologer disconnects at ~20 s (before any billing)
  safe('UA-CHT-18', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(20000);
    p.as.disconnect();
    const warn = await p.us.waitFor('peer_disconnected', 5000).catch(() => null);
    const ev = await p.us.waitFor('consultation_ended', 30000).catch(() => null);
    await sleep(800);
    const c = L.consult(cid), ub = L.userBal(p.user.id);
    const free = ub > 100;
    record('UA-CHT-18', ev && c.status === 'completed' && ub <= 100 ? 'Pass' : 'Fail', `astrologer dropped at 20 s → user warned (peer_disconnected, ${warn?.grace_seconds}s grace)=${!!warn}; ended reason ${ev?.reason} after grace; status ${c.status}; user balance 100 → ${ub} (minimum charge waived)`,
      free ? `Bug: "refund partial minute" credits ₹${(ub - 100).toFixed(2)} that was never charged (billing is postpaid per full minute)` : '');
    record('AA-REQ-18', ev && c.status === 'completed' && ub <= 100 ? 'Pass' : 'Fail', `astrologer app killed mid-session → session ended after grace (${ev?.reason}), user balance ₹${ub}`);
    close(p.us);
  }),

  // user disconnects for 5 s then reconnects
  safe('UA-CHT-10', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(10000);
    p.us.disconnect();
    await sleep(5000);
    const us2 = L.sock(p.user.token, 'user'); await us2.ready;
    us2.emit('join_consultation', { consultation_id: cid });
    await sleep(25000); // past the 20 s grace window
    const c = L.consult(cid);
    record('UA-CHT-10', c.status === 'active' ? 'Pass' : 'Fail', `5 s network drop → consultation status ${c.status} (ended reason seen by astrologer: ${p.as.events.find((e) => e.ev === 'consultation_ended')?.data?.reason || '-'})`,
      c.status !== 'active' ? 'Any user disconnect ends the paid session immediately — no reconnect grace period (astrologer side has one for going offline)' : '');
    record('UA-CHT-20', c.status === 'active' ? 'Pass' : 'Fail', `background/reconnect → status ${c.status}`, c.status !== 'active' ? 'Same root cause as UA-CHT-10: when the OS drops the socket in background, the session ends' : '');
    close(us2, p.as);
  }),

  // user leaves for good
  safe('UA-CHT-19', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(5000);
    p.us.disconnect();
    const warn = await p.as.waitFor('peer_disconnected', 5000).catch(() => null);
    const ev = await p.as.waitFor('consultation_ended', 30000).catch(() => null);
    await sleep(500);
    const c = L.consult(cid);
    record('UA-CHT-19', ev && c.status === 'completed' ? 'Pass' : 'Fail', `user killed app → astrologer warned=${!!warn}; session ended after grace (${ev?.reason}); duration ${c.dur}s, charged ₹${c.total}`);
    close(p.as);
  }),

  // both end at the same moment after a billed minute
  safe('UA-CHT-22', async () => {
    const p = await L.pair({ balance: 100 });
    const a0 = L.astroBal(p.astro.astroId);
    const cid = await L.startSession(p);
    await sleep(63000);
    p.us.emit('end_consultation', { consultation_id: cid });
    p.as.emit('end_consultation', { consultation_id: cid });
    await sleep(2500);
    const c = L.consult(cid), ub = L.userBal(p.user.id), ab = L.astroBal(p.astro.astroId);
    const ends = p.us.events.filter((e) => e.ev === 'consultation_ended').length;
    const debitTx = +L.sql(`SELECT count(*) FROM wallet_transactions WHERE reference_id='${cid}'`);
    record('UA-CHT-22', +(100 - ub).toFixed(2) === c.total && Math.abs(ab - a0 - c.earn) < 0.01 ? 'Pass' : 'Fail',
      `simultaneous end → user saw ${ends} end event(s); user −₹${(100 - ub).toFixed(2)} vs total ₹${c.total}; astrologer +₹${(ab - a0).toFixed(2)} vs earning ₹${c.earn}; ${debitTx} wallet txn(s)`);
    close(p.us, p.as);
  }),

  // admin rate change mid-session
  safe('E2E-RATECHG-01', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(5000);
    const rc = await L.put(`/admin/astrologers/${p.astro.astroId}/rates`, { per_minute_rate_chat: 30, per_minute_rate_call: 30, per_minute_rate_video: 30 }, { token: await L.admin() });
    await sleep(60000);
    p.us.emit('end_consultation', { consultation_id: cid });
    await sleep(1500);
    const c = L.consult(cid);
    // new session uses new rate
    const p2u = await L.registerUser(); await L.credit(p2u.id, 100);
    const s2 = L.sock(p2u.token, 'user'); await s2.ready;
    s2.emit('request_consultation', { astrologer_id: p.astro.astroId, type: 'chat' });
    const q = await s2.waitFor('consultation_queued', 5000).catch(() => null);
    const newRate = q ? L.sql(`SELECT per_minute_rate FROM consultations WHERE id='${q.consultation_id}'`) : '?';
    const ok = rc.status === 200 && c.total <= 10.01 && +newRate === 30;
    record('E2E-RATECHG-01', ok ? 'Pass' : 'Fail', `rate 10 → 30 mid-session: running session billed ₹${c.total} for ${c.dur}s (old rate kept); next session rate ₹${newRate}/min`);
    record('E2E-RATE-01', +newRate === 30 ? 'Pass' : 'Fail', `admin rate change → new session created at ₹${newRate}/min`);
    record('AD-AST-03', rc.status === 200 && +newRate === 30 ? 'Pass' : 'Fail', `PUT rates → ${rc.status}; used for next session (₹${newRate}/min)`, 'Rate display in User App UI not checked');
    close(p.us, p.as, s2);
  }),

  // user banned mid-session
  safe('E2E-BANMID-01', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(8000);
    await L.post(`/admin/users/${p.user.id}/ban`, { reason: 'QA' }, { token: await L.admin() });
    await sleep(1500);
    const c = L.consult(cid);
    const ended = p.us.events.some((e) => e.ev === 'consultation_ended');
    record('E2E-BANMID-01', c.status !== 'active' ? 'Pass' : 'Fail', `user banned 8 s into session → status ${c.status}, charged ₹${c.total}; both notified=${ended && p.as.events.some((e) => e.ev === 'consultation_ended')}`,
      c.status === 'active' ? 'Ban does not end the running consultation — it keeps billing until someone ends it' : '');
    p.us.emit('end_consultation', { consultation_id: cid });
    close(p.us, p.as);
  }),

  // astrologer banned mid-session
  safe('AD-AST-09', async () => {
    const p = await L.pair({ balance: 100 });
    const cid = await L.startSession(p);
    await sleep(8000);
    await L.post(`/admin/astrologers/${p.astro.astroId}/ban`, { reason: 'QA' }, { token: await L.admin() });
    await sleep(1500);
    const c = L.consult(cid);
    record('AD-AST-09', c.status !== 'active' ? 'Pass' : 'Fail', `astrologer banned 8 s into session → status ${c.status}, charged ₹${c.total}; user notified=${p.us.events.some((e) => e.ev === 'consultation_ended')}`,
      c.status === 'active' ? 'Ban does not end the running consultation' : '');
    p.us.emit('end_consultation', { consultation_id: cid });
    close(p.us, p.as);
  }),
];
await Promise.all(scenarios);
L.save();
process.exit(0);
