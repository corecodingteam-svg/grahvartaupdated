/// Client-side mirror of backend/src/utils/contactFilter.js.
///
/// Used to stop a chat message that contains a phone number or email address
/// before it is sent. The server applies the same rule (and records the
/// attempt), so this is only for instant feedback — keep the two in sync.
class ContactFilter {
  static const _digitWords = {
    'zero': '0', 'oh': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  };
  static final _digitWordRe = RegExp(r'\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b', caseSensitive: false);
  static final _emailRe = RegExp(r'[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}', caseSensitive: false);
  static final _obfuscatedEmailRe = RegExp(
    r'[a-z0-9._%+-]{2,}\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+at\s+|@)\s*[a-z0-9-]{2,}\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+|\.)\s*(?:com|in|net|org|co|io|me|info|edu|gov)\b',
    caseSensitive: false,
  );
  static final _mailDomainRe = RegExp(r'\b(gmail|yahoo|hotmail|outlook|rediffmail|icloud|protonmail|ymail|live)\s*(?:\.|dot|\[dot\]|\(dot\))?\s*(com|in|co)?\b', caseSensitive: false);
  static final _mailWordRe = RegExp(r'\b(mail|email|e-mail|id)\b', caseSensitive: false);
  static final _digitRunRe = RegExp(r'\+?\d(?:[\s\-.()/]{0,2}\d){6,}');

  static bool _isContactNumber(String digits, bool hadPlus) {
    var d = digits;
    if (hadPlus && d.length >= 11 && d.length <= 14) return true;
    if (d.length == 12 && d.startsWith('91')) {
      d = d.substring(2);
    } else if (d.length == 11 && d.startsWith('0')) {
      return true;
    }
    return d.length == 10 && RegExp(r'^[6-9]').hasMatch(d);
  }

  /// Returns the kinds of contact info found: any of 'phone', 'email'.
  static List<String> detect(String text) {
    final found = <String>{};
    if (_emailRe.hasMatch(text) || _obfuscatedEmailRe.hasMatch(text)) {
      found.add('email');
    } else if (_mailDomainRe.hasMatch(text) && _mailWordRe.hasMatch(text)) {
      found.add('email');
    }
    final normalized = text.replaceAllMapped(_digitWordRe, (m) => _digitWords[m.group(0)!.toLowerCase()]!);
    for (final m in _digitRunRe.allMatches(normalized)) {
      final raw = m.group(0)!;
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      if (_isContactNumber(digits, raw.trim().startsWith('+'))) { found.add('phone'); break; }
      if (digits.length > 12) {
        final joined = raw.replaceAll(RegExp(r'[\s\-.()/]'), ' ').replaceAllMapped(RegExp(r'(\d) (?=\d)'), (x) => x.group(1)!);
        if (RegExp(r'(?:^|[^0-9])[6-9]\d{9}(?:[^0-9]|$)').hasMatch(joined)) { found.add('phone'); break; }
      }
    }
    return found.toList();
  }

  static String blockedMessage(List<String> detected) {
    final what = detected.contains('email') && detected.contains('phone')
        ? 'phone numbers or email addresses'
        : detected.contains('email') ? 'email addresses' : 'phone numbers';
    return 'Sharing $what is not allowed on Grahvarta. Please keep all communication on the platform.';
  }
}
