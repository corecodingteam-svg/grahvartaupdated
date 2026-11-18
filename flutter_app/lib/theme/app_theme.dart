import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Dark theme colors
class AppColors {
  static const Color background = Color(0xFF0D0D0D);
  static const Color surface = Color(0xFF1A1A1A);
  static const Color surfaceLight = Color(0xFF222222);
  static const Color card = Color(0xFF1E1E1E);
  static const Color orange = Color(0xFFE8762A);
  static const Color orangeLight = Color(0xFFF08C3E);
  static const Color orangeDark = Color(0xFFB85C1A);
  static const Color gold = Color(0xFFD4A843);
  static const Color white = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFAAAAAA);
  static const Color textMuted = Color(0xFF666666);
  static const Color border = Color(0xFF2A2A2A);
  static const Color divider = Color(0xFF1F1F1F);
  static const Color error = Color(0xFFE53935);
  static const Color success = Color(0xFF43A047);
}

// Light theme palette — taken from the GrahVarta website's light theme
// (grahvarta-web/src/index.css + tailwind.config.js): warm whites and creams,
// warm-brown text, saffron brand colour.
class LightColors {
  static const Color background = Color(0xFFFFFDF7);   // page (website body gradient #FFFFFF → #FFFCEA)
  static const Color surface = Color(0xFFFFFFFF);      // app bars, sheets, nav bar
  static const Color surfaceLight = Color(0xFFFFFBED); // inputs, chips, subtle fills (website surface-light)
  static const Color card = Color(0xFFFFFFFF);         // cards on the cream page
  static const Color saffron = Color(0xFFD9661C);      // buttons, switches, active states, charts
                                                       // (brand #E8762A deepened just enough for white text ≥ 3:1)
  static const Color saffronDeep = Color(0xFFB85C1A);  // accent text & links (website orange-dark, 4.6:1 on white)
  static const Color brandOrange = Color(0xFFE8762A);  // website brand orange, for decorative use
  static const Color saffronSoft = Color(0xFFFAEDE4);  // solid fill for secondary buttons (saffronDeep text 4:1)
  static const Color gold = Color(0xFFD4A843);
  static const Color maroon = Color(0xFF6B2A0E);       // deep brand maroon (logo ring)
  static const Color white = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF211810);  // website text-primary
  static const Color textSecondary = Color(0xFF5C4430);// website text-secondary
  static const Color textMuted = Color(0xFF786C62);    // website text-muted
  static const Color border = Color(0xFFEFE4C6);       // website border #F6F0DA, slightly stronger so cards read on cream
  static const Color divider = Color(0xFFF4ECD5);
  static const Color error = Color(0xFFE53935);        // website error
  static const Color success = Color(0xFF2BA05A);      // website success
}

/// Context extension — use `context.clr.bg`, `context.clr.txtPrimary`, etc.
extension ThemeColors on BuildContext {
  AppColorSet get clr => Theme.of(this).brightness == Brightness.dark ? const AppColorSet._dark() : const AppColorSet._light();
}

class AppColorSet {
  final bool _dark;
  const AppColorSet._dark() : _dark = true;
  const AppColorSet._light() : _dark = false;

  Color get bg          => _dark ? AppColors.background   : LightColors.background;
  Color get surface     => _dark ? AppColors.surface      : LightColors.surface;
  Color get surfaceLight=> _dark ? AppColors.surfaceLight : LightColors.surfaceLight;
  Color get card        => _dark ? AppColors.card         : LightColors.card;
  Color get txtPrimary  => _dark ? AppColors.textPrimary  : LightColors.textPrimary;
  Color get txtSecondary=> _dark ? AppColors.textSecondary: LightColors.textSecondary;
  Color get txtMuted    => _dark ? AppColors.textMuted    : LightColors.textMuted;
  Color get border      => _dark ? AppColors.border       : LightColors.border;
  Color get divider     => _dark ? AppColors.divider      : LightColors.divider;
  Color get accent      => _dark ? AppColors.orange       : LightColors.saffron;
  Color get accentAlt   => _dark ? AppColors.gold         : LightColors.saffronDeep;
  Color get error       => _dark ? AppColors.error        : LightColors.error;
  Color get success     => _dark ? AppColors.success      : LightColors.success;
  Color get navy        => _dark ? AppColors.orange       : LightColors.maroon;
  // Text/icons on app bars: white on the dark bar, warm dark text on the white light bar
  Color get onAppBar    => _dark ? AppColors.textPrimary  : LightColors.textPrimary;
  // Tabs sitting in an app bar
  Color get tabSelected   => _dark ? AppColors.textPrimary : LightColors.saffronDeep;
  Color get tabUnselected => _dark ? const Color(0xA6FFFFFF) : LightColors.textMuted;

