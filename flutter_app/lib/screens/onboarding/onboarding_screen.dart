import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_theme.dart';
import '../auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingData {
  final String icon;
  final String title;
  final String subtitle;
  final List<String> symbols;
  final List<String> pills;

  const _OnboardingData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.symbols,
    required this.pills,
  });
}

const _pages = [
  _OnboardingData(
    icon: '🔮',
    title: 'Discover Your\nCosmic Path',
    subtitle: 'Get personalized horoscopes, birth chart readings, and daily predictions tailored to your unique celestial blueprint.',
    symbols: ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'],
    pills: ['Daily Horoscope', 'Birth Chart', 'Compatibility'],
  ),
  _OnboardingData(
    icon: '🌟',
    title: 'Talk to Expert\nAstrologers',
    subtitle: 'Connect instantly with 500+ verified astrologers via live chat, voice, or video call. First 3 minutes free!',
    symbols: ['✨', '⭐', '🌙', '☀️', '💫', '🪐', '🌟', '⚡', '🔥', '💎', '🌈', '✦'],
    pills: ['500+ Astrologers', 'Live Chat', 'Voice & Video'],
  ),
  _OnboardingData(
    icon: '💫',
    title: 'Live, Learn &\nGrow Together',
    subtitle: 'Join live astrology sessions, explore cosmic events, and become part of a thriving spiritual community.',
    symbols: ['🌕', '🌗', '🌑', '🌓', '☿', '♀', '♂', '♃', '♄', '⛎', '☽', '☿'],
    pills: ['Live Sessions', 'Community', 'Cosmic Events'],
  ),
];

// Every page reserves the same space for each block, so the icon, title and
// pills sit at identical positions on every page no matter how many lines the
// text wraps to — nothing jumps while swiping.
const double _iconBox = 168;
const double _titleSize = 30;
const double _titleLineHeight = 1.2;
const int _titleLines = 2;
const double _subtitleSize = 15;
const double _subtitleLineHeight = 1.6;
const int _subtitleLines = 4;
const double _pillsBox = 76; // room for two rows of pills

