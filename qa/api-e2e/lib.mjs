// Shared helpers for the GrahVarta local E2E runner. LOCAL STACK ONLY.
import { createRequire } from 'module';
import fs from 'fs';
// socket.io-client comes from the website package (npm install there first)
const require = createRequire(new URL('../../grahvarta-web/package.json', import.meta.url));
export const { io } = require('socket.io-client');

export const BASE = 'http://localhost:3300';
export const API = BASE + '/api';
export const MAIL = 'http://localhost:18025';
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error('Refusing to run against a non-local backend');

export const results = {};
const RESULTS_FILE = new URL('./results.json', import.meta.url).pathname;
try { Object.assign(results, JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'))); } catch {}

export function record(id, status, actual, remarks = '') {
  results[id] = { status, actual, remarks, how: results[id]?.how || 'API / socket bot (local stack)' };
  const icon = { Pass: '✅', Fail: '❌', Blocked: '⛔', 'N/A': '➖' }[status] || '?';
  console.log(`${icon} ${id} ${status}: ${actual}${remarks ? ' — ' + remarks : ''}`);
}
export function save() { fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2)); }

export async function req(method, path, { token, body, raw } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)),
  });
  let json = null;
  const text = await r.text();
  try { json = JSON.parse(text); } catch { json = { _text: text.slice(0, 200) }; }
  return { status: r.status, body: json };
}
export const get = (p, o) => req('GET', p, o);
export const post = (p, body, o = {}) => req('POST', p, { ...o, body });
export const put = (p, body, o = {}) => req('PUT', p, { ...o, body });
export const patch = (p, body, o = {}) => req('PATCH', p, { ...o, body });
export const del = (p, o) => req('DELETE', p, o);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uniq = () => Math.random().toString(36).slice(2, 8);

export async function registerUser(name = 'QA User') {
  const email = `qa.${uniq()}@local.test`;
  const r = await post('/auth/register', { email, password: 'Passw0rd!', name, date_of_birth: '1992-08-15', time_of_birth: '10:30', birth_place: 'Jaipur' });
  if (r.status >= 300) throw new Error('register failed ' + JSON.stringify(r.body));
  return { email, password: 'Passw0rd!', token: r.body.data.token, user: r.body.data.user, id: r.body.data.user.id };
}
export async function login(email, password, login_as = 'user') {
  return post('/auth/login', { email, password, login_as });
}

let adminToken = null;
export async function admin() {
  if (adminToken) return adminToken;
  const r = await post('/admin/login', { email: 'qa-admin@local.test', password: 'LocalQaAdmin#2026' });
  if (r.status !== 200) throw new Error('admin login failed ' + JSON.stringify(r.body));
  adminToken = r.body.data.token;
  return adminToken;
}

export async function balance(token) {
  const r = await get('/wallet', { token });
  return parseFloat(r.body?.data?.balance ?? r.body?.data?.wallet?.balance ?? NaN);
}

export async function credit(userId, amount) {
  return post('/admin/wallet/credit', { user_id: userId, amount, description: 'QA credit' }, { token: await admin() });
}

/** Creates an approved astrologer and returns its tokens/ids. */
export async function makeAstrologer(rates = { chat: 10, call: 15, video: 20 }) {
  const u = await registerUser('QA Astro ' + uniq());
  const reg = await post('/astrologers/register', {
    display_name: 'Astro ' + uniq(), bio: 'QA bio', experience_years: 5, languages: ['English', 'Hindi'],
    specializations: ['Vedic'], expertise_areas: ['Career'],
    per_minute_rate_chat: rates.chat, per_minute_rate_call: rates.call, per_minute_rate_video: rates.video,
  }, { token: u.token });
  if (reg.status !== 201) throw new Error('astro register ' + JSON.stringify(reg.body));
  const astroId = reg.body.data.id;
  const ap = await post(`/admin/astrologers/${astroId}/approve`, {}, { token: await admin() });
  if (ap.status !== 200) throw new Error('approve ' + JSON.stringify(ap.body));
  const l = await login(u.email, u.password, 'astrologer');
  const token = l.body?.data?.token || u.token;
  return { ...u, token, astroId };
}

