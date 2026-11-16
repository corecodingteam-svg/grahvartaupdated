import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../api_service.dart';
import '../device_id.dart';
import 'dashboard_screen.dart';

const List<String> _languages = [
  'Assamese','Bengali','Bodo','Dogri','English','Gujarati','Hindi',
  'Kannada','Kashmiri','Konkani','Maithili','Malayalam','Manipuri',
  'Marathi','Nepali','Odia','Punjabi','Sanskrit','Santali','Sindhi',
  'Tamil','Telugu','Urdu',
];

const List<String> _skills = [
  'Signature Reading','Tarot','Vedic','KP','Numerology','Lal Kitab',
  'Psychic','Palmistry','Cartomancy','Prashana','Loshu Grid','Nadi',
  'Face Reading','Horary','Life Coach','Western','Gemology','Vastu',
];

class RegistrationScreen extends StatefulWidget {
  final String phone;
  const RegistrationScreen({super.key, required this.phone});
  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _pageController = PageController();
  int _currentStep = 0;
  bool _submitting = false;

  // Step 1 — contact (verified) + personal
  late final TextEditingController _phoneCtrl;
  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _sendingOtp = false;
  bool _verifyingOtp = false;
  String? _verificationToken; // set once the email OTP is verified
  String? _verifiedFor;       // "<phone>|<email>" the token was issued for
  int _resendIn = 0;
  Timer? _resendTimer;
  String? _deviceId;
  final _nameCtrl = TextEditingController();
  DateTime? _dob;
  String _gender = '';

  // Step 2
  final Set<String> _selectedLanguages = {};
  final Set<String> _selectedSkills = {};

  // Step 3
  File? _profilePhoto;
  String _phoneType = '';
  final _aboutCtrl = TextEditingController();
  final _platformsCtrl = TextEditingController();
  bool _worksOnline = false;
  int _hours = 4;

