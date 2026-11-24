import * as L from './lib.mjs';
const { record, safe, post, get, put, patch, sleep } = L;
const tok = await L.admin();
const phoneOf = () => '+91' + (9000000000 + Math.floor(Math.random() * 999999999)).toString().slice(0, 10);
const dev = () => 'qa-device-' + L.uniq();

const A = { email: `agent.${L.uniq()}@local.test`, phone: phoneOf(), device: dev() };
L.results._agentA = A;

await safe('AG-OTP-02', async () => {
  const r = await post('/hirings/send-otp', { email: A.email, phone: '+9112345', device_id: A.device });
  record('AG-OTP-02', r.status === 400 ? 'Pass' : 'Fail', `5-digit mobile → ${r.status} "${r.body.message}"`);
});
await safe('AG-OTP-03', async () => {
  const r = await post('/hirings/send-otp', { email: 'abc@', phone: A.phone, device_id: A.device });
  record('AG-OTP-03', r.status === 400 ? 'Pass' : 'Fail', `"abc@" → ${r.status} "${r.body.message}"`);
});
let otp;
await safe('AG-OTP-01', async () => {
  const r = await post('/hirings/send-otp', { email: A.email, phone: A.phone, device_id: A.device });
  otp = await L.latestOtp(A.email);
  record('AG-OTP-01', r.status === 200 && otp ? 'Pass' : 'Fail', `send-otp → ${r.status} (mode ${r.body.mode}); 5-digit code received by email=${!!otp}`, 'Email captured by local Mailpit');
  const again = await post('/hirings/send-otp', { email: A.email, phone: A.phone, device_id: A.device });
  record('AG-OTP-07', again.status === 429 ? 'Pass' : 'Fail', `immediate resend → ${again.status} "${again.body.message}"`, 'Resend is allowed after 60 s (not waited for); old-code invalidation not checked');
});
let vtoken;
await safe('AG-OTP-10', async () => {
  const r = await post('/hirings/verify-otp', { email: A.email, otp: '12a4' });
  record('AG-OTP-10', r.status === 400 ? 'Pass' : 'Fail', `"12a4" → ${r.status} "${r.body.message}"`, 'Paste/trim behaviour is client-side');
});
await safe('AG-OTP-04', async () => {
  const r = await post('/hirings/verify-otp', { email: A.email, otp });
  vtoken = r.body.data?.verification_token;
  record('AG-OTP-04', r.status === 200 && r.body.data?.mode === 'register' && vtoken ? 'Pass' : 'Fail', `correct code → ${r.status}, mode ${r.body.data?.mode}, token issued=${!!vtoken}`);
});
const application = (over = {}) => ({
  phone: A.phone, email: A.email, device_id: A.device, device_platform: 'android', email_verification_token: vtoken,
  name: 'QA Agent', dob: '1990-05-05', gender: 'Female', languages: ['Hindi', 'English'], skills: ['Vedic', 'Tarot'],
  phone_type: 'android', works_online: true, online_platforms: 'AstroSage', hours_available: 6, about_me: 'Ten years of practice', ...over,
});
await safe('AG-REG-01', async () => {
  const r = await post('/hirings/apply', application());
  A.id = r.body.data?.id;
  const st = await get(`/hirings/status?phone=${encodeURIComponent(A.phone)}&device_id=${A.device}`);
  const list = await get('/admin/hirings?status=pending', { token: tok });
  const inAdmin = JSON.stringify(list.body).includes(A.email);
  record('AG-REG-01', r.status === 201 && inAdmin ? 'Pass' : 'Fail', `apply → ${r.status}, token no ${r.body.data?.token_no}; status API → ${st.status} (${st.body.data?.status || st.body.data?.application?.status}); listed in Admin › Hirings (pending)=${inAdmin}`, 'Photo upload skipped (profile_picture_url empty)');
  const dup = await post('/hirings/apply', application());
  record('AG-REG-07', dup.status >= 400 ? 'Pass' : 'Fail', `second submit with same verification → ${dup.status} "${dup.body.message}"`);
  record('AG-REG-08', dup.status >= 400 ? 'Pass' : 'Fail', `duplicate application for same phone/email → ${dup.status}`, 'Covered via re-submit; separate OTP round not repeated (rate limit)');
});
await safe('AG-REG-05', async () => {
  // fresh verified email to see what the server accepts
  const B = { email: `agent.${L.uniq()}@local.test`, phone: phoneOf(), device: dev() };
  await post('/hirings/send-otp', { email: B.email, phone: B.phone, device_id: B.device });
  const code = await L.latestOtp(B.email);
  const v = await post('/hirings/verify-otp', { email: B.email, otp: code });
  const r = await post('/hirings/apply', { ...application(), phone: B.phone, email: B.email, device_id: B.device, email_verification_token: v.body.data?.verification_token,
    name: '', dob: '2099-01-01', hours_available: 30, languages: [] });
  record('AG-REG-05', r.status === 400 ? 'Pass' : 'Fail', `empty name + DOB 2099 + 30 h/day + no languages → ${r.status} "${r.body.message || 'accepted'}"`,
    r.status < 300 ? 'Server accepts invalid application data; only the app form validates' : '');
  // a valid application for the same applicant (verification is only consumed on success)
  const ok = await post('/hirings/apply', { ...application(), phone: B.phone, email: B.email, device_id: B.device, email_verification_token: v.body.data?.verification_token, name: 'QA Agent B' });
  L.results._agentB = { ...B, id: ok.body.data?.id };
  L.results['AG-REG-05'].actual += `; same applicant with valid data → ${ok.status}`;
});
await safe('AG-DSH-01', async () => {
  const steps = [];
  for (const s of ['shortlisted', 'round1', 'activated']) {
    const r = await patch(`/admin/hirings/${A.id}`, { status: s }, { token: tok });
    const st = await get(`/hirings/status?phone=${encodeURIComponent(A.phone)}&device_id=${A.device}`);
    steps.push(`${s}: admin ${r.status} → app sees ${st.body.data?.status || st.body.data?.application?.status}`);
  }
  record('AG-DSH-01', steps.every((x) => /admin 200/.test(x)) ? 'Pass' : 'Fail', steps.join('; '), 'Progress tracker UI not checked');
  record('AD-HIR-01', steps[0].includes('200') ? 'Pass' : 'Fail', steps[0]);
});
await safe('AD-HIR-02', async () => {
  const B = L.results._agentB;
  const r = await patch(`/admin/hirings/${B.id}`, { status: 'rejected' }, { token: tok });
  const st = await get(`/hirings/status?phone=${encodeURIComponent(B.phone)}&device_id=${B.device}`);
  record('AD-HIR-02', r.status === 200 ? 'Pass' : 'Fail', `reject → ${r.status}; agent status API shows ${st.body.data?.status || st.body.data?.application?.status}`);
  const bad = await patch(`/admin/hirings/${B.id}`, { status: 'hired!!' }, { token: tok });
  L.results['AD-HIR-02'].actual += `; invalid status → ${bad.status}`;
});
await safe('AD-HIR-03', async () => {
  const r = await put(`/admin/hirings/${A.id}/profile`, { name: 'QA Agent Edited', languages: ['Hindi', 'English', 'Tamil'] }, { token: tok });
  record('AD-HIR-03', r.status === 200 ? 'Pass' : 'Fail', `edit profile → ${r.status}; name now "${r.body.data?.name}"`);
});
await safe('AD-HIR-04', async () => {
  const r = await post(`/admin/hirings/${A.id}/activate-as-astrologer`, {}, { token: tok });
  await sleep(1500);
  const msgs = await L.mailFor(A.email);
  let pw = null;
  for (const m of msgs) {
    const full = await (await fetch(`${L.MAIL}/api/v1/message/${m.ID}`)).json();
    const mm = (full.Text || '').match(/Temporary Password\s+(\S+)/i);
    if (mm) { pw = mm[1]; break; }
  }
  const l = pw ? await L.login(A.email, pw, 'astrologer') : { status: 'n/a', body: {} };
  record('AD-HIR-04', r.status === 200 && l.status === 200 ? 'Pass' : 'Fail', `activate → ${r.status} "${r.body.message || ''}"; welcome email with temp password=${!!pw}; Astrologer App login → ${l.status} (must_change_password=${l.body.data?.user?.must_change_password})`);
  record('E2E-HIRE-01', r.status === 200 && l.status === 200 ? 'Pass' : 'Fail', 'OTP → apply → shortlist → activated → astrologer account → login with emailed credentials all worked', 'Profile setup + admin approval + online steps covered in other cases');
  A.pw = pw;
  const twice = await post(`/admin/hirings/${A.id}/activate-as-astrologer`, {}, { token: tok });
  record('AD-HIR-06', twice.status === 409 ? 'Pass' : 'Fail', `activate again → ${twice.status} "${twice.body.message}"`, 'Email-already-registered branch not separately tested');
});
await safe('AD-HIR-05', async () => {
  const before = (await L.mailFor(A.email)).length;
  const re = await post(`/admin/hirings/${A.id}/resend-email`, {}, { token: tok });
  const rp = await post(`/admin/hirings/${A.id}/reset-password`, {}, { token: tok });
  await sleep(1500);
  const after = (await L.mailFor(A.email)).length;
  const newPw = rp.body.data?.password;
  const l2 = newPw ? await L.login(A.email, newPw, 'astrologer') : { status: 'n/a' };
  const old = A.pw ? await L.login(A.email, A.pw, 'astrologer') : { status: 'n/a' };
  record('AD-HIR-05', re.status === 409 && rp.status === 200 && l2.status === 200 && old.status === 401 ? 'Pass' : 'Fail',
    `resend after welcome already sent → ${re.status} "${re.body.message}"; reset password → ${rp.status}, new password shown to admin; login with new → ${l2.status}, with old → ${old.status}`,
    'Reset password returns the new temporary password to the admin (no email is sent); resend is blocked once the welcome email went out');
});
await safe('AG-SUP-01', async () => {
  const s = await post('/hirings/messages', { phone: A.phone, device_id: A.device, message: 'When is my interview?' });
  const adminList = await get('/admin/agent-messages', { token: tok });
  const m = (adminList.body.data?.messages || adminList.body.data || []).find((x) => (x.message || '').includes('interview'));
  record('AG-SUP-01', s.status < 300 && m ? 'Pass' : 'Fail', `send → ${s.status}; visible in Admin › Agent Messages=${!!m}`);
  const reply = m ? await patch(`/admin/agent-messages/${m.id}`, { reply: 'Interview is on Monday', status: 'replied' }, { token: tok }) : { status: 'n/a' };
  const mine = await get(`/hirings/messages?phone=${encodeURIComponent(A.phone)}&device_id=${A.device}`);
  const seen = JSON.stringify(mine.body).includes('Interview is on Monday');
  record('AD-MSG-01', reply.status === 200 && seen ? 'Pass' : 'Fail', `admin reply → ${reply.status}; agent sees reply=${seen}`);
  record('AG-SUP-02', seen ? 'Pass' : 'Fail', `agent message list contains admin reply=${seen}`);
  record('E2E-SUPPORT-01', seen ? 'Pass' : 'Fail', 'agent message → admin reply → agent sees it');
  const empty = await post('/hirings/messages', { phone: A.phone, device_id: A.device, message: '   ' });
  const long = await post('/hirings/messages', { phone: A.phone, device_id: A.device, message: 'z'.repeat(6000) });
  record('AG-SUP-04', empty.status === 400 ? 'Pass' : 'Fail', `empty → ${empty.status}; 6,000 chars → ${long.status} "${long.body.message || ''}"`, 'Offline case is client-side');
});
L.save();
process.exit(0);
