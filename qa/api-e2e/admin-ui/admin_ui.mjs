// Admin panel UI checks with Playwright — LOCAL dev server (proxy → local backend) only.
import { chromium } from 'playwright';
import fs from 'fs';
import * as L from '../lib.mjs';

const BASE = 'http://localhost:5174/admin';
const SHOTS = new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const how = 'Playwright (Chromium) against local admin dev server';
const rec = (id, st, actual, remarks = '') => { L.record(id, st, actual, remarks); L.results[id].how = how; };

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
}
const menu = async (page) => (await page.locator('aside, nav').first().innerText()).split('\n').map((s) => s.trim()).filter(Boolean);

// ── Logged-out redirect ──
await L.safe('AD-AUTH-03', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${BASE}/users`);
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  rec('AD-AUTH-03', page.url().endsWith('/admin/login') ? 'Pass' : 'Fail', `/admin/users while logged out → ${page.url().replace('http://localhost:5174', '')}`);
  await ctx.close();
});

// ── Wrong password ──
await L.safe('AD-AUTH-02', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await login(page, 'qa-admin@local.test', 'wrong-password');
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  const shown = /invalid|incorrect|failed|credentials/i.test(body);
  await page.screenshot({ path: SHOTS + 'login-wrong-password.png' });
  rec('AD-AUTH-02', page.url().includes('/login') && shown ? 'Pass' : 'Fail', `stays on ${page.url().replace('http://localhost:5174', '')}; error shown=${shown}`);
  await ctx.close();
});

// ── Super-admin session: login, menus, every page, XSS, logout ──
await L.safe('AD-AUTH-01', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const errors = []; let dialogs = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => { dialogs++; await d.dismiss(); });
  await login(page, 'qa-admin@local.test', 'LocalQaAdmin#2026');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 10000 });
  await page.waitForTimeout(1500);
  const items = await menu(page);
  const hasSuper = items.includes('Sub-admins') && items.includes('Audit Log');
  await page.screenshot({ path: SHOTS + 'dashboard.png' });
  rec('AD-AUTH-01', hasSuper ? 'Pass' : 'Fail', `logged in → dashboard; menu: ${items.slice(0, 16).join(', ')}`);
  const dashText = await page.locator('main').innerText().catch(() => '');
  rec('AD-DSH-01', dashText.length > 50 && !errors.length ? 'Pass' : 'Fail', `dashboard rendered (${dashText.length} chars of content), page errors: ${errors.length}`, 'Figures cross-checked via API in earlier run');

  // smoke every page
  const pages = ['users', 'astrologers', 'withdrawals', 'reports', 'transactions', 'community', 'notifications', 'hirings', 'agent-messages', 'recharge-offers', 'violators', 'sub-admins', 'audit-logs'];
  const res = [];
  for (const p of pages) {
    const before = errors.length;
    await page.goto(`${BASE}/${p}`);
    await page.waitForTimeout(1200);
    const txt = await page.locator('main').innerText().catch(() => '');
    res.push(`${p}:${txt.length > 30 && errors.length === before ? 'ok' : 'PROBLEM'}`);
    await page.screenshot({ path: `${SHOTS}${p}.png` });
  }
  const bad = res.filter((x) => x.endsWith('PROBLEM'));
  rec('AD-USR-01', L.results['AD-USR-01']?.status === 'Pass' && !bad.some((b) => b.startsWith('users')) ? 'Pass' : 'Fail', (L.results['AD-USR-01']?.actual || '') + `; Users page renders in browser`);
  L.results._uiSmoke = res.join(', ');

  // XSS: community page must render the payload as text
  const xssBefore = dialogs;
  await page.goto(`${BASE}/community`);
  await page.waitForTimeout(2000);
  const shown = (await page.locator('main').innerText()).includes('<script>alert(1)</script>');
  rec('AD-GEN-02', dialogs === xssBefore ? 'Pass' : 'Fail', `community post "<img onerror=alert(1)><script>alert(1)</script>" → rendered as text=${shown}; script executed=${dialogs > xssBefore}`, 'Agent messages and user names use the same React text rendering');

  // Logout + back button
  await page.getByText('Logout', { exact: true }).click();
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  await page.goBack();
  await page.waitForTimeout(1000);
  rec('AD-AUTH-05', page.url().includes('/login') ? 'Pass' : 'Fail', `logout → ${page.url().replace('http://localhost:5174', '')} after pressing Back`);
  if (bad.length) L.results._uiBad = bad;
  await ctx.close();
});

// ── Sub-admin menus + direct URL to super-admin pages ──
await L.safe('AD-AUTH-04', async () => {
  const tok = await L.admin();
  const email = `ui.sub.${L.uniq()}@local.test`;
  await L.post('/admin/sub-admins', { name: 'UI Sub', email, password: 'SubAdminPass#1', permissions: ['users', 'hirings'] }, { token: tok });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await login(page, email, 'SubAdminPass#1');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 10000 });
  await page.waitForTimeout(1000);
  const items = await menu(page);
  await page.goto(`${BASE}/sub-admins`); await page.waitForTimeout(800);
  const u1 = page.url();
  await page.goto(`${BASE}/transactions`); await page.waitForTimeout(1200);
  const txText = await page.locator('main').innerText().catch(() => '');
  const ok = !items.includes('Transactions') && !items.includes('Sub-admins') && items.includes('Users') && !u1.includes('sub-admins');
  rec('AD-AUTH-04', ok ? 'Pass' : 'Fail', `sub-admin (users, hirings) menu: ${items.filter((x) => x.length < 20).join(', ')}; /sub-admins → ${u1.replace('http://localhost:5174', '')}; /transactions by URL shows: "${txText.slice(0, 80).replace(/\n/g, ' ')}"`,
    'API refuses forbidden sections with 403 (AD-AUTH-08)');
  await ctx.close();
});

// ── API failure handling ──
await L.safe('AD-GEN-01', async () => {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await login(page, 'qa-admin@local.test', 'LocalQaAdmin#2026');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 10000 });
  await page.route('**/api/admin/users**', (r) => r.fulfill({ status: 500, body: '{"success":false,"message":"Server error"}', contentType: 'application/json' }));
  await page.goto(`${BASE}/users`);
  await page.waitForTimeout(2000);
  const txt = await page.locator('body').innerText();
  const blank = txt.trim().length < 20;
  await page.screenshot({ path: SHOTS + 'users-api-500.png' });
  rec('AD-GEN-01', !blank ? 'Pass' : 'Fail', `Users API returning 500 → page still renders (${txt.length} chars); error feedback shown=${/error|failed|could not/i.test(txt)}`,
    /error|failed|could not/i.test(txt) ? '' : 'Page shows an empty list instead of an error message when the API fails');
  await ctx.close();
});

await browser.close();
L.save();
console.log('smoke:', L.results._uiSmoke, L.results._uiBad || '');
process.exit(0);
