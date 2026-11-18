// End-to-end encrypted chat.
//
// Each account has one X25519 key pair. Messages are sealed with NaCl box
// (X25519 + XSalsa20-Poly1305) between the sender's and the receiver's keys,
// so only those two people can open them — not the server, not admins.
// The private key is backed up on the server locked with a key derived from
// the owner's chat PIN (Argon2id), so the same account can read its chats on
// a new phone or on the website after entering the PIN.
//
// The format matches the website (tweetnacl + hash-wasm) byte for byte.
import 'dart:convert';
import 'dart:isolate';
import 'dart:math';

import 'package:cryptography/cryptography.dart' as cg;
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:pinenacl/x25519.dart';

import 'api_service.dart';

enum ChatKeyStatus { ready, needsSetup, locked }

class ChatKeyException implements Exception {
  final String message;
  ChatKeyException(this.message);
  @override
  String toString() => message;
}

class ChatCrypto {
  ChatCrypto._();
  static final ChatCrypto instance = ChatCrypto._();

  static const _storage = FlutterSecureStorage();
  static const _localKey = 'chat_e2e_key';
  static const kdfParams = {'alg': 'argon2id', 'm': 65536, 't': 3, 'p': 1};

  /// API base URL; only changed by tests.
  @visibleForTesting
  static String apiBase = ApiService.baseUrl;

  PrivateKey? _priv;
  String? _pub;
  final Map<String, Box> _boxes = {};

  String? get publicKey => _pub;
  bool get isReady => _priv != null;

  // ── Helpers ────────────────────────────────────────────────────────────
  static final _rng = Random.secure();
  static Uint8List _random(int n) => Uint8List.fromList(List.generate(n, (_) => _rng.nextInt(256)));
  static String _b64(List<int> b) => base64.encode(b);
  static Uint8List _unb64(String s) => Uint8List.fromList(base64.decode(s));

  static Future<Map<String, String>> _authHeaders() async {
    final t = await ApiService.getToken();
    return {'Content-Type': 'application/json', if (t != null) 'Authorization': 'Bearer $t'};
  }

  static Future<Uint8List> _deriveKey(String pin, Uint8List salt, Map kdf) {
    final m = kdf['m'] as int, t = kdf['t'] as int, p = kdf['p'] as int;
    // Argon2id is deliberately slow; keep it off the UI thread
    return Isolate.run(() async {
      final a = cg.Argon2id(memory: m, iterations: t, parallelism: p, hashLength: 32);
      final k = await a.deriveKey(secretKey: cg.SecretKey(utf8.encode(pin)), nonce: salt);
      return Uint8List.fromList(await k.extractBytes());
    });
  }

  Future<Map<String, dynamic>?> _fetchBackup() async {
    final r = await http.get(Uri.parse('$apiBase/chat-keys/me'), headers: await _authHeaders());
    if (r.statusCode != 200) throw ChatKeyException('Could not reach the server (${r.statusCode})');
    return (jsonDecode(r.body) as Map<String, dynamic>)['key'] as Map<String, dynamic>?;
  }

  void _use(PrivateKey priv) {
    _priv = priv;
    _pub = _b64(priv.publicKey.asTypedList);
    _boxes.clear();
  }

  // ── Key lifecycle ──────────────────────────────────────────────────────

  /// Loads the key saved on this device if it still matches the account's key.
  Future<ChatKeyStatus> status() async {
    final backup = await _fetchBackup();
    if (backup == null) {
      await _forgetLocal();
      return ChatKeyStatus.needsSetup;
    }
    if (_priv != null && _pub == backup['public_key']) return ChatKeyStatus.ready;
    final saved = await _storage.read(key: _localKey);
    if (saved != null) {
      try {
        final m = jsonDecode(saved) as Map<String, dynamic>;
        if (m['pub'] == backup['public_key']) {
          _use(PrivateKey(_unb64(m['priv'] as String)));
          return ChatKeyStatus.ready;
        }
      } catch (_) {}
    }
    await _forgetLocal();
    return ChatKeyStatus.locked;
  }