  static final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
  String get _phone => '+91${_phoneCtrl.text.trim()}';
  String get _email => _emailCtrl.text.trim().toLowerCase();
  bool get _isVerified => _verificationToken != null && _verifiedFor == '$_phone|$_email';

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: widget.phone.replaceFirst('+91', ''));
    DeviceId.get().then((id) => _deviceId = id);
  }

  String? _contactError() {
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(_phoneCtrl.text.trim())) return 'Enter a valid 10-digit mobile number';
    if (!_emailRe.hasMatch(_email)) return 'Enter a valid email address';
    return null;
  }

  Future<void> _sendOtp() async {
    final err = _contactError();
    if (err != null) { _showError(err); return; }
    setState(() => _sendingOtp = true);
    try {
      _deviceId ??= await DeviceId.get();
      await ApiService.sendEmailOtp(email: _email, phone: _phone, deviceId: _deviceId!);
      if (!mounted) return;
      _otpCtrl.clear();
      setState(() { _otpSent = true; _verificationToken = null; });
      _startResendTimer();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('A 5-digit code was sent to $_email'),
        backgroundColor: AppColors.success,
      ));
    } catch (e) {
      if (mounted) _showError(e.toString());
    } finally {
      if (mounted) setState(() => _sendingOtp = false);
    }
  }

  void _startResendTimer() {
    _resendTimer?.cancel();
    setState(() => _resendIn = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (!RegExp(r'^\d{5}$').hasMatch(otp)) { _showError('Enter the 5-digit code'); return; }
    setState(() => _verifyingOtp = true);
    try {
      final token = await ApiService.verifyEmailOtp(email: _email, otp: otp);
      if (!mounted) return;
      setState(() { _verificationToken = token; _verifiedFor = '$_phone|$_email'; });
      FocusScope.of(context).unfocus();
    } catch (e) {
      if (mounted) _showError(e.toString());
    } finally {
      if (mounted) setState(() => _verifyingOtp = false);
    }
  }

  /// Editing the number or email after verifying invalidates the verification.
  void _onContactChanged(String _) {
    if (_verificationToken != null && !_isVerified) {
      setState(() { _verificationToken = null; _otpSent = false; _otpCtrl.clear(); });
    } else {
      setState(() {});
    }
  }

  bool _validateStep() {
    switch (_currentStep) {
      case 0:
        final err = _contactError();
        if (err != null) { _showError(err); return false; }
        if (!_isVerified) { _showError(_otpSent ? 'Enter the code sent to your email and tap Verify' : 'Verify your email to continue'); return false; }
        if (_nameCtrl.text.trim().isEmpty) { _showError('Please enter your name'); return false; }
        if (_dob == null) { _showError('Please select date of birth'); return false; }
        if (_gender.isEmpty) { _showError('Please select gender'); return false; }
        return true;
      case 1:
        if (_selectedLanguages.isEmpty) { _showError('Select at least one language'); return false; }
        if (_selectedSkills.isEmpty) { _showError('Select at least one skill'); return false; }
        return true;
      case 2:
        if (_profilePhoto == null) { _showError('Please upload a profile photo'); return false; }
        if (_phoneType.isEmpty) { _showError('Select your phone type'); return false; }
        if (_worksOnline && _platformsCtrl.text.trim().isEmpty) {
          _showError('Enter the online platforms you work on'); return false;
        }
        if (_aboutCtrl.text.trim().isEmpty) {
          _showError('Please fill in About Me'); return false;
        }
        return true;
      default: return true;
    }
  }

  void _showError(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: AppColors.error),
  );

  void _next() {
    if (!_validateStep()) return;
    if (_currentStep < 2) {
      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      setState(() => _currentStep++);
    } else {
      _submit();
    }
  }

  void _prev() {
    if (_currentStep > 0) {
      _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      setState(() => _currentStep--);
    }
  }

  CameraDevice _cameraDevice = CameraDevice.front;

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: StatefulBuilder(
          builder: (ctx, setSheetState) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                ),
                const Text('Upload Profile Photo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 20),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primary,
                    child: Icon(Icons.photo_library, color: Colors.white),
                  ),
                  title: const Text('Choose from Gallery'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickFromGallery();
                  },
                ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary,
                    child: Icon(
                      _cameraDevice == CameraDevice.front ? Icons.camera_front : Icons.camera_rear,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(_cameraDevice == CameraDevice.front ? 'Take Selfie (Front Camera)' : 'Take Photo (Rear Camera)'),
                  trailing: IconButton(
                    tooltip: 'Switch Camera',
                    icon: const Icon(Icons.switch_camera, color: AppColors.primary),
                    onPressed: () {
                      setSheetState(() {
                        _cameraDevice = _cameraDevice == CameraDevice.front
                            ? CameraDevice.rear
                            : CameraDevice.front;
                      });
                      setState(() {});
                    },
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _pickFromCamera();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickFromGallery() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _profilePhoto = File(picked.path));
  }

  Future<void> _pickFromCamera() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: _cameraDevice,
      imageQuality: 80,
    );
    if (picked != null) setState(() => _profilePhoto = File(picked.path));
  }

  Future<void> _submit() async {
    if (!_validateStep()) return;
    setState(() => _submitting = true);
    try {
      String? photoUrl;
      if (_profilePhoto != null) {
        photoUrl = await ApiService.uploadPhoto(_profilePhoto!);
      }
      final phone = _phone;
      final result = await ApiService.submitApplication({
        'phone': phone,
        'name': _nameCtrl.text.trim(),
        'dob': _dob != null ? DateFormat('yyyy-MM-dd').format(_dob!) : null,
        'gender': _gender,
        'languages': _selectedLanguages.toList(),
        'skills': _selectedSkills.toList(),
        'profile_picture_url': photoUrl,
        'phone_type': _phoneType,
        'email': _email,
        'email_verification_token': _verificationToken,
        'device_id': _deviceId ?? await DeviceId.get(),
        'device_platform': DeviceId.platform,
        'works_online': _worksOnline,
        'online_platforms': _worksOnline ? _platformsCtrl.text.trim() : null,
        'hours_available': _hours,
        'about_me': _aboutCtrl.text.trim(),
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('agent_phone', phone);
      await prefs.setString('agent_name', _nameCtrl.text.trim());
      await prefs.setString('agent_token', result['token_no'] as String? ?? '');
      if (mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(phone: phone)));
      }
    } catch (e) {
      if (mounted) { setState(() => _submitting = false); _showError(e.toString()); }
    }
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _pageController.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _aboutCtrl.dispose();
    _platformsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agent Registration')),
      body: Column(
        children: [
          _StepIndicator(current: _currentStep),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [_buildStep1(), _buildStep2(), _buildStep3()],
            ),
          ),
          _buildNavButtons(),
        ],
      ),
    );
  }

  Widget _buildContactSection() {
    final verified = _isVerified;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Contact Details'),
      const SizedBox(height: 4),
      const Text('We will email you a 5-digit code to verify your address', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
      const SizedBox(height: 16),
      TextField(
        controller: _phoneCtrl,
        keyboardType: TextInputType.phone,
        maxLength: 10,
        enabled: !_sendingOtp && !_verifyingOtp,
        onChanged: _onContactChanged,
        decoration: const InputDecoration(
          labelText: 'Mobile Number *',
          prefixText: '+91  ',
          prefixIcon: Icon(Icons.phone_android_outlined),
          counterText: '',
        ),
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _emailCtrl,
        keyboardType: TextInputType.emailAddress,
        autocorrect: false,
        enabled: !_sendingOtp && !_verifyingOtp,
        onChanged: _onContactChanged,
        decoration: InputDecoration(
          labelText: 'Email Address *',
          prefixIcon: const Icon(Icons.email_outlined),
          suffixIcon: verified ? const Icon(Icons.verified, color: AppColors.success) : null,
        ),
      ),
      const SizedBox(height: 12),
      if (verified)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
          ),
          child: const Row(children: [
            Icon(Icons.check_circle, color: AppColors.success, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Email verified', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w600))),
          ]),
        )
      else ...[
        if (_otpSent) ...[
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 5,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, letterSpacing: 10, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                onChanged: (v) { if (v.length == 5) _verifyOtp(); },
                decoration: const InputDecoration(hintText: '•••••', counterText: ''),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _verifyingOtp ? null : _verifyOtp,
                style: ElevatedButton.styleFrom(minimumSize: const Size(96, 52)),
                child: _verifyingOtp
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Verify'),
              ),
            ),
          ]),
          const SizedBox(height: 6),
        ],
        Align(
          alignment: Alignment.centerRight,
          child: _otpSent
              ? TextButton(
                  onPressed: (_resendIn > 0 || _sendingOtp) ? null : _sendOtp,
                  child: Text(_sendingOtp ? 'Sending…' : _resendIn > 0 ? 'Resend code in ${_resendIn}s' : 'Resend code'),
                )
              : SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _sendingOtp ? null : _sendOtp,
                    icon: _sendingOtp
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                        : const Icon(Icons.mark_email_read_outlined),
                    label: Text(_sendingOtp ? 'Sending code…' : 'Send verification code'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 48),
                      side: const BorderSide(color: AppColors.primary),
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
        ),
      ],
    ]);
  }

  Widget _buildStep1() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _buildContactSection(),
      const SizedBox(height: 28),
      _sectionTitle('Personal Information'),
      const SizedBox(height: 20),
      TextField(controller: _nameCtrl, decoration: InputDecoration(labelText: 'Full Name *', prefixIcon: Icon(Icons.person_outline))),
      const SizedBox(height: 16),
      GestureDetector(
        onTap: () async {
          final d = await showDatePicker(
            context: context,
            initialDate: DateTime(1995),
            firstDate: DateTime(1950),
            lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
            builder: (ctx, child) => Theme(data: Theme.of(ctx).copyWith(colorScheme: ColorScheme.dark(primary: AppColors.primary)), child: child!),
          );
          if (d != null) setState(() => _dob = d);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            const Icon(Icons.calendar_today, color: AppColors.textMuted, size: 20),
            const SizedBox(width: 12),
            Text(
              _dob != null ? DateFormat('dd MMM yyyy').format(_dob!) : 'Date of Birth *',
              style: TextStyle(color: _dob != null ? AppColors.textPrimary : AppColors.textMuted, fontSize: 14),
            ),
          ]),
        ),
      ),
      const SizedBox(height: 20),
      const Text('Gender *', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      const SizedBox(height: 10),
      Row(children: ['Male', 'Female', 'Other'].map((g) => _RadioChip(label: g, selected: _gender == g, onTap: () => setState(() => _gender = g))).toList()),
    ]),
  );

  Widget _buildStep2() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Languages Known *'),
      const SizedBox(height: 4),
      const Text('Select all languages you can communicate in', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
      const SizedBox(height: 12),
      Wrap(
        spacing: 8, runSpacing: 8,
        children: _languages.map((lang) {
          final sel = _selectedLanguages.contains(lang);
          return FilterChip(
            label: Text(lang),
            selected: sel,
            onSelected: (_) => setState(() => sel ? _selectedLanguages.remove(lang) : _selectedLanguages.add(lang)),
            selectedColor: AppColors.primary,
            checkmarkColor: Colors.white,
            labelStyle: TextStyle(color: sel ? Colors.white : AppColors.textPrimary, fontSize: 13),
            backgroundColor: AppColors.surface,
            side: BorderSide(color: sel ? AppColors.primary : AppColors.border),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          );
        }).toList(),
      ),
      const SizedBox(height: 24),
      _sectionTitle('Skills *'),
      const SizedBox(height: 4),
      const Text('Select your areas of expertise', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
      const SizedBox(height: 12),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 3.0,
        children: _skills.map((skill) {
          final sel = _selectedSkills.contains(skill);
          return GestureDetector(
            onTap: () => setState(() => sel ? _selectedSkills.remove(skill) : _selectedSkills.add(skill)),
            child: Container(
              decoration: BoxDecoration(
                color: sel ? AppColors.primary.withValues(alpha: 0.15) : AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: sel ? 1.5 : 1),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(sel ? Icons.check : Icons.add, size: 14, color: sel ? AppColors.primary : AppColors.textMuted),
                  const SizedBox(width: 6),
                  Flexible(child: Text(skill, style: TextStyle(fontSize: 12, color: sel ? AppColors.primary : AppColors.textSecondary, fontWeight: sel ? FontWeight.w600 : FontWeight.normal), overflow: TextOverflow.ellipsis)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    ]),
  );

  Widget _buildStep3() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Profile & Availability'),
      const SizedBox(height: 20),

      // Profile picture
      const Text('Profile Picture *', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      const SizedBox(height: 10),
      Center(
        child: GestureDetector(
          onTap: _showPhotoOptions,
          child: Stack(children: [
            CircleAvatar(
              radius: 55,
              backgroundColor: AppColors.border,
              backgroundImage: _profilePhoto != null ? FileImage(_profilePhoto!) : null,
              child: _profilePhoto == null ? const Icon(Icons.person, size: 48, color: AppColors.textMuted) : null,
            ),
            Positioned(
              bottom: 0, right: 0,
              child: Container(
                width: 32, height: 32,
                decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                child: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
              ),
            ),
          ]),
        ),
      ),
      const SizedBox(height: 24),

      // Phone type
      const Text('What phone do you use? *', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      const SizedBox(height: 10),
      Row(children: [
        _PhoneTypeCard(type: 'android', icon: Icons.android, label: 'Android', selected: _phoneType == 'android', onTap: () => setState(() => _phoneType = 'android')),
        const SizedBox(width: 12),
        _PhoneTypeCard(type: 'ios', icon: Icons.phone_iphone, label: 'iPhone (iOS)', selected: _phoneType == 'ios', onTap: () => setState(() => _phoneType = 'ios')),
      ]),
      const SizedBox(height: 20),

      // About Me
      const Text('About Me *', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      const SizedBox(height: 6),
      TextField(
        controller: _aboutCtrl,
        maxLines: 3,
        maxLength: 200,
        decoration: const InputDecoration(
          hintText: 'Tell us about your experience and expertise...',
          alignLabelWithHint: true,
          counterText: '',
        ),
        onChanged: (_) => setState(() {}),
      ),
      Align(
        alignment: Alignment.centerRight,
        child: Text('${_aboutCtrl.text.length}/200', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
      ),
      const SizedBox(height: 20),

      // Works online
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Working from online platform?', style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
          value: _worksOnline,
          onChanged: (v) => setState(() => _worksOnline = v),
          activeThumbColor: AppColors.primary,
        ),
      ),
      if (_worksOnline) ...[
        const SizedBox(height: 12),
        TextField(
          controller: _platformsCtrl,
          maxLength: 200,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Which platforms? *',
            hintText: 'e.g. AstroTalk, AstroSage, Instagram',
            prefixIcon: Icon(Icons.public),
            counterText: '',
          ),
        ),
      ],
      const SizedBox(height: 20),

      // Hours
      const Text('Hours available per day', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      const SizedBox(height: 4),
      Row(children: [
        Text('$_hours hrs', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18)),
        Expanded(
          child: Slider(
            value: _hours.toDouble(),
            min: 1, max: 12, divisions: 11,
            activeColor: AppColors.primary,
            label: '$_hours hours',
            onChanged: (v) => setState(() => _hours = v.round()),
          ),
        ),
        const Text('12 hrs', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ]),
    ]),
  );

  Widget _sectionTitle(String t) => Text(t, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary));

  Widget _buildNavButtons() => Container(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
    decoration: BoxDecoration(color: AppColors.surface, border: Border(top: BorderSide(color: AppColors.border))),
    child: Row(children: [
      if (_currentStep > 0) ...[
        Expanded(
          child: OutlinedButton(
            onPressed: _submitting ? null : _prev,
            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 52), side: const BorderSide(color: AppColors.primary), foregroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Previous'),
          ),
        ),
        const SizedBox(width: 12),
      ],
      Expanded(
        child: ElevatedButton(
          onPressed: _submitting ? null : _next,
          child: _submitting
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(_currentStep == 2 ? 'Submit Application' : 'Next'),
        ),
      ),
    ]),
  );
}

