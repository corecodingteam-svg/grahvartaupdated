// Agora Real-Time Speech-to-Text (STT) for voice/video consultations.
//
// When a call starts, an Agora STT agent joins the consultation's channel
// (channel name = consultation id). Its "pub bot" publishes the recognised
// text into the channel as data-stream messages; the astrologer app decodes
// them and relays finished sentences back over the socket
// ('transcript_segments'), where they are stored in consultation_transcripts.
//
// Required env (feature is a silent no-op without them):
//   AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET   – Agora console → RESTful API credentials
//   AGORA_APP_ID (or AGORA_STT_APP_ID)          – must be the App ID the apps join with
//   AGORA_APP_CERTIFICATE                       – only if the project has certificates enabled
// Optional: AGORA_STT_LANGUAGES (default "en-IN,hi-IN"), AGORA_STT_MAX_IDLE_SEC (default 60)
// Real-Time STT must also be enabled for the project in the Agora console.

const axios = require('axios');
const db = require('../config/database');

// Must match the App ID /api/agora/token signs for (backend/src/routes/agora.js).
const APP_ID = process.env.AGORA_STT_APP_ID || process.env.AGORA_APP_ID || 'cfc5ddec9cdd48f09a301aba96991a25';
const APP_CERT = process.env.AGORA_APP_CERTIFICATE || '';
const SUB_BOT_UID = '900001'; // listens to the channel audio
const PUB_BOT_UID = '900002'; // publishes the text stream (the apps listen for this uid)
const BASE = `https://api.agora.io/api/speech-to-text/v1/projects/${APP_ID}`;

const enabled = () => !!(process.env.AGORA_CUSTOMER_ID && process.env.AGORA_CUSTOMER_SECRET);

function authHeader() {
  const raw = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
  return { Authorization: `Basic ${Buffer.from(raw).toString('base64')}`, 'Content-Type': 'application/json' };
}

function botToken(channel, uid) {
  if (!APP_CERT) return undefined;
  const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
  const expiry = Math.floor(Date.now() / 1000) + 4 * 3600;
  return RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channel, parseInt(uid), RtcRole.PUBLISHER, expiry);
}

async function start(consultationId) {
  if (!enabled()) return null;
  const languages = (process.env.AGORA_STT_LANGUAGES || 'en-IN,hi-IN').split(',').map(s => s.trim()).filter(Boolean);
  const body = {
    name: `gv-${consultationId}`.slice(0, 64),
    languages,
    maxIdleTime: parseInt(process.env.AGORA_STT_MAX_IDLE_SEC) || 60,
    rtcConfig: {
      channelName: consultationId,
      subBotUid: SUB_BOT_UID,
      pubBotUid: PUB_BOT_UID,
      ...(APP_CERT ? { subBotToken: botToken(consultationId, SUB_BOT_UID), pubBotToken: botToken(consultationId, PUB_BOT_UID) } : {}),
    },
  };
  try {
    const { data } = await axios.post(`${BASE}/join`, body, { headers: authHeader(), timeout: 15000 });
    const agentId = data.agent_id || data.agentId;
    if (agentId) await db.query('UPDATE consultations SET stt_agent_id = $1 WHERE id = $2', [agentId, consultationId]);
    console.log(`[stt] started for consultation ${consultationId} (agent ${agentId})`);
    return agentId;
  } catch (err) {
    console.error('[stt] join failed:', err.response?.status, JSON.stringify(err.response?.data || err.message));
    return null;
  }
}

async function stop(consultationId) {
  if (!enabled()) return;
  const r = await db.query('SELECT stt_agent_id FROM consultations WHERE id = $1', [consultationId]);
  const agentId = r.rows[0]?.stt_agent_id;
  if (!agentId) return;
  try {
    await axios.post(`${BASE}/agents/${agentId}/leave`, {}, { headers: authHeader(), timeout: 15000 });
  } catch (err) {
    // 404 = agent already left on its own (maxIdleTime) — fine
    if (err.response?.status !== 404) console.error('[stt] leave failed:', err.response?.status, err.message);
  }
  await db.query('UPDATE consultations SET stt_agent_id = NULL WHERE id = $1', [consultationId]).catch(() => {});
}

module.exports = { start, stop, enabled, PUB_BOT_UID };
