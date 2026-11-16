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
  /// Mobile and email were already verified with the emailed code on the first screen.
  final String phone;
  final String email;
  final String verificationToken;
  const RegistrationScreen({super.key, required this.phone, required this.email, required this.verificationToken});
  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _pageController = PageController();
  int _currentStep = 0;
  bool _submitting = false;

  // Step 1 — personal (contact already verified)
  String? _deviceId;
  final _nameCtrl = TextEditingController();
  DateTime? _dob;
  String _gender = '';

  // Step 2
  final Set<String> _selectedLanguages = {};
  final Set<String> _selectedSkills = {};

  // Step 3
  File? _profilePhoto;
  final _aboutCtrl = TextEditingController();
  final _platformsCtrl = TextEditingController();
  bool _worksOnline = false;
  int _hours = 4;

  String get _phone => widget.phone;
  String get _email => widget.email;

  @override
  void initState() {
    super.initState();
    DeviceId.get().then((id) => _deviceId = id);
  }

  bool _validateStep() {
    switch (_currentStep) {
      case 0:
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
        'phone_type': DeviceId.platform, // detected, not asked
        'email': _email,
        'email_verification_token': widget.verificationToken,
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
    _pageController.dispose();
    _nameCtrl.dispose();
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

  Widget _buildContactSection() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.success.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.success.withValues(alpha: 0.35)),
    ),
    child: Row(children: [
      const Icon(Icons.verified, color: AppColors.success),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_phone, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(_email, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ]),
      ),
      const Text('Verified', style: TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w600)),
    ]),
  );

  Widget _buildStep1() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _buildContactSection(),
      const SizedBox(height: 24),
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
