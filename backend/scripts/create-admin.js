#!/usr/bin/env node
// Creates or updates the default admin user.
// Usage: node scripts/create-admin.js
// Override defaults: ADMIN_EMAIL=x ADMIN_PASSWORD=y node scripts/create-admin.js

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');
require('dotenv').config();

const email    = process.env.ADMIN_EMAIL    || 'admin@grahvarta.com';
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error('Set ADMIN_PASSWORD (at least 12 characters). No default password is used.');
  process.exit(1);
}
const name     = process.env.ADMIN_NAME     || 'Super Admin';

async function main() {
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email)
     DO UPDATE SET password_hash = $2, name = $3, role = 'admin'`,
    [email, hash, name]
  );

  console.log('✓ Admin user ready');
  console.log('  Email:   ', email);
  console.log('  ⚠  Change the password after first login!');
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