  Future<void> _saveLocal(PrivateKey priv) async {
    _use(priv);
    await _storage.write(key: _localKey, value: jsonEncode({'pub': _pub, 'priv': _b64(priv.asTypedList)}));
  }

  Future<void> _forgetLocal() async {
    _priv = null;
    _pub = null;
    _boxes.clear();
    await _storage.delete(key: _localKey);
  }

  /// Clears the key from this device (on logout). The encrypted backup stays on the server.
  Future<void> clear() => _forgetLocal();

  Future<void> _upload(PrivateKey priv, String pin, {required bool reset}) async {
    final salt = _random(16);
    final nonce = _random(24);
    final wrapKey = await _deriveKey(pin, salt, kdfParams);
    final enc = SecretBox(wrapKey).encrypt(priv.asTypedList, nonce: nonce).cipherText.asTypedList;
    final r = await http.put(
      Uri.parse('$apiBase/chat-keys/me'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'public_key': _b64(priv.publicKey.asTypedList),
        'enc_private_key': _b64(enc),
        'salt': _b64(salt),
        'nonce': _b64(nonce),
        'kdf': kdfParams,
        'reset': reset,
      }),
    );
    if (r.statusCode == 409) throw ChatKeyException('A chat PIN is already set for this account. Enter it to unlock.');
    if (r.statusCode != 200) throw ChatKeyException('Could not save your chat key (${r.statusCode})');
    await _saveLocal(priv);
  }

  /// First-time setup: creates the key pair and backs it up locked with [pin].
  Future<void> setup(String pin) => _upload(PrivateKey.generate(), pin, reset: false);

  /// Forgot PIN: creates a new key pair. Messages sealed to the old key can no longer be opened.
  Future<void> reset(String pin) => _upload(PrivateKey.generate(), pin, reset: true);

  /// Unlocks the server backup with [pin]. Returns false when the PIN is wrong.
  Future<bool> unlock(String pin) async {
    final backup = await _fetchBackup();
    if (backup == null) throw ChatKeyException('No chat key found. Set a chat PIN first.');
    final wrapKey = await _deriveKey(pin, _unb64(backup['salt'] as String), Map<String, dynamic>.from(backup['kdf'] as Map));
    try {
      final raw = SecretBox(wrapKey).decrypt(
        EncryptedMessage(nonce: _unb64(backup['nonce'] as String), cipherText: _unb64(backup['enc_private_key'] as String)),
      );
      final priv = PrivateKey(Uint8List.fromList(raw));
      if (_b64(priv.publicKey.asTypedList) != backup['public_key']) return false;
      await _saveLocal(priv);
      return true;
    } catch (_) {
      return false; // MAC check failed: wrong PIN
    }
  }

  /// Fetches both parties' current public keys for a consultation.
  /// Returns the peer's key, or null if they have not set up encrypted chat.
  Future<String?> peerKey(String consultationId) async {
    final r = await http.get(Uri.parse('$apiBase/chat-keys/consultation/$consultationId'), headers: await _authHeaders());
    if (r.statusCode != 200) return null;
    return (jsonDecode(r.body) as Map<String, dynamic>)['peer_key'] as String?;
  }

  // ── Messages ───────────────────────────────────────────────────────────

  Box _boxFor(String otherPub) =>
      _boxes.putIfAbsent(otherPub, () => Box(myPrivateKey: _priv!, theirPublicKey: PublicKey(_unb64(otherPub))));

  /// Seals [payload] for [peerPub]. Returns the envelope string sent to the server.
  String seal(Map<String, dynamic> payload, String peerPub) {
    if (_priv == null) throw ChatKeyException('Chat is locked');
    final nonce = _random(24);
    final ct = _boxFor(peerPub).encrypt(Uint8List.fromList(utf8.encode(jsonEncode(payload))), nonce: nonce);
    return jsonEncode({'v': 1, 's': _pub, 'r': peerPub, 'n': _b64(nonce), 'c': _b64(ct.cipherText.asTypedList)});
  }

  /// Opens an envelope. Returns null if it was not sealed to this account's current key.
  Map<String, dynamic>? open(String envelope) {
    if (_priv == null) return null;
    try {
      final env = jsonDecode(envelope) as Map<String, dynamic>;
      if (env['v'] != 1) return null;
      final other = env['s'] == _pub ? env['r'] as String : env['r'] == _pub ? env['s'] as String : null;
      if (other == null) return null;
      final plain = _boxFor(other).decrypt(
        EncryptedMessage(nonce: _unb64(env['n'] as String), cipherText: _unb64(env['c'] as String)),
      );
      return jsonDecode(utf8.decode(plain)) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Text to show for a stored message: decrypted text, a photo label, or a lock notice.
  static bool isEnvelope(String? content) => content != null && content.startsWith('{"v":1,');

  String previewOf(String? content, [String? type]) {
    if (content == null) return '';
    if (type != 'e2e' && !isEnvelope(content)) return content;
    final p = open(content);
    if (p == null) return '🔒 Encrypted message';
    return p['t'] == 'image' ? '📷 Photo' : (p['b'] as String? ?? '');
  }

  // ── Images ─────────────────────────────────────────────────────────────

  /// Encrypts image bytes with a fresh random key and uploads the ciphertext.
  /// Returns the payload to seal inside the message.
  Future<Map<String, dynamic>> uploadEncryptedImage(Uint8List bytes, String mime) async {
    final key = _random(32);
    final nonce = _random(24);
    final ct = SecretBox(key).encrypt(bytes, nonce: nonce).cipherText.asTypedList;
    final token = await ApiService.getToken();
    final req = http.MultipartRequest('POST', Uri.parse('$apiBase/consultations/upload-encrypted'));
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    req.files.add(http.MultipartFile.fromBytes('file', ct, filename: 'image.bin'));
    final r = await http.Response.fromStream(await req.send());
    if (r.statusCode != 200) throw ChatKeyException('Image upload failed (${r.statusCode})');
    final url = ((jsonDecode(r.body) as Map<String, dynamic>)['data'] as Map<String, dynamic>)['url'] as String;
    return {'t': 'image', 'u': url, 'k': _b64(key), 'n': _b64(nonce), 'm': mime};
  }

  static final Map<String, Uint8List> _imageCache = {};

  /// Makes an encrypted message row readable: message_type/type become 'text'
  /// or 'e2e_image' and message/content become the text or the image payload JSON.
  /// Rows that are not encrypted are returned unchanged.
  Map<String, dynamic> decodeRow(Map row) {
    final m = Map<String, dynamic>.from(row);
    final type = m['message_type'] ?? m['type'];
    if (type != 'e2e') return m;
    final p = open((m['message'] ?? m['content'] ?? '') as String);
    String text;
    String newType;
    if (p == null) {
      newType = 'text';
      text = '🔒 This message can\'t be shown on this device';
    } else if (p['t'] == 'image') {
      newType = 'e2e_image';
      text = jsonEncode(p);
    } else {
      newType = 'text';
      text = (p['b'] as String?) ?? '';
    }
    m['message_type'] = newType;
    m['type'] = newType;
    m['message'] = text;
    m['content'] = text;
    return m;
  }

  List<dynamic> decryptRows(List<dynamic> rows) => rows.map((r) => decodeRow(r as Map)).toList();

  /// Downloads and decrypts an encrypted image payload.
  static Future<Uint8List> loadImage(Map<String, dynamic> payload) async {
    final url = payload['u'] as String;
    final cached = _imageCache[url];
    if (cached != null) return cached;
    final r = await http.get(Uri.parse(url));
    if (r.statusCode != 200) throw ChatKeyException('Image not available');
    final plain = SecretBox(_unb64(payload['k'] as String)).decrypt(
      EncryptedMessage(nonce: _unb64(payload['n'] as String), cipherText: r.bodyBytes),
    );
    return _imageCache[url] = Uint8List.fromList(plain);
  }
}
