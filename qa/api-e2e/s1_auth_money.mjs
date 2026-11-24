import * as L from './lib.mjs';
const { record, safe, post, get, put, del, admin } = L;

// ── User auth ──
await safe('UA-AUTH-01', async () => {
  const u = await L.registerUser();
  const r = await L.login(u.email, u.password);
  record('UA-AUTH-01', r.status === 200 && r.body.data?.token ? 'Pass' : 'Fail', `login → ${r.status}, token ${r.body.data?.token ? 'issued' : 'missing'}`, 'API level; UI not driven');
});
await safe('UA-AUTH-02', async () => {
  const u = await L.registerUser();
  const r = await L.login(u.email, 'wrongpass');
  record('UA-AUTH-02', r.status === 401 || r.status === 400 ? 'Pass' : 'Fail', `wrong password → ${r.status} "${r.body.message}"`);
});
await safe('UA-AUTH-03', async () => {
  const r = await L.login('nobody.' + L.uniq() + '@local.test', 'whatever1');
  record('UA-AUTH-03', [400, 401, 404].includes(r.status) ? 'Pass' : 'Fail', `unknown email → ${r.status} "${r.body.message}"`);
});
await safe('UA-AUTH-04', async () => {
  const r1 = await post('/auth/login', { email: '', password: '' });
  const r2 = await post('/auth/login', { email: 'abc', password: 'x' });
  record('UA-AUTH-04', r1.status >= 400 && r1.status < 500 && r2.status >= 400 && r2.status < 500 ? 'Pass' : 'Fail', `server rejects empty → ${r1.status}, malformed → ${r2.status} (as 'Invalid credentials', not a validation message)`, 'Client-side inline validation to be confirmed on device');
});
await safe('UA-AUTH-05', async () => {
  const u = await L.registerUser();
  const b = await post(`/admin/users/${u.id}/ban`, { reason: 'QA' }, { token: await admin() });
  const r = await L.login(u.email, u.password);
  const prof = await get('/auth/profile', { token: u.token });
  record('UA-AUTH-05', r.status >= 400 ? 'Pass' : 'Fail',
    `ban → ${b.status}; login after ban → ${r.status} "${r.body.message}"; existing token /profile → ${prof.status}`,
    prof.status === 200 ? 'Existing session token still works after ban (see UA-AUTH-ban-token)' : '');
  if (prof.status === 200) L.results['UA-AUTH-05'].remarks += '';
});
await safe('UA-AUTH-06', async () => {
  const email = `qa.${L.uniq()}@local.test`;
  const r = await post('/auth/register', { email, password: 'Passw0rd!', name: 'Reg Test', date_of_birth: '1990-04-20', time_of_birth: '08:00', birth_place: 'Delhi' });
  record('UA-AUTH-06', r.status === 201 || r.status === 200 ? 'Pass' : 'Fail', `register → ${r.status}; sun_sign=${r.body.data?.user?.sun_sign}`, 'DOB 20-Apr → expected Aries/Taurus cusp');
});
await safe('UA-AUTH-07', async () => {
  const r = await post('/auth/register', { email: `qa.${L.uniq()}@local.test`, password: '12345', name: 'Short' });
  record('UA-AUTH-07', r.status === 400 ? 'Pass' : 'Fail', `5-char password → ${r.status} "${r.body.message || JSON.stringify(r.body.errors || '').slice(0, 80)}"`);
});
await safe('UA-AUTH-08', async () => {
  const u = await L.registerUser();
  const r = await post('/auth/register', { email: u.email, password: 'Passw0rd!', name: 'Dup' });
  record('UA-AUTH-08', r.status === 409 || r.status === 400 ? 'Pass' : 'Fail', `duplicate email → ${r.status} "${r.body.message}"`);
});
await safe('UA-AUTH-09', async () => {
  const r = await post('/auth/register', { email: `qa.${L.uniq()}@local.test`, password: 'Passw0rd!', name: '' });
  record('UA-AUTH-09', r.status === 400 ? 'Pass' : 'Fail', `blank name → ${r.status}`, 'Server-side only');
});
await safe('UA-AUTH-13', async () => {
  const vals = ["' OR 1=1 --", '<script>alert(1)</script>', 'a'.repeat(300) + '@x.com'];
  const out = [];
  for (const v of vals) { const r = await L.login(v, v); out.push(r.status); }
  record('UA-AUTH-13', out.every((s) => s >= 400 && s < 500) ? 'Pass' : 'Fail', `injection/long inputs → ${out.join(', ')} (no 5xx)`);
});
await safe('UA-AUTH-14', async () => {
  const u = await L.registerUser();
  const r = await L.login('  ' + u.email.toUpperCase() + ' ', u.password);
  record('UA-AUTH-14', r.status === 200 ? 'Pass' : 'Fail', `spaced + uppercase email → ${r.status} "${r.body.message || 'ok'}"`);
});
await safe('UA-AUTH-15', async () => {
  const r = await post('/auth/register', { email: `qa.${L.uniq()}@local.test`, password: 'Passw0rd!', name: 'Future', date_of_birth: '2099-01-01' });
  record('UA-AUTH-15', r.status === 400 ? 'Pass' : 'Fail', `future DOB 2099-01-01 → ${r.status}`, r.status < 300 ? 'Server accepts a future DOB; only the date picker prevents it' : '');
});
await safe('UA-AUTH-17', async () => {
  const r = await get('/auth/profile', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.bad' });
  record('UA-AUTH-17', r.status === 401 ? 'Pass' : 'Fail', `invalid/expired token → ${r.status}`, 'Server side verified; app redirect to Login not driven');
});

// ── Robustness / security ──
await safe('UA-ROB-04', async () => {
  const a = await L.registerUser(), b = await L.registerUser();
  await L.credit(b.id, 50);
  const fm = await post('/family-members', { name: 'B kid', relationship: 'Son', date_of_birth: '2015-01-01', time_of_birth: '10:00', birth_place: 'Pune' }, { token: b.token });
  const fid = fm.body.data?.id;
  const tries = [];
  if (fid) {
    tries.push(['PUT family of B', (await put(`/family-members/${fid}`, { name: 'hacked' }, { token: a.token })).status]);
    tries.push(['DELETE family of B', (await del(`/family-members/${fid}`, { token: a.token })).status]);
  }
  tries.push(['admin API with user token', (await get('/admin/users', { token: a.token })).status]);
  const leak = tries.filter(([, s]) => s < 400);
  record('UA-ROB-04', leak.length ? 'Fail' : 'Pass', tries.map(([n, s]) => `${n} → ${s}`).join('; '));
});

// ── Admin money ops ──
const tok = await admin();
await safe('AD-TXN-02', async () => {
  const u = await L.registerUser();
  const c = await L.credit(u.id, 100);
  const d = await post('/admin/wallet/debit', { user_id: u.id, amount: 50 }, { token: tok });
  const bal = await L.balance(u.token);
  record('AD-TXN-02', c.status === 200 && d.status === 200 && bal === 50 ? 'Pass' : 'Fail', `credit 100 → ${c.status}, debit 50 → ${d.status}, app wallet balance = ${bal}`);
});
await safe('AD-TXN-04', async () => {
  const u = await L.registerUser();
  await L.credit(u.id, 50);
  const d = await post('/admin/wallet/debit', { user_id: u.id, amount: 100 }, { token: tok });
  const bal = await L.balance(u.token);
  record('AD-TXN-04', d.status === 400 && bal === 50 ? 'Pass' : 'Fail', `debit 100 from 50 → ${d.status} "${d.body.message}", balance ${bal}`);
});
await safe('AD-TXN-05', async () => {
  const u = await L.registerUser();
  const cases = [['0', 0], ['-10', -10], ['"abc"', 'abc'], ['"10abc"', '10abc'], ['unknown user', null]];
  const out = [];
  for (const [label, v] of cases) {
    const body = v === null ? { user_id: '00000000-0000-0000-0000-000000000000', amount: 10 } : { user_id: u.id, amount: v };
    const r = await post('/admin/wallet/credit', body, { token: tok });
    out.push(`${label} → ${r.status}`);
  }
  const bal = await L.balance(u.token);
  const bad = out.filter((s) => / → (2|5)\d\d$/.test(s));
  record('AD-TXN-05', bad.length ? 'Fail' : 'Pass', out.join('; ') + `; balance after = ${bal}`,
    bad.length ? 'Non-numeric / unknown-user amounts are not validated: request reaches the DB and returns 5xx (or succeeds)' : '');
});
await safe('AD-TXN-03', async () => {
  const u = await L.registerUser();
  await L.credit(u.id, 100);
  await post('/admin/wallet/debit', { user_id: u.id, amount: 40 }, { token: tok });
  const tx = await get(`/admin/transactions?user_id=${u.id}&type=debit`, { token: tok });
  const t = (tx.body.data?.transactions || tx.body.data || []).find((x) => x.type === 'debit');
  const r1 = await post(`/admin/transactions/${t.id}/refund`, { reason: 'QA' }, { token: tok });
  const r2 = await post(`/admin/transactions/${t.id}/refund`, { reason: 'QA again' }, { token: tok });
  const bal = await L.balance(u.token);
  record('AD-TXN-03', r1.status === 200 && r2.status === 400 && bal === 100 ? 'Pass' : 'Fail', `refund → ${r1.status}; second refund → ${r2.status} "${r2.body.message}"; balance ${bal} (expected 100)`);
});
await safe('AD-TXN-06', async () => {
  const u = await L.registerUser();
  await L.credit(u.id, 100);
  await post('/admin/wallet/debit', { user_id: u.id, amount: 40 }, { token: tok });
  const tx = await get(`/admin/transactions?user_id=${u.id}&type=debit`, { token: tok });
  const t = (tx.body.data?.transactions || tx.body.data || []).find((x) => x.type === 'debit');
  const rs = await Promise.all([1, 2, 3, 4, 5].map(() => post(`/admin/transactions/${t.id}/refund`, {}, { token: tok })));
  const bal = await L.balance(u.token);
  const ok = rs.filter((r) => r.status === 200).length;
  record('AD-TXN-06', ok === 1 && bal === 100 ? 'Pass' : 'Fail', `5 concurrent refunds → ${ok} succeeded; balance ${bal} (expected 100)`,
    ok > 1 ? 'Race condition: refund status is checked then updated without a lock/transaction, so one debit can be refunded several times' : '');
});
await safe('AD-TXN-01', async () => {
  const out = [];
  for (const t of ['credit', 'debit', 'refund']) {
    const r = await get(`/admin/transactions?type=${t}`, { token: tok });
    const rows = r.body.data?.transactions || r.body.data || [];
    out.push(`${t}: ${r.status}, ${rows.length} rows, all match=${rows.every((x) => x.type === t)}`);
  }
  record('AD-TXN-01', out.every((s) => s.includes('200') && s.endsWith('true')) ? 'Pass' : 'Fail', out.join('; '));
});

// ── Admin auth ──
await safe('AD-AUTH-01', async () => {
  const r = await post('/admin/login', { email: 'qa-admin@local.test', password: 'LocalQaAdmin#2026' });
  record('AD-AUTH-01', r.status === 200 ? 'Pass' : 'Fail', `login → ${r.status}; isSuperAdmin=${r.body.data?.admin?.role || JSON.stringify(r.body.data?.admin || {}).slice(0, 60)}`, 'API level; UI covered by Playwright run');
});
await safe('AD-AUTH-02', async () => {
  const r = await post('/admin/login', { email: 'qa-admin@local.test', password: 'wrong' });
  record('AD-AUTH-02', r.status === 401 || r.status === 400 ? 'Pass' : 'Fail', `wrong password → ${r.status}`);
});
await safe('AD-AUTH-06', async () => {
  const r = await get('/admin/users', { token: 'eyJhbGciOiJIUzI1NiJ9.e30.bad' });
  const n = await get('/admin/users');
  record('AD-AUTH-06', r.status === 401 && n.status === 401 ? 'Pass' : 'Fail', `bad token → ${r.status}; no token → ${n.status}`, 'API side; UI redirect checked in Playwright');
});

// ── Sub-admins / permissions ──
await safe('AD-SUB-01', async () => {
  const email = `sub.${L.uniq()}@local.test`;
  const c = await post('/admin/sub-admins', { name: 'QA Sub', email, password: 'SubAdminPass#1', permissions: ['users', 'withdrawals'] }, { token: tok });
  const l = await post('/admin/login', { email, password: 'SubAdminPass#1' });
  const st = l.body.data?.token;
  const allowed = await get('/admin/users', { token: st });
  const denied = await get('/admin/transactions', { token: st });
  const superOnly = await get('/admin/sub-admins', { token: st });
  const dwr = await post('/admin/wallet/credit', { user_id: '00000000-0000-0000-0000-000000000000', amount: 1 }, { token: st });
  L.results._sub = { email, id: c.body.data?.id, token: st };
  record('AD-SUB-01', c.status < 300 && l.status === 200 && allowed.status === 200 && denied.status === 403 && superOnly.status === 403 ? 'Pass' : 'Fail',
    `create → ${c.status}; login → ${l.status}; /users → ${allowed.status}; /transactions → ${denied.status}; /sub-admins → ${superOnly.status}`);
  record('AD-AUTH-08', dwr.status === 403 && denied.status === 403 ? 'Pass' : 'Fail', `sub-admin without 'transactions': GET /transactions → ${denied.status}, POST /wallet/credit → ${dwr.status}`);
});
await safe('AD-AUTH-09', async () => {
  const s = L.results._sub;
  const u = await put(`/admin/sub-admins/${s.id}`, { name: 'QA Sub', email: s.email, permissions: ['withdrawals'] }, { token: tok });
  const r = await get('/admin/users', { token: s.token });
  record('AD-AUTH-09', r.status === 403 ? 'Pass' : 'Fail', `revoke 'users' → ${u.status}; same session GET /users → ${r.status}`,
    r.status === 200 ? 'Permissions are baked into the existing JWT; a revoked section stays usable until the sub-admin logs in again' : '');
});
await safe('AD-SUB-03', async () => {
  const s = L.results._sub;
  const dup = await post('/admin/sub-admins', { name: 'Dup', email: s.email, password: 'SubAdminPass#1', permissions: ['users'] }, { token: tok });
  const none = await post('/admin/sub-admins', { name: 'None', email: `none.${L.uniq()}@local.test`, password: 'SubAdminPass#1', permissions: [] }, { token: tok });
  record('AD-SUB-03', dup.status === 409 || dup.status === 400 ? 'Pass' : 'Fail', `duplicate email → ${dup.status} "${dup.body.message}"; no permissions → ${none.status} "${none.body.message || 'created'}"`, 'Self-delete not tested (would remove the QA super-admin)');
});
await safe('AD-SUB-02', async () => {
  const s = L.results._sub;
  const d = await del(`/admin/sub-admins/${s.id}`, { token: tok });
  const l = await post('/admin/login', { email: s.email, password: 'SubAdminPass#1' });
  const r = await get('/admin/withdrawals', { token: s.token });
  record('AD-SUB-02', d.status === 200 && l.status >= 400 ? 'Pass' : 'Fail', `delete → ${d.status}; login after delete → ${l.status}; old token GET /withdrawals → ${r.status}`,
    r.status === 200 ? 'Deleted sub-admin\'s existing token still works until it expires' : '');
});
delete L.results._sub;

await safe('AD-AUD-01', async () => {
  const r = await get('/admin/audit-logs?limit=50', { token: tok });
  const rows = r.body.data?.logs || r.body.data || [];
  const actions = [...new Set(rows.map((x) => x.action))];
  record('AD-AUD-01', r.status === 200 && rows.length > 0 ? 'Pass' : 'Fail', `${rows.length} entries; actions seen: ${actions.slice(0, 8).join(', ')}`);
});
await safe('AD-AUTH-07', async () => {
  const inj = await post('/admin/login', { email: "' OR 1=1 --", password: "' OR 1=1 --" });
  const st = [];
  for (let i = 0; i < 12; i++) st.push((await post('/admin/login', { email: 'qa-admin@local.test', password: 'bad' + i })).status);
  const limited = st.some((s) => s === 429);
  const finalGood = await post('/admin/login', { email: 'qa-admin@local.test', password: 'LocalQaAdmin#2026' });
  record('AD-AUTH-07', inj.status >= 400 && inj.status < 500 && limited ? 'Pass' : 'Fail',
    `injection → ${inj.status}; 12 wrong passwords → ${[...new Set(st)].join('/')}; correct login after → ${finalGood.status}`,
    limited ? '' : 'No rate limit / lockout on admin login after 12 failed attempts (brute-force risk)');
});
L.save();
process.exit(0);