/** Connected socket with promise helpers. */
export function sock(token, role) {
  const s = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  s.events = [];
  s.onAny((ev, data) => s.events.push({ ev, data, at: Date.now() }));
  s.ready = new Promise((res, rej) => {
    s.on('connect', () => { s.emit('set_role', { role }); setTimeout(res, 400); });
    s.on('connect_error', rej);
  });
  s.waitFor = (ev, ms = 6000, pred = () => true) => new Promise((res, rej) => {
    const hit = s.events.find((e) => e.ev === ev && pred(e.data));
    if (hit) return res(hit.data);
    const t = setTimeout(() => { s.off(ev, h); rej(new Error(`timeout waiting for ${ev}`)); }, ms);
    const h = (d) => { if (pred(d)) { clearTimeout(t); s.off(ev, h); res(d); } };
    s.on(ev, h);
  });
  s.clear = () => { s.events = []; };
  return s;
}

export async function goOnline(astro, modes = { chat: true, call: true, video: true }) {
  const r = await patch('/astrologers/availability', {
    is_available: true, is_chat_available: modes.chat, is_call_available: modes.call, is_video_available: modes.video,
  }, { token: astro.token });
  return r;
}

export async function mailFor(email) {
  const r = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`);
  const j = await r.json();
  return j.messages || [];
}
export async function latestOtp(email) {
  for (let i = 0; i < 10; i++) {
    const msgs = await mailFor(email);
    if (msgs.length) {
      const m = await (await fetch(`${MAIL}/api/v1/message/${msgs[0].ID}`)).json();
      const code = (m.Text || m.HTML || '').match(/\b(\d{5})\b/);
      if (code) return code[1];
    }
    await sleep(500);
  }
  return null;
}

export async function safe(id, fn) {
  try { await fn(); } catch (e) { record(id, 'Blocked', `Runner error: ${e.message}`.slice(0, 300)); }
}

import { execFileSync } from 'child_process';
/** Read-only SQL against the LOCAL test DB container (for verifying money movement). */
export function sql(q) {
  return execFileSync('docker', ['exec', 'gv-test-db-1', 'psql', '-U', 'gv', '-d', 'gv_test', '-At', '-F', '|', '-c', q], { encoding: 'utf8' }).trim();
}
export const userBal = (uid) => parseFloat(sql(`SELECT balance FROM wallets WHERE user_id='${uid}'`) || 'NaN');
export const astroBal = (aid) => parseFloat(sql(`SELECT wallet_balance FROM astrologers WHERE id='${aid}'`) || 'NaN');
export const consult = (cid) => {
  const [status, dur, total, earn] = sql(`SELECT status, duration_seconds, total_amount, astrologer_earning FROM consultations WHERE id='${cid}'`).split('|');
  return { status, dur: +dur, total: +total, earn: +earn };
};

/** User + online astrologer with sockets connected. */
export async function pair({ balance = 100, rates, modes } = {}) {
  const astro = await makeAstrologer(rates);
  await goOnline(astro, modes);
  const as = sock(astro.token, 'astrologer'); await as.ready;
  const user = await registerUser();
  if (balance) await credit(user.id, balance);
  const us = sock(user.token, 'user'); await us.ready;
  return { astro, as, user, us };
}
/** Request + accept; resolves with consultation id once both sides see consultation_started. */
export async function startSession({ as, us, astro }, type = 'chat') {
  us.emit('request_consultation', { astrologer_id: astro.astroId, type });
  const reqEv = await as.waitFor('new_consultation_request', 8000);
  as.emit('accept_consultation', { consultation_id: reqEv.consultation_id });
  await us.waitFor('consultation_started', 8000);
  await as.waitFor('consultation_started', 8000);
  return reqEv.consultation_id;
}

/** Newest 5-digit code for an email, waiting for a fresh message. */
export async function latestOtpAfter(email) {
  const before = (await mailFor(email)).length;
  for (let i = 0; i < 20; i++) {
    const msgs = await mailFor(email);
    if (msgs.length && (msgs.length > before || i > 3)) {
      const m = await (await fetch(`${MAIL}/api/v1/message/${msgs[0].ID}`)).json();
      const code = (m.Text || '').match(/\b(\d{5})\b/);
      if (code) return code[1];
    }
    await sleep(300);
  }
  return null;
}
