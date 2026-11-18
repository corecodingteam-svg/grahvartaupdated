// Copy of backend/src/utils/contactFilter.js (keep in sync). Runs in the browser
// before a message is encrypted, since the server cannot read encrypted chats.
// Detects attempts to share contact details (email / phone number) in chat.
// Kept deliberately conservative around dates and birth times, which are
// extremely common in astrology conversations ("12-05-1990 10:30").

const DIGIT_WORDS = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
};
const DIGIT_WORD_RE = new RegExp(`\\b(${Object.keys(DIGIT_WORDS).join('|')})\\b`, 'gi');

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// "name at gmail dot com", "name [at] gmail [dot] com", "name(at)gmail.com"
const OBFUSCATED_EMAIL_RE = /[a-z0-9._%+-]{2,}\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+at\s+|@)\s*[a-z0-9-]{2,}\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+|\.)\s*(?:com|in|net|org|co|io|me|info|edu|gov)\b/i;
const MAIL_DOMAIN_RE = /\b(gmail|yahoo|hotmail|outlook|rediffmail|icloud|protonmail|ymail|live)\s*(?:\.|dot|\[dot\]|\(dot\))?\s*(com|in|co)?\b/i;

// Runs of digits allowing up to 2 separator characters between digits
const DIGIT_RUN_RE = /\+?\d(?:[\s\-.()/]{0,2}\d){6,}/g;

function isContactNumber(digits, hadPlus) {
  let d = digits;
  if (hadPlus && d.length >= 11 && d.length <= 14) return true;            // any international number
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);               // 91XXXXXXXXXX
  else if (d.length === 11 && d.startsWith('0')) return true;              // 0 + mobile, or STD landline
  if (d.length === 10 && /^[6-9]/.test(d)) return true;                    // Indian mobile
  return false;
}

/**
 * @returns {{ blocked: boolean, detected: string[] }}
 */
function detectContactInfo(text) {
  if (!text || typeof text !== 'string') return { blocked: false, detected: [] };
  const detected = new Set();

  if (EMAIL_RE.test(text) || OBFUSCATED_EMAIL_RE.test(text)) detected.add('email');
  else if (MAIL_DOMAIN_RE.test(text) && /\b(mail|email|e-mail|id)\b/i.test(text)) detected.add('email');

  // Spelled-out digits -> digits ("nine eight seven ..." -> "9 8 7 ...")
  const normalized = text.replace(DIGIT_WORD_RE, (w) => DIGIT_WORDS[w.toLowerCase()]);
  for (const m of normalized.matchAll(DIGIT_RUN_RE)) {
    const raw = m[0];
    const digits = raw.replace(/\D/g, '');
    if (isContactNumber(digits, raw.trim().startsWith('+'))) { detected.add('phone'); break; }
    // A long run may be two numbers glued by separators — test each 10-digit mobile window
    if (digits.length > 12 && /(?:^|[^0-9])[6-9]\d{9}(?:[^0-9]|$)/.test(raw.replace(/[\s\-.()/]/g, ' ').replace(/(\d) (?=\d)/g, '$1'))) {
      detected.add('phone'); break;
    }
  }

  return { blocked: detected.size > 0, detected: [...detected] };
}

function blockedMessageText(detected) {
  const what = detected.includes('email') && detected.includes('phone')
    ? 'phone numbers or email addresses'
    : detected.includes('email') ? 'email addresses' : 'phone numbers';
  return `Message not sent: sharing ${what} is not allowed on Grahvarta. Please keep all communication on the platform.`;
}

export { detectContactInfo, blockedMessageText };