  // Full-page backdrop for auth screens: soft glow in dark, solid cream in light
  List<Color> get pageGlow => _dark ? const [AppColors.surface, AppColors.background] : const [LightColors.background, LightColors.background];

  // Text/icons drawn on a solid accent, error, success or other coloured fill
  Color get onAccent    => Colors.white;
  // Text on the secondary accent (gold in dark, deep saffron in light)
  Color get onAccentAlt => _dark ? Colors.black : Colors.white;
  // Drop shadows under bars and floating elements
  Color get shadow      => _dark ? const Color(0x4D000000) : const Color(0x1A6B2A0E);
  // Drag handles on bottom sheets
  Color get handle      => _dark ? AppColors.border : LightColors.border;
  // Lighter warning / low-score text
  Color get warning     => _dark ? const Color(0xFFFF5252) : LightColors.error;

  // Full-screen media (video call, live stream, photo viewer) is always dark in both themes
  Color get mediaBg     => Colors.black;
  Color get onMedia     => Colors.white;
  Color get onMediaMuted=> Colors.white70;
  Color get mediaScrim  => Colors.black;   // use with alpha for overlays on media
  List<Color> get mediaGlow => const [Color(0xFF4A1800), Color(0xFF1A0800), Color(0xFF000000)];
  List<Color> get liveCardActive => const [Color(0xFF3A0D00), Color(0xFF1A0500)];
  List<Color> get liveCardIdle   => const [Color(0xFF1A1500), Color(0xFF0D0D0D)];
  // Chat wallpaper: constellation backdrop, specks/lines and soft glow orbs
  List<Color> get chatBackdrop => _dark
      ? const [Color(0xFF0D0D0D), Color(0xFF1A0A00), Color(0xFF0D0D0D)]
      : const [LightColors.background, LightColors.surfaceLight, LightColors.background];
  Color get chatSpeck   => _dark ? Colors.white : LightColors.maroon;
  Color get chatGlow    => _dark ? AppColors.orange : LightColors.brandOrange;
  Color get chatGlowAlt => _dark ? const Color(0xFFFFD700) : LightColors.gold;

  // Consultation channels
  Color get voice       => _dark ? const Color(0xFF4CAF50) : LightColors.success;
  Color get video       => _dark ? const Color(0xFF2196F3) : const Color(0xFF1E6FD9);
  // Decorative semantic colours
  Color get love        => _dark ? const Color(0xFFE91E63) : const Color(0xFFD81B60);
  Color get mystic      => _dark ? const Color(0xFF9C27B0) : const Color(0xFF8E24AA);

  // Specialty tags on astrologer cards — warm brand-family palette
  List<Color> get tagPalette => _dark
      ? const [AppColors.orange, AppColors.gold, Color(0xFFF25D50), Color(0xFF9C27B0), Color(0xFF26A69A), Color(0xFF5C8DF6)]
      : const [LightColors.saffron, LightColors.maroon, Color(0xFFC0392B), Color(0xFF8E24AA), Color(0xFF00897B), Color(0xFF3F6FD8)];
  Color specialty(String name) {
    const order = ['Vedic', 'KP System', 'Numerology', 'Tarot', 'Palmistry', 'Western', 'Vastu', 'Face Reading'];
    final i = order.indexOf(name);
    final p = tagPalette;
    return p[(i < 0 ? name.hashCode.abs() : i) % p.length];
  }

  // Planet colours used on the Listen screen
  Color planet(String name) => switch (name) {
        'Moon'    => const Color(0xFF8B9DC3),
        'Jupiter' => const Color(0xFFB87333),
        'Mars'    => const Color(0xFFCD5C5C),
        _         => accent,
      };