class _OnboardingScreenState extends State<OnboardingScreen> with TickerProviderStateMixin {
  final _pageController = PageController();
  late final AnimationController _bgAnimController;
  late final AnimationController _introController; // one-time entrance fade only
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _bgAnimController = AnimationController(vsync: this, duration: const Duration(seconds: 20))..repeat();
    _introController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _bgAnimController.dispose();
    _introController.dispose();
    super.dispose();
  }

  /// Live, fractional page position (0.0 … pages-1) — drives every transition.
  double get _page {
    if (_pageController.hasClients && _pageController.position.hasContentDimensions) {
      return (_pageController.page ?? _currentPage.toDouble()).clamp(0.0, (_pages.length - 1).toDouble());
    }
    return _currentPage.toDouble();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(duration: const Duration(milliseconds: 450), curve: Curves.easeInOutCubic);
    } else {
      _finish();
    }
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  static const _darkGradients = [
    [Color(0xFF2D1B00), Color(0xFF0D0D0D)],
    [Color(0xFF0D1A2D), Color(0xFF0D0D0D)],
    [Color(0xFF1A0D2D), Color(0xFF0D0D0D)],
  ];
  static const _lightGradients = [
    [Color(0xFFE8F4FF), Color(0xFFFFFFFF)],
    [Color(0xFFE0EEFF), Color(0xFFFFFFFF)],
    [Color(0xFFEEE8FF), Color(0xFFFFFFFF)],
  ];

  Color _accentForPage(int index, BuildContext context) =>
      index == 0 ? context.clr.accent : context.clr.accentAlt;

  /// Blend a per-page value for a fractional page position.
  T _lerpByPage<T>(double page, T Function(int i) of, T Function(T a, T b, double t) lerp) {
    final i = page.floor().clamp(0, _pages.length - 1);
    final j = (i + 1).clamp(0, _pages.length - 1);
    return lerp(of(i), of(j), page - i);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gradients = isDark ? _darkGradients : _lightGradients;

    return Scaffold(
      backgroundColor: context.clr.bg,
      body: AnimatedBuilder(
        animation: _pageController,
        builder: (context, _) {
          final page = _page;
          final top = _lerpByPage<Color>(page, (i) => gradients[i % gradients.length][0], (a, b, t) => Color.lerp(a, b, t)!);
          final bottom = _lerpByPage<Color>(page, (i) => gradients[i % gradients.length][1], (a, b, t) => Color.lerp(a, b, t)!);
          final accent = _lerpByPage<Color>(page, (i) => _accentForPage(i, context), (a, b, t) => Color.lerp(a, b, t)!);

          return DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [top, bottom]),
            ),
            child: SafeArea(
              child: Stack(
                children: [
                  RepaintBoundary(
                    child: _BackgroundSymbols(page: page, rotation: _bgAnimController, accentColor: accent),
                  ),
                  FadeTransition(
                    opacity: CurvedAnimation(parent: _introController, curve: Curves.easeOut),
                    child: Column(
                      children: [
                        Align(
                          alignment: Alignment.topRight,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: TextButton(
                              onPressed: _finish,
                              child: Text('Skip', style: TextStyle(color: context.clr.txtMuted, fontSize: 14)),
                            ),
                          ),
                        ),
                        Expanded(
                          child: PageView.builder(
                            controller: _pageController,
                            physics: const BouncingScrollPhysics(),
                            onPageChanged: (i) => setState(() => _currentPage = i),
                            itemCount: _pages.length,
                            itemBuilder: (ctx, i) => _OnboardingPage(
                              data: _pages[i],
                              accentColor: _accentForPage(i, ctx),
                              // -1 … 0 … 1 : how far this page is from the centre
                              offset: (page - i).clamp(-1.0, 1.0),
                            ),
                          ),
                        ),
                        _BottomControls(
                          page: page,
                          currentPage: _currentPage,
                          total: _pages.length,
                          accentColor: accent,
                          onNext: _nextPage,
                          onSkip: _finish,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _BackgroundSymbols extends StatelessWidget {
  final double page;
  final Animation<double> rotation;
  final Color accentColor;

  const _BackgroundSymbols({required this.page, required this.rotation, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final symbolColor = isDark ? accentColor : Color.lerp(accentColor, const Color(0xFF042B59), 0.4)!;
    final i = page.floor().clamp(0, _pages.length - 1);
    final j = (i + 1).clamp(0, _pages.length - 1);
    return AnimatedBuilder(
      animation: rotation,
      builder: (_, __) => CustomPaint(
        size: MediaQuery.of(context).size,
        painter: _SymbolsPainter(
          from: _pages[i].symbols,
          to: _pages[j].symbols,
          blend: page - i,
          rotation: rotation.value * 2 * pi,
          color: symbolColor,
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  final _OnboardingData data;
  final Color accentColor;
  final double offset;

  const _OnboardingPage({required this.data, required this.accentColor, required this.offset});

  @override
  Widget build(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final titleHeight = scaler.scale(_titleSize) * _titleLineHeight * _titleLines;
    final subtitleHeight = scaler.scale(_subtitleSize) * _subtitleLineHeight * _subtitleLines;
    final distance = offset.abs();
    final opacity = (1 - distance * 1.4).clamp(0.0, 1.0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        // Gentle parallax: the icon trails the swipe, the text leads it slightly.
        final content = SizedBox(
          width: width,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Transform.translate(
                  offset: Offset(offset * width * 0.35, 0),
                  child: Transform.scale(
                    scale: 1 - distance * 0.15,
                    child: SizedBox(height: _iconBox, child: Center(child: _IconWidget(accentColor: accentColor, icon: data.icon))),
                  ),
                ),
                const SizedBox(height: 40),
                Transform.translate(
                  offset: Offset(offset * width * -0.08, 0),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    SizedBox(
                      height: titleHeight,
                      child: Center(
                        child: Text(
                          data.title,
                          textAlign: TextAlign.center,
                          maxLines: _titleLines,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: context.clr.txtPrimary,
                            fontSize: _titleSize,
                            fontWeight: FontWeight.w800,
                            height: _titleLineHeight,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: subtitleHeight,
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: Text(
                          data.subtitle,
                          textAlign: TextAlign.center,
                          maxLines: _subtitleLines,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: context.clr.txtSecondary, fontSize: _subtitleSize, height: _subtitleLineHeight),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      height: _pillsBox,
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: data.pills.map((p) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: accentColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: accentColor.withValues(alpha: 0.3)),
                            ),
                            child: Text(p, style: TextStyle(color: accentColor, fontSize: 12, fontWeight: FontWeight.w600)),
                          )).toList(),
                        ),
                      ),
                    ),
                  ]),
                ),
              ],
            ),
          ),
        );

        return Opacity(
          opacity: opacity,
          // Shrinks (never grows) the identical block on very short screens
          child: Center(child: FittedBox(fit: BoxFit.scaleDown, child: content)),
        );
      },
    );
  }
}

class _IconWidget extends StatelessWidget {
  final Color accentColor;
  final String icon;
  const _IconWidget({required this.accentColor, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 168,
          height: 168,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: accentColor.withValues(alpha: 0.12), width: 1),
          ),
        ),
        Container(
          width: 132,
          height: 132,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: accentColor.withValues(alpha: 0.22), width: 1),
          ),
        ),
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: accentColor.withValues(alpha: 0.12),
            border: Border.all(color: accentColor.withValues(alpha: 0.4), width: 1.5),
            boxShadow: [BoxShadow(color: accentColor.withValues(alpha: 0.25), blurRadius: 32, spreadRadius: 4)],
          ),
          child: Center(child: Text(icon, style: const TextStyle(fontSize: 44))),
        ),
      ],
    );
  }
}

