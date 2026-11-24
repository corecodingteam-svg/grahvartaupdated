// Keeps one approved astrologer online (socket connected) for simulator tests; prints its details.
import * as L from './lib.mjs';
import fs from 'fs';
const a = await L.makeAstrologer({ chat: 10, call: 15, video: 20 });
await L.goOnline(a);
const s = L.sock(a.token, 'astrologer'); await s.ready;
const u = await L.registerUser('Screens QA');
const name = L.sql(`SELECT display_name FROM astrologers WHERE id='${a.astroId}'`);
fs.writeFileSync(new URL('./sim_data.json', import.meta.url), JSON.stringify({ astroName: name, astroEmail: a.email, userEmail: u.email, password: 'Passw0rd!' }));
console.log('holding', name, 'online; user', u.email);
setTimeout(() => process.exit(0), 20 * 60 * 1000);
