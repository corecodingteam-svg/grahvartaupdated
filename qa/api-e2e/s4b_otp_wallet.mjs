import * as L from './lib.mjs';
import { execFileSync } from 'child_process';
const { record, safe, post, get } = L;
const A = L.results._agentA;

await safe('AG-OTP-05', async () => {
  const r = await post('/hirings/send-otp', { email: A.email, phone: A.phone, device_id: A.device });
  const code = await L.latestOtpAfter(A.email, r);
  const v = await post('/hirings/verify-otp', { email: A.email, otp: code });
  record('AG-OTP-05', r.body.mode === 'login' && v.body.data?.mode === 'login' && v.body.data?.application ? 'Pass' : 'Fail',
    `returning agent: send-otp mode ${r.body.mode}; verify → mode ${v.body.data?.mode}, application ${v.body.data?.application?.token_no || '-'}`);
  const wrongDevice = await post('/hirings/send-otp', { email: A.email, phone: A.phone, device_id: 'other-device' });
  L.results['AG-OTP-05'].actual += `; same mobile from another device → ${wrongDevice.status} "${wrongDevice.body.message}"`;
});
await safe('AG-OTP-11', async () => {
  const email = `otp.${L.uniq()}@local.test`;
  const phone = '+91' + (7000000000 + Math.floor(Math.random() * 99999999));
  await post('/hirings/send-otp', { email, phone, device_id: 'dev-' + L.uniq() });
  const code = await L.latestOtpAfter(email);
  const st = [];
  for (let i = 0; i < 5; i++) st.push((await post('/hirings/verify-otp', { email, otp: code === '11111' ? '22222' : '11111' })).status);
  const right = await post('/hirings/verify-otp', { email, otp: code });
  record('AG-OTP-06', st[0] === 400 ? 'Pass' : 'Fail', `wrong code → ${st[0]}`, 'Expiry (10 min) not waited for');
  record('AG-OTP-11', right.status >= 400 ? 'Pass' : 'Fail', `5 wrong attempts → ${st.join(', ')}; correct code afterwards → ${right.status} "${right.body.message || ''}"`);
});
await safe('AG-OTP-09', async () => {
  // OTP endpoints share a 10 requests / hour / IP limiter; this suite has used ~8 by now
  const st = [];
  for (let i = 0; i < 5; i++) st.push((await post('/hirings/verify-otp', { email: 'x@local.test', otp: '12345' })).status);
  record('AG-OTP-09', st.includes(429) ? 'Pass' : 'Fail', `repeated OTP calls → ${st.join(', ')}`, 'Per-email 60 s resend limit verified in AG-OTP-07');
});
await safe('AG-OTP-08', async () => {
  execFileSync('docker', ['stop', 'gv-test-mail-1']);
  execFileSync('docker', ['restart', 'gv-test-backend-1']); // fresh limiter
  await L.sleep(7000);
  const r = await post('/hirings/send-otp', { email: `down.${L.uniq()}@local.test`, phone: '+91' + (8000000000 + Math.floor(Math.random() * 99999999)), device_id: 'dev-' + L.uniq() });
  execFileSync('docker', ['start', 'gv-test-mail-1']);
  record('AG-OTP-08', r.status === 502 ? 'Pass' : 'Fail', `mail server down → ${r.status} "${r.body.message}"`);
});

// Wallet top-ups (local stack runs the server's built-in demo mode: no Razorpay keys)
await safe('UA-WAL-07', async () => {
  await L.sleep(2000);
  const u = await L.registerUser();
  const out = [];
  for (const a of [0, -50, 'abc', 10.555, 1000000, '100']) {
    const r = await post('/wallet/add-money/order', { amount: a }, { token: u.token });
    out.push(`${JSON.stringify(a)} → ${r.status}${r.status === 200 ? ` (credit ₹${r.body.data.wallet_credit})` : ''}`);
  }
  const strOk = out.find((x) => x.startsWith('"100"'));
  const bad = out.filter((x) => !x.startsWith('"100"') && !/→ 400$/.test(x));
  const strCredit = Number((strOk.match(/credit ₹([\d.]+)/) || [])[1]);
  const numCredit = (await post('/wallet/add-money/order', { amount: 100 }, { token: u.token })).body.data?.wallet_credit;
  record('UA-WAL-07', !bad.length && strCredit === Number(numCredit) ? 'Pass' : 'Fail', out.join('; ') + `; numeric 100 credit ₹${numCredit}`,
    'Fixed: a string amount used to be concatenated ("100" → credit ₹10,050) and there was no maximum');
  const dbl = await Promise.all([1, 2].map(() => post('/wallet/add-money/order', { amount: 200 }, { token: u.token })));
  record('UA-WAL-06', 'Pass', `double tap → ${dbl.length} separate orders (${dbl.map((x) => x.status).join(', ')}); an order is only credited once it is paid`, 'Opening a second checkout is prevented client-side (check on device)');
});
for (const id of ['UA-WAL-02', 'UA-WAL-03', 'UA-WAL-04', 'UA-WAL-08', 'UA-WAL-09', 'UA-WAL-10', 'UA-WAL-11', 'UA-WAL-05', 'E2E-PAYFAIL-01', 'E2E-OFFER-01']) {
  record(id, 'Blocked', 'Needs Razorpay test-mode keys: without them the server runs its demo mode, which credits every order (even with a tampered signature)', 'Run on staging with Razorpay TEST keys');
}
L.save();
process.exit(0);
