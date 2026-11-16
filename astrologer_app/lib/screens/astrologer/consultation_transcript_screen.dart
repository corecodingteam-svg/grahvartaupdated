import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

/// Saved speech-to-text transcript of a voice/video consultation.
class ConsultationTranscriptScreen extends StatefulWidget {
  final String consultationId;
  final String userName;
  const ConsultationTranscriptScreen({super.key, required this.consultationId, required this.userName});

  @override
  State<ConsultationTranscriptScreen> createState() => _ConsultationTranscriptScreenState();
}

class _ConsultationTranscriptScreenState extends State<ConsultationTranscriptScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _consultation = {};
  List<Map<String, dynamic>> _segments = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getConsultationTranscript(widget.consultationId);
      if (!mounted) return;
      setState(() {
        _consultation = Map<String, dynamic>.from(data['consultation'] ?? {});
        _segments = List<Map<String, dynamic>>.from(((data['segments'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e)));
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _time(dynamic iso) {
    final dt = DateTime.tryParse(iso?.toString() ?? '')?.toLocal();
    if (dt == null) return '';
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = _consultation['type'] == 'video';
    final started = DateTime.tryParse(_consultation['started_at']?.toString() ?? '')?.toLocal();
    final duration = int.tryParse(_consultation['duration_seconds']?.toString() ?? '');
    return Scaffold(
      appBar: AppBar(
        backgroundColor: context.clr.surface,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${isVideo ? 'Video' : 'Voice'} call transcript', style: TextStyle(color: context.clr.txtPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          Text(
            [
              widget.userName,
              if (started != null) '${started.day}/${started.month}/${started.year}',
              if (duration != null && duration > 0) '${(duration / 60).ceil()} min',
            ].join(' · '),
            style: TextStyle(color: context.clr.txtMuted, fontSize: 12),
          ),
        ]),
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: context.clr.accent))
          : _error != null
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('Could not load the transcript', style: TextStyle(color: context.clr.txtSecondary)),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ]))
              : _segments.isEmpty
                  ? Center(child: Text('No transcript was recorded for this call', style: TextStyle(color: context.clr.txtMuted)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _segments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final seg = _segments[i];
                        final isMe = seg['speaker_role'] == 'astrologer';
                        return Align(
                          alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe ? context.clr.accent.withValues(alpha: 0.15) : context.clr.card,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isMe ? context.clr.accent.withValues(alpha: 0.3) : context.clr.border),
                              ),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(
                                  '${isMe ? 'You' : widget.userName} · ${_time(seg['spoken_at'])}',
                                  style: TextStyle(color: isMe ? context.clr.accent : context.clr.txtMuted, fontSize: 11, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                SelectableText(seg['text']?.toString() ?? '', style: TextStyle(color: context.clr.txtPrimary, fontSize: 14, height: 1.4)),
                              ]),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