  // Onboarding page backgrounds: deep tinted gradients in dark, solid cream in light
  List<List<Color>> get onboardingBackgrounds => _dark
      ? const [
          [Color(0xFF2D1B00), Color(0xFF0D0D0D)],
          [Color(0xFF0D1A2D), Color(0xFF0D0D0D)],
          [Color(0xFF1A0D2D), Color(0xFF0D0D0D)],
        ]
      : const [
          [LightColors.background, LightColors.background],
          [LightColors.background, LightColors.background],
          [LightColors.background, LightColors.background],
        ];
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.orange,
        secondary: AppColors.gold,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: AppColors.white,
        onSecondary: AppColors.white,
        onSurface: AppColors.textPrimary,
      ),
      textTheme: GoogleFonts.interTextTheme(
        const TextTheme(
          displayLarge: TextStyle(color: AppColors.textPrimary, fontSize: 32, fontWeight: FontWeight.bold),
          displayMedium: TextStyle(color: AppColors.textPrimary, fontSize: 28, fontWeight: FontWeight.bold),
          displaySmall: TextStyle(color: AppColors.textPrimary, fontSize: 24, fontWeight: FontWeight.w600),
          headlineLarge: TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w600),
          headlineMedium: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w600),
          headlineSmall: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600),
          titleLarge: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
          titleMedium: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
          bodyLarge: TextStyle(color: AppColors.textSecondary, fontSize: 16),
          bodyMedium: TextStyle(color: AppColors.textSecondary, fontSize: 14),
          bodySmall: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        color: AppColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.orange,
          foregroundColor: AppColors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.orange,
          side: const BorderSide(color: AppColors.orange),
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.orange, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        hintStyle: const TextStyle(color: AppColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.divider),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.orange,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: LightColors.background,
      colorScheme: const ColorScheme.light(
        primary: LightColors.saffron,
        secondary: LightColors.saffronDeep,
        surface: LightColors.surface,
        error: LightColors.error,
        onPrimary: LightColors.white,
        onSecondary: LightColors.white,
        onSurface: LightColors.textPrimary,
      ),
      textTheme: GoogleFonts.interTextTheme(
        const TextTheme(
          displayLarge: TextStyle(color: LightColors.textPrimary, fontSize: 32, fontWeight: FontWeight.bold),
          displayMedium: TextStyle(color: LightColors.textPrimary, fontSize: 28, fontWeight: FontWeight.bold),
          displaySmall: TextStyle(color: LightColors.textPrimary, fontSize: 24, fontWeight: FontWeight.w600),
          headlineLarge: TextStyle(color: LightColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w600),
          headlineMedium: TextStyle(color: LightColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w600),
          headlineSmall: TextStyle(color: LightColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600),
          titleLarge: TextStyle(color: LightColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
          titleMedium: TextStyle(color: LightColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
          bodyLarge: TextStyle(color: LightColors.textSecondary, fontSize: 16),
          bodyMedium: TextStyle(color: LightColors.textSecondary, fontSize: 14),
          bodySmall: TextStyle(color: LightColors.textMuted, fontSize: 12),
        ),
      ),
      // Light header like the website: white bar, dark warm text, no tint on scroll
      appBarTheme: const AppBarTheme(
        backgroundColor: LightColors.surface,
        foregroundColor: LightColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        shadowColor: LightColors.border,
        centerTitle: true,
        iconTheme: IconThemeData(color: LightColors.textPrimary),
        titleTextStyle: TextStyle(
          color: LightColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        color: LightColors.card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: LightColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: LightColors.saffron,
          foregroundColor: LightColors.white,
          disabledBackgroundColor: LightColors.border,
          disabledForegroundColor: LightColors.textMuted,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      // Solid buttons only: secondary actions get a solid soft-saffron fill, no outline
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: LightColors.saffronDeep,
          backgroundColor: LightColors.saffronSoft,
          side: BorderSide.none,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: LightColors.surfaceLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: LightColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: LightColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: LightColors.saffron, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: LightColors.error),
        ),
        labelStyle: const TextStyle(color: LightColors.textSecondary),
        hintStyle: const TextStyle(color: LightColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      dividerTheme: const DividerThemeData(color: LightColors.divider),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: LightColors.saffronDeep, textStyle: const TextStyle(fontWeight: FontWeight.w600)),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: LightColors.saffron, foregroundColor: LightColors.white,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.all(LightColors.white),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? LightColors.saffron : LightColors.textMuted.withValues(alpha: 0.35)),
        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: LightColors.surfaceLight,
        selectedColor: Color(0x33D9661C),
        side: BorderSide(color: LightColors.border),
        labelStyle: TextStyle(color: LightColors.textSecondary),
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: LightColors.saffronDeep,
        unselectedLabelColor: LightColors.textMuted,
        indicatorColor: LightColors.saffron,
        dividerColor: LightColors.divider,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: LightColors.saffron),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: LightColors.textPrimary,
        contentTextStyle: TextStyle(color: LightColors.white),
        behavior: SnackBarBehavior.floating,
      ),
      dialogTheme: const DialogThemeData(backgroundColor: LightColors.surface, surfaceTintColor: Colors.transparent),
      bottomSheetTheme: const BottomSheetThemeData(backgroundColor: LightColors.surface, surfaceTintColor: Colors.transparent),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: LightColors.surface,
        selectedItemColor: LightColors.saffron,
        unselectedItemColor: LightColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
