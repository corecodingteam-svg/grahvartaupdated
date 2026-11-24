# API / socket end-to-end suites

Automated checks behind the "API / socket bot" and "Playwright" rows of
`docs/GrahVarta_E2E_Test_Cases.xlsx`. Bots play the user, astrologer and admin
against a **local** stack; `lib.mjs` refuses to run against anything but
`localhost`.

## Run

```bash
cd qa/api-e2e
docker compose up -d --build            # Postgres + backend (:3300) + Mailpit (:18025)
docker compose exec -T -e ADMIN_EMAIL=qa-admin@local.test -e ADMIN_PASSWORD='LocalQaAdmin#2026' backend node scripts/create-admin.js
(cd ../../grahvarta-web && npm install) # provides socket.io-client

# Restart the backend between suites: login/OTP rate limiters are in memory.
for s in s1_auth_money s2_consult_fast s3_billing s3b_redrop s4a_agent s4b_otp_wallet s5_admin_features s6_extra; do
  docker restart gv-test-backend-1 >/dev/null; sleep 8; node $s.mjs
done
```

- `s4b` must start at least 60 s after `s4a` (per-email OTP resend limit).
- `s3_billing` waits through real billing minutes (~2.5 min).
- Results are collected in `results.json` (Pass / Fail / Blocked per test case ID).

Admin UI (Playwright):

```bash
(cd ../../admin-portal && ADMIN_API_PROXY=http://localhost:3300 npx vite --port 5174) &
npm i playwright@1.65.1 && node admin-ui/admin_ui.mjs && node admin-ui/admin_ui2.mjs
```

For the app screen tests, `node hold_astro.mjs` keeps an online astrologer and a ₹0 user ready (written to `sim_data.json`).

App UI (simulator/device): `integration_test/e2e_smoke_test.dart` (and `e2e_screens_test.dart` in the user app) in each Flutter
app, built with `--dart-define=API_HOST=http://127.0.0.1:3300` (see the header of
each file for the other defines).

Not covered locally: Razorpay payments (need test keys), push delivery (FCM
credentials), report generation (generator key), call audio/video.

Clean up: `docker compose down -v --rmi local`.
