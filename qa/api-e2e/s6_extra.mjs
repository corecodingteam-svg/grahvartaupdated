import * as L from './lib.mjs';
const { record, safe, post, get, patch, sleep } = L;
const tok = await L.admin();
await safe('UA-LIVE-07', async () => {
  const a = await L.makeAstrologer(); await L.goOnline(a);
  const c = await post('/live/sessions', { title: 'Tip test' }, { token: a.token });
  await patch(`/live/sessions/${c.body.data.id}/start`, {}, { token: a.token });
  const u = await L.registerUser(); await L.credit(u.id, 100);
  const s = L.sock(u.token, 'user'); await s.ready;
  s.emit('join_live', { session_id: c.body.data.id });
  const out = [];
  for (const amt of [-50, 0, 'abc', 10.5]) {
    s.clear(); s.emit('send_tip', { session_id: c.body.data.id, amount: amt, message: 'x' });
    const e = await s.waitFor('error', 2500).catch(() => null);
    out.push(`${JSON.stringify(amt)} → ${e ? e.code || e.message : 'accepted'}`);
  }
  const bal = L.userBal(u.id);
  record('UA-LIVE-07', bal === 100 && out.every((x) => !x.endsWith('accepted')) ? 'Pass' : 'Fail', out.join('; ') + `; balance stays ₹${bal}`, 'Fixed: a −₹50 "tip" used to add ₹50 to the sender');
  s.disconnect();
});
await safe('AD-HIR-08', async () => {
  // reuse an activated application from s4a: activate again (409) several times, then write unrelated data
  const A = L.results._agentA;
  const rs = await Promise.all([1, 2, 3].map(() => post(`/admin/hirings/${A.id}/activate-as-astrologer`, {}, { token: tok })));
  const writes = [];
  for (let i = 0; i < 8; i++) writes.push((await post('/hirings/messages', { phone: A.phone, device_id: A.device, message: `persist check ${i}` })).body.data?.id);
  await sleep(1500);
  const saved = +L.sql(`SELECT count(*) FROM agent_messages WHERE message LIKE 'persist check %' AND id IN (${writes.filter(Boolean).join(',') || 0})`);
  const u = await L.registerUser(); const cr = await L.credit(u.id, 25); await sleep(500);
  record('AD-HIR-08', rs.every((r) => r.status === 409) && saved === writes.filter(Boolean).length && L.userBal(u.id) === 25 ? 'Pass' : 'Fail',
    `3× repeat activate → ${rs.map((r) => r.status).join(', ')}; then ${writes.filter(Boolean).length} agent messages written → ${saved} persisted; wallet credit persisted=${L.userBal(u.id) === 25}`,
    'Fixed: early returns inside an open transaction used to put a poisoned connection back in the pool, silently losing later writes');
});
L.save(); process.exit(0);
