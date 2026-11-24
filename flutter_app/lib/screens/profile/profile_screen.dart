import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../l10n/app_strings.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/theme_provider.dart';
import '../../theme/app_theme.dart';
import '../auth/login_screen.dart';
import '../family/family_members_screen.dart';
import '../consultation/chat_history_screen.dart';
import '../../utils/invite_share.dart';
import 'edit_profile_screen.dart';

class _InviteCard extends StatelessWidget {
  final String? name;
  const _InviteCard({this.name});

  @override
  Widget build(BuildContext context) {
    final accent = context.clr.accent;
    return Builder(
      builder: (btnContext) => Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => InviteShare.share(btnContext, inviterName: name),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [accent.withValues(alpha: 0.18), accent.withValues(alpha: 0.06)]),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: accent.withValues(alpha: 0.35)),
            ),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.2), shape: BoxShape.circle),
                child: Icon(Icons.card_giftcard_rounded, color: accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(context.s.inviteFriends, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(context.s.inviteSubtitle, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                ]),
              ),
              Icon(Icons.share_rounded, color: accent),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Opens the mail app addressed to support; falls back to showing the address.
Future<void> _contactSupport(BuildContext context) async {
  final uri = Uri(scheme: 'mailto', path: 'support@grahvarta.com', query: 'subject=Grahvarta app help');
  final fallback = context.s.helpEmailFallback;
  final messenger = ScaffoldMessenger.of(context);
  bool opened = false;
  try {
    opened = await launchUrl(uri);
  } catch (_) {}
  if (!opened) messenger.showSnackBar(SnackBar(content: Text(fallback)));
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final s = context.s;
    final textPrimary = context.clr.txtPrimary;
    final textSecondary = context.clr.txtSecondary;
    final textMuted = context.clr.txtMuted;
    final cardColor = context.clr.card;
    final accentColor = context.clr.accent;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.profile),
        actions: [
          TextButton(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
              }
            },
            style: TextButton.styleFrom(minimumSize: const Size(48, 40), maximumSize: const Size(180, 48), padding: const EdgeInsets.symmetric(horizontal: 12)),
            child: Text(s.signOut, style: TextStyle(color: accentColor)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildAvatar(context, user, accentColor),
            const SizedBox(height: 16),
            Text(user?.name ?? '', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: textPrimary)),
            Text(user?.email ?? '', style: TextStyle(color: textSecondary)),
            const SizedBox(height: 8),
            if (user?.sunSign != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(color: accentColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                child: Text('☀️ ${user!.sunSign} Sun', style: TextStyle(color: accentColor, fontSize: 13)),
              ),
            const SizedBox(height: 20),
            _InviteCard(name: user?.name),
            const SizedBox(height: 20),
            _buildSection(context, s.account, cardColor, textMuted, [
              _buildTile(context, Icons.person_outline, s.editProfile, '', textMuted, accentColor,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen()))),
              _buildTile(context, Icons.group_outlined, s.familyMembers, s.manageFamily, accentColor, accentColor,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FamilyMembersScreen()))),
              _buildTile(context, Icons.chat_bubble_outline_rounded, s.chatHistory, s.allConversations, accentColor, accentColor,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatHistoryScreen()))),
              _buildTile(context, Icons.privacy_tip_outlined, s.privacy, '', textMuted, accentColor,
                  onTap: () => _showPrivacyPolicy(context, cardColor, accentColor, textMuted)),
              _buildLanguageTile(context, s, accentColor, textMuted),
              _buildThemeTile(context, accentColor, textMuted),
            ]),
            const SizedBox(height: 16),
            _buildSection(context, s.about, cardColor, textMuted, [
              _buildTile(context, Icons.help_outline, s.helpSupport, 'support@grahvarta.com', textMuted, accentColor,
                  onTap: () => _contactSupport(context)),
              FutureBuilder<PackageInfo>(
                future: PackageInfo.fromPlatform(),
                builder: (context, snap) => _buildTile(context, Icons.info_outline, s.appVersion,
                    snap.hasData ? '${snap.data!.version} (${snap.data!.buildNumber})' : '', textMuted, accentColor),
              ),
            ]),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeTile(BuildContext context, Color accentColor, Color textMuted) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isDark;
    return ListTile(
      leading: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: accentColor, size: 22),
      title: Text(
        isDark ? context.s.darkTheme : context.s.lightTheme,
        style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 15),
      ),
      subtitle: Text(
        isDark ? context.s.switchToLight : context.s.switchToDark,
        style: TextStyle(color: textMuted, fontSize: 12),
      ),
      trailing: Switch(
        value: isDark,
        activeThumbColor: context.clr.onAccent,
        activeTrackColor: accentColor,
        onChanged: (_) => context.read<ThemeProvider>().toggle(),
      ),
    );
  }

  Widget _buildLanguageTile(BuildContext context, AppStrings s, Color accentColor, Color textMuted) {
    final currentCode = context.watch<LocaleProvider>().locale.languageCode;
    final currentLang = kSupportedLanguages.firstWhere((l) => l['code'] == currentCode, orElse: () => kSupportedLanguages.first);

    return ListTile(
      onTap: () => _showLanguagePicker(context, s, currentCode, accentColor, textMuted),
      leading: Icon(Icons.language, color: accentColor, size: 22),
      title: Text(s.language, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 15)),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(currentLang['native']!, style: TextStyle(color: textMuted, fontSize: 13)),
        const SizedBox(width: 4),
        Icon(Icons.chevron_right, color: textMuted, size: 18),
      ]),
    );
  }

  void _showLanguagePicker(BuildContext context, AppStrings s, String currentCode, Color accentColor, Color textMuted) {
    final sheetBg = context.clr.surface;
    final borderColor = context.clr.border;
    final textPrimary = context.clr.txtPrimary;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Container(
        padding: const EdgeInsets.fromLTRB(0, 12, 0, 32),
        decoration: BoxDecoration(
          color: sheetBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        // Transparent Material so the language rows show their tap ripple
        child: Material(
          type: MaterialType.transparency,
          child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: borderColor, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Text(s.selectLanguage,
                  style: TextStyle(color: textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ...kSupportedLanguages.map((lang) {
              final isSelected = lang['code'] == currentCode;
              return ListTile(
                onTap: () {
                  context.read<LocaleProvider>().setLocale(lang['code']!);
                  Navigator.pop(context);
                },
                contentPadding: const EdgeInsets.symmetric(horizontal: 24),
                title: Text(lang['native']!,
                    style: TextStyle(
                      color: isSelected ? accentColor : textPrimary,
                      fontSize: 16,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    )),
                subtitle: Text(lang['name']!,
                    style: TextStyle(color: textMuted, fontSize: 12)),
                trailing: isSelected
                    ? Icon(Icons.check_circle, color: accentColor, size: 22)
                    : null,
              );
            }),
          ],
        ),
        ),
      ),
    );
  }

  void _showPrivacyPolicy(BuildContext context, Color cardColor, Color accentColor, Color textMuted) {
    final textPrimary = context.clr.txtPrimary;
    final textSecondary = context.clr.txtSecondary;
    final borderColor = context.clr.border;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: cardColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, ctrl) => SafeArea(child: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: borderColor, borderRadius: BorderRadius.circular(2)))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Row(children: [
              Icon(Icons.privacy_tip_outlined, color: accentColor, size: 22),
              const SizedBox(width: 10),
              Text('Privacy Policy', style: TextStyle(color: textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
            ]),
          ),
          Divider(height: 1, color: borderColor),
          Expanded(
            child: ListView(
              controller: ctrl,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
              children: [
                _PolicySection(title: '1. Information We Collect', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'We collect information you provide directly to us, such as your name, email address, date of birth, time of birth, and place of birth. This information is used to generate personalised astrological readings, kundli charts, horoscopes, and compatibility reports.',
                ),
                _PolicySection(title: '2. How We Use Your Information', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'Your personal data is used to:\n• Provide accurate astrological consultations and reports\n• Connect you with verified astrologers on our platform\n• Personalise your daily horoscope and cosmic insights\n• Process payments for consultations and report unlocks\n• Send notifications about sessions, offers, and cosmic events',
                ),
                _PolicySection(title: '3. Birth Data & Sensitive Information', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'Your birth details (date, time, place) are treated as sensitive information. They are used solely for generating astrological charts and readings. We do not sell or share your birth data with third parties for marketing purposes.',
                ),
                _PolicySection(title: '4. Consultation Privacy', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'Chat and call sessions with astrologers are private. Conversations are encrypted in transit. Astrologers are bound by our confidentiality policy and may not share your personal details or reading content with anyone outside the platform.',
                ),
                _PolicySection(title: '5. Data Sharing', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'We do not sell your personal information. We may share data with:\n• Astrologers (only what is necessary for your consultation)\n• Payment processors (for secure transaction handling)\n• Analytics providers (aggregated, anonymised data only)\n• Legal authorities (only when required by law)',
                ),
                _PolicySection(title: '6. Data Retention', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'We retain your account information and consultation history for as long as your account is active. You may request deletion of your data at any time by contacting our support team. Certain data may be retained for legal or financial compliance purposes.',
                ),
                _PolicySection(title: '7. Security', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'We implement industry-standard security measures including encryption, secure servers, and regular audits to protect your personal information from unauthorised access, alteration, or disclosure.',
                ),
                _PolicySection(title: '8. Your Rights', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'You have the right to:\n• Access the personal data we hold about you\n• Correct inaccurate information\n• Request deletion of your account and data\n• Opt out of marketing communications\n• Data portability upon request',
                ),
                _PolicySection(title: '9. Contact Us', accentColor: accentColor, textSecondary: textSecondary,
                  body: 'If you have any questions about this Privacy Policy or how we handle your data, please contact us at support@grahvarta.com or through the Help & Support section in the user.',
                ),
                const SizedBox(height: 8),
                Text('Last updated: January 2025', style: TextStyle(color: textMuted, fontSize: 11)),
              ],
            ),
          ),
        ])),
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, user, Color accentColor) {
    final name = user?.name ?? 'U';
    final gradStart = context.clr.accent;
    return Container(
      width: 90, height: 90,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: gradStart,
        boxShadow: [BoxShadow(color: gradStart.withValues(alpha: 0.3), blurRadius: 20, spreadRadius: 5)],
      ),
      child: user?.avatarUrl != null
          ? ClipOval(child: Image.network(user!.avatarUrl!, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: TextStyle(fontSize: 36, color: context.clr.onAccent, fontWeight: FontWeight.bold)))))
          : Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: TextStyle(fontSize: 36, color: context.clr.onAccent, fontWeight: FontWeight.bold))),
    );
  }

  Widget _buildSection(BuildContext context, String title, Color cardColor, Color textMuted, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(color: textMuted, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        // Material (not a decorated Container) so the tiles' tap ripple is visible
        Material(
          color: cardColor,
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildTile(BuildContext context, IconData icon, String title, String subtitle, Color iconColor, Color accentColor,
      {Widget? trailing, VoidCallback? onTap}) {
    final textPrimary = Theme.of(context).colorScheme.onSurface;
    final textMuted = context.clr.txtMuted;
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: iconColor, size: 22),
      title: Text(title, style: TextStyle(color: textPrimary, fontSize: 15)),
      subtitle: subtitle.isNotEmpty ? Text(subtitle, style: TextStyle(color: textMuted, fontSize: 12)) : null,
      trailing: trailing ?? Icon(Icons.chevron_right, color: textMuted, size: 18),
    );
  }
}

class _PolicySection extends StatelessWidget {
  final String title;
  final String body;
  final Color accentColor;
  final Color textSecondary;
  const _PolicySection({required this.title, required this.body, required this.accentColor, required this.textSecondary});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(color: accentColor, fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text(body, style: TextStyle(color: textSecondary, fontSize: 13, height: 1.6)),
      ]),
    );
  }
}