class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  @override
  Widget build(BuildContext context) {
    const labels = ['Personal Info', 'Skills', 'Profile'];
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: List.generate(3, (i) {
          final done = i < current;
          final active = i == current;
          return Expanded(
            child: Row(
              children: [
                Column(mainAxisSize: MainAxisSize.min, children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: done || active ? AppColors.primary : AppColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: done || active ? AppColors.primary : AppColors.border, width: 2),
                    ),
                    child: Center(
                      child: done
                          ? const Icon(Icons.check, color: Colors.white, size: 18)
                          : Text('${i + 1}', style: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(labels[i], style: TextStyle(fontSize: 10, color: active ? AppColors.primary : AppColors.textMuted, fontWeight: active ? FontWeight.w600 : FontWeight.normal)),
                ]),
                if (i < 2)
                  Expanded(child: Container(height: 2, margin: const EdgeInsets.only(bottom: 18), color: i < current ? AppColors.primary : AppColors.border)),
              ],
            ),
          );
        }),
      ),
    );
  }
}

class _RadioChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _RadioChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: selected ? AppColors.primary : AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: selected ? AppColors.primary : AppColors.border),
      ),
      child: Text(label, style: TextStyle(color: selected ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w500)),
    ),
  );
}

class _PhoneTypeCard extends StatelessWidget {
  final String type, label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _PhoneTypeCard({required this.type, required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 2 : 1),
        ),
        child: Column(children: [
          Icon(icon, size: 32, color: selected ? AppColors.primary : AppColors.textMuted),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(color: selected ? AppColors.primary : AppColors.textSecondary, fontWeight: selected ? FontWeight.w600 : FontWeight.normal, fontSize: 13), textAlign: TextAlign.center),
        ]),
      ),
    ),
  );
}
