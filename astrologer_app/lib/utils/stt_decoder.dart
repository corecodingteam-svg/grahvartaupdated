import 'dart:convert';
import 'dart:typed_data';

/// One finished sentence from Agora Real-Time Speech-to-Text.
class SttSegment {
  final int uid;        // Agora uid of the speaker (1 = astrologer)
  final String text;
  final int? startMs;   // offset reported by Agora, used to de-duplicate
  final String? language;
  SttSegment(this.uid, this.text, this.startMs, this.language);

  Map<String, dynamic> toJson() => {'uid': uid, 'text': text, 'start_ms': startMs, 'language': language};
}

/// Minimal decoder for Agora STT data-stream messages (protobuf `Text` from
/// Agora's SttMessage.proto). Only the fields needed for a transcript are read:
///   Text: 4 uid (int64), 8 starttime (int32), 10 words (repeated Word),
///         11 end_of_segment (bool), 13 data_type (string), 15 culture (string)
///   Word: 1 text (string), 4 isFinal (bool)
/// Returns null for interim (not yet final) results and translations.
class SttDecoder {
  static SttSegment? decode(Uint8List bytes) {
    try {
      final r = _Reader(bytes);
      int uid = 0;
      int? startMs;
      String? dataType;
      String? culture;
      final finalWords = <String>[];
      var sawWord = false;
      while (!r.done) {
        final tag = r.varint();
        final field = tag >> 3, wire = tag & 7;
        switch (field) {
          case 4: uid = r.varint(); break;
          case 8: startMs = r.varint(); break;
          case 13: dataType = utf8.decode(r.bytes(), allowMalformed: true); break;
          case 15: culture = utf8.decode(r.bytes(), allowMalformed: true); break;
          case 10:
            sawWord = true;
            final w = _decodeWord(r.bytes());
            if (w.$2 && w.$1.isNotEmpty) finalWords.add(w.$1);
            break;
          default: r.skip(wire);
        }
      }
      if (dataType != null && dataType.isNotEmpty && dataType != 'transcribe') return null;
      if (!sawWord || finalWords.isEmpty) return null;

      // Join tokens with spaces (English & Hindi are space-delimited), then tidy
      // doubled spaces and spaces before punctuation.
      final text = finalWords
          .join(' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .replaceAllMapped(RegExp(r' ([,.!?।;:])'), (m) => m.group(1)!)
          .trim();
      if (text.isEmpty) return null;
      return SttSegment(uid, text, startMs, culture);
    } catch (_) {
      return null; // not an STT message (or a format we don't understand)
    }
  }

  static (String, bool) _decodeWord(Uint8List bytes) {
    final r = _Reader(bytes);
    var text = '';
    var isFinal = false;
    while (!r.done) {
      final tag = r.varint();
      final field = tag >> 3, wire = tag & 7;
      if (field == 1 && wire == 2) {
        text = utf8.decode(r.bytes(), allowMalformed: true);
      } else if (field == 4 && wire == 0) {
        isFinal = r.varint() != 0;
      } else {
        r.skip(wire);
      }
    }
    return (text, isFinal);
  }
}

class _Reader {
  final Uint8List _b;
  int _i = 0;
  _Reader(this._b);
  bool get done => _i >= _b.length;

  int varint() {
    var result = 0, shift = 0;
    while (true) {
      if (_i >= _b.length) throw const FormatException('truncated varint');
      final byte = _b[_i++];
      if (shift < 63) result |= (byte & 0x7f) << shift;
      if (byte & 0x80 == 0) return result;
      shift += 7;
      if (shift > 70) throw const FormatException('varint too long');
    }
  }

  Uint8List bytes() {
    final len = varint();
    if (len < 0 || _i + len > _b.length) throw const FormatException('bad length');
    final out = Uint8List.sublistView(_b, _i, _i + len);
    _i += len;
    return out;
  }

  void skip(int wire) {
    switch (wire) {
      case 0: varint(); break;
      case 1: _i += 8; break;
      case 2: bytes(); break;
      case 5: _i += 4; break;
      default: throw const FormatException('unsupported wire type');
    }
    if (_i > _b.length) throw const FormatException('truncated');
  }
}