class _BottomControls extends StatelessWidget {
  final double page;
  final int currentPage;
  final int total;
  final Color accentColor;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const _BottomControls({
    required this.page,
    required this.currentPage,
    required this.total,
    required this.accentColor,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    final isLast = currentPage == total - 1;
    final inactive = context.clr.txtMuted.withValues(alpha: 0.35);
    // fades the "Sign in" hint out as the last page arrives instead of popping
    final hintOpacity = (total - 1 - page).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(total, (i) {
              // dot width/colour follow the finger, not the settled page
              final t = (1 - (page - i).abs()).clamp(0.0, 1.0);
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: 8 + 16 * t,
                height: 8,
                decoration: BoxDecoration(
                  color: Color.lerp(inactive, accentColor, t),
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            }),
          ),
          const SizedBox(height: 28),
          GestureDetector(
            onTap: onNext,
            child: Container(
              width: double.infinity,
              height: 56,
              decoration: BoxDecoration(
                color: accentColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: accentColor.withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Center(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: Text(
                    isLast ? 'Get Started  →' : 'Continue  →',
                    key: ValueKey(isLast),
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.3),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Always reserve the hint's space so the button never shifts
          SizedBox(
            height: 18,
            child: Opacity(
              opacity: hintOpacity,
              child: IgnorePointer(
                ignoring: isLast,
                child: GestureDetector(
                  onTap: onSkip,
                  child: Text(
                    'Already have an account? Sign in',
                    style: TextStyle(color: context.clr.txtMuted, fontSize: 13),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SymbolsPainter extends CustomPainter {
  final List<String> from;
  final List<String> to;
  final double blend; // 0 = only `from`, 1 = only `to`
  final double rotation;
  final Color color;

  _SymbolsPainter({required this.from, required this.to, required this.blend, required this.rotation, required this.color});

  void _paintSet(Canvas canvas, Size size, List<String> symbols, double alpha) {
    if (alpha <= 0.01) return;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    for (int i = 0; i < symbols.length; i++) {
      final angle = rotation + (i * 2 * pi / symbols.length);
      final x = size.width / 2 + cos(angle) * size.width * 0.42;
      final y = size.height / 2 + sin(angle) * size.height * 0.38;
      final opacity = (0.15 + (i % 4) * 0.06) * alpha;
      final fontSize = 12.0 + (i % 3) * 5;
      textPainter.text = TextSpan(text: symbols[i], style: TextStyle(fontSize: fontSize, color: color.withValues(alpha: opacity)));
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - textPainter.width / 2, y - textPainter.height / 2));
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (identical(from, to)) {
      _paintSet(canvas, size, from, 1);
    } else {
      _paintSet(canvas, size, from, 1 - blend);
      _paintSet(canvas, size, to, blend);
    }
  }

  @override
  bool shouldRepaint(_SymbolsPainter old) =>
      old.rotation != rotation || old.color != color || old.blend != blend || !identical(old.from, from) || !identical(old.to, to);
}
