// Store-screenshot harness helpers. Not part of the shipped app (lives outside lib/).
//
// The harness runs real app screens against canned sample data: every call made
// through package:http is answered by [MockApi], so nothing reaches the live API.
// Each step prints "@@SHOT <name>" when the screen is ready; the host script
// (store_screenshots/capture.sh) watches for it and grabs the simulator screen.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:http/testing.dart';

typedef Handler = Object Function(http.Request req);

class MockApi {
  final List<(String, RegExp, Handler)> _routes = [];

  void on(String method, String pathPattern, Handler h) =>
      _routes.add((method, RegExp('^$pathPattern\$'), h));

  void get(String p, Object body) => on('GET', p, (_) => body);

  http.Client client() => MockClient((req) async {
        // Only the app's own API is mocked; fonts, images etc. load for real.
        if (!req.url.host.startsWith('api.')) return _real(req);
        final path = req.url.path;
        for (final (method, re, h) in _routes) {
          if ((method == '*' || method == req.method) && re.hasMatch(path)) {
            return _json(h(req));
          }
        }
        debugPrint('@@MISS ${req.method} $path');
        // Writes succeed quietly; unknown reads return an empty list.
        return _json({'success': true, 'data': req.method == 'GET' ? [] : {}});
      });

  static final _io = IOClient();

  static Future<http.Response> _real(http.Request req) async {
    final r = http.Request(req.method, req.url)
      ..headers.addAll(req.headers)
      ..bodyBytes = req.bodyBytes;
    return http.Response.fromStream(await _io.send(r));
  }

  static http.Response _json(Object body) => http.Response(
        jsonEncode(body),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
}

Map<String, dynamic> ok(Object data) => {'success': true, 'data': data};

/// ISO timestamp [minutes] before now, so "time ago" labels read naturally.
String ago(int minutes) =>
    DateTime.now().subtract(Duration(minutes: minutes)).toUtc().toIso8601String();

/// Runs [body] (binding init, runApp, shots) entirely inside the mocked-HTTP zone.
void runMocked(MockApi api, Future<void> Function() body) =>
    http.runWithClient(() => body(), api.client);

Future<void> wait(int ms) => Future.delayed(Duration(milliseconds: ms));

int _pointer = 1000;

/// Taps the [index]th on-screen widget whose text equals [text].
Future<bool> tapText(String text, {int index = 0, bool contains = false}) async {
  final hits = <RenderBox>[];
  void visit(Element e) {
    final ro = e.renderObject;
    if (ro is RenderParagraph && e.widget is RichText) {
      final s = ro.text.toPlainText();
      if ((contains ? s.contains(text) : s == text) && ro.hasSize && ro.attached) {
        hits.add(ro);
      }
    }
    e.visitChildren(visit);
  }

  WidgetsBinding.instance.rootElement?.visitChildren(visit);
  final screen = WidgetsBinding.instance.platformDispatcher.views.first;
  final size = screen.physicalSize / screen.devicePixelRatio;
  final visible = hits.where((b) {
    final c = b.localToGlobal(b.size.center(Offset.zero));
    return c.dx >= 0 && c.dy >= 0 && c.dx <= size.width && c.dy <= size.height;
  }).toList();
  if (visible.length <= index) {
    debugPrint('@@NOTAP "$text" (found ${visible.length})');
    return false;
  }
  final box = visible[index];
  final pos = box.localToGlobal(box.size.center(Offset.zero));
  final id = _pointer++;
  GestureBinding.instance.handlePointerEvent(PointerDownEvent(pointer: id, position: pos));
  await wait(80);
  GestureBinding.instance.handlePointerEvent(PointerUpEvent(pointer: id, position: pos));
  return true;
}

/// Sets the text of the [index]th on-screen text field.
Future<bool> enterText(int index, String text) async {
  final fields = <EditableTextState>[];
  void visit(Element e) {
    if (e is StatefulElement && e.state is EditableTextState) {
      final s = e.state as EditableTextState;
      final c = s.renderEditable.localToGlobal(Offset.zero);
      if (c.dx >= 0 && c.dx < 2000 && c.dy >= 0 && c.dy < 3000) fields.add(s);
    }
    e.visitChildren(visit);
  }

  WidgetsBinding.instance.rootElement?.visitChildren(visit);
  if (fields.length <= index) {
    debugPrint('@@NOFIELD $index (found ${fields.length})');
    return false;
  }
  fields[index].widget.controller.text = text;
  return true;
}

/// Scrolls the scrollable under [at] (logical px) by [dy] with a short drag.
Future<void> drag(Offset at, double dy) async {
  final id = _pointer++;
  final g = GestureBinding.instance;
  g.handlePointerEvent(PointerDownEvent(pointer: id, position: at));
  const steps = 12;
  for (var i = 1; i <= steps; i++) {
    await wait(16);
    g.handlePointerEvent(PointerMoveEvent(
        pointer: id, position: at.translate(0, -dy * i / steps), delta: Offset(0, -dy / steps)));
  }
  await wait(120);
  g.handlePointerEvent(PointerUpEvent(pointer: id, position: at.translate(0, -dy)));
}

class Shot {
  final String name;
  final Future<void> Function() setup;
  final int settleMs;
  final Future<void> Function()? teardown;
  const Shot(this.name, this.setup, {this.settleMs = 2500, this.teardown});
}

/// Runs each shot: set up the screen, let it settle, mark it for capture, hold.
// ignore_for_file: avoid_print
Future<void> runShots(List<Shot> shots, {int startDelayMs = 6000}) async {
  // --dart-define=SHOTS=03_profile,04_chat runs a subset.
  const only = String.fromEnvironment('SHOTS');
  final sw = Stopwatch()..start();
  Timer.periodic(const Duration(seconds: 1), (_) => print('@@HB ${sw.elapsed.inSeconds}'));
  await wait(startDelayMs);
  for (final s in shots) {
    if (only.isNotEmpty && !only.split(',').contains(s.name)) continue;
    print('@@STEP ${s.name}');
    try {
      await s.setup();
      print('@@SETUP_OK ${s.name}');
    } catch (e) {
      print('@@FAIL ${s.name} $e');
    }
    await wait(s.settleMs);
    print('@@SHOT ${s.name}');
    await wait(2200);
    if (s.teardown != null) {
      print('@@TEARDOWN ${s.name}');
      await s.teardown!();
      await wait(700);
    }
  }
  print('@@DONE');
}
