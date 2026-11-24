import * as L from './lib.mjs';
await L.safe('UA-CHT-10', async () => {
  const p = await L.pair({ balance: 100 });
  const cid = await L.startSession(p);
  p.us.disconnect(); await L.sleep(3000);
  const u2 = L.sock(p.user.token, 'user'); await u2.ready; u2.emit('join_consultation', { consultation_id: cid });
  await L.sleep(22000);
  const mid = L.consult(cid).status;
  u2.disconnect();
  await L.sleep(25000);
  const fin = L.consult(cid).status;
  L.record('UA-CHT-10', mid === 'active' && fin === 'completed' ? 'Pass' : 'Fail',
    `drop 3 s → rejoined → still ${mid} after grace; second drop without return → ${fin}`, 'Both reconnect (session kept) and abandonment (session ended) verified');
  p.as.disconnect();
});
L.save(); process.exit(0);
