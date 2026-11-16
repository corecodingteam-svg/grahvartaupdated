import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Edit2, Ban, ShieldCheck, UserCog } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { format } from 'date-fns';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { TableShimmer } from '../components/Shimmer';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${new Intl.NumberFormat('en-IN').format(parseFloat(n) || 0)}`;

function RatesModal({ astrologer, onClose, onSaved }) {
  const [chat, setChat]   = useState(astrologer.per_minute_rate_chat);
  const [call, setCall]   = useState(astrologer.per_minute_rate_call);
  const [video, setVideo] = useState(astrologer.per_minute_rate_video);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.put(`/astrologers/${astrologer.id}/rates`, {
        per_minute_rate_chat: parseFloat(chat),
        per_minute_rate_call: parseFloat(call),
        per_minute_rate_video: parseFloat(video),
      });
      toast.success('Rates updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to update rates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <h3 className="font-semibold text-white mb-4">Set Rates — {astrologer.display_name}</h3>
        {[['Chat (₹/min)', chat, setChat], ['Call (₹/min)', call, setCall], ['Video (₹/min)', video, setVideo]].map(([label, val, set]) => (
          <div key={label} className="mb-3">
            <label className="text-xs text-text-secondary mb-1 block">{label}</label>
            <input type="number" className="input" value={val} onChange={(e) => set(e.target.value)} min="1" />
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const listToText = (v) => (Array.isArray(v) ? v.join(', ') : (v || ''));
const textToList = (t) => t.split(',').map(s => s.trim()).filter(Boolean);

function EditProfileModal({ astrologer, onClose, onSaved }) {
  const [f, setF] = useState({
    display_name: astrologer.display_name || '',
    email: astrologer.email || '',
    phone: astrologer.phone || '',
    bio: astrologer.bio || '',
    avatar_url: astrologer.avatar_url || '',
    experience_years: astrologer.experience_years ?? 0,
    languages: listToText(astrologer.languages),
    specializations: listToText(astrologer.specializations),
    expertise_areas: listToText(astrologer.expertise_areas),
    per_minute_rate_chat: astrologer.per_minute_rate_chat ?? '',
    per_minute_rate_call: astrologer.per_minute_rate_call ?? '',
    per_minute_rate_video: astrologer.per_minute_rate_video ?? '',
    is_verified: !!astrologer.is_verified,
    is_chat_available: astrologer.is_chat_available !== false,
    is_call_available: astrologer.is_call_available !== false,
    is_video_available: astrologer.is_video_available !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!f.display_name.trim()) return toast.error('Display name is required');
    setSaving(true);
    try {
      const res = await api.put(`/astrologers/${astrologer.id}`, {
        ...f,
        experience_years: parseInt(f.experience_years) || 0,
        languages: textToList(f.languages),
        specializations: textToList(f.specializations),
        expertise_areas: textToList(f.expertise_areas),
        per_minute_rate_chat: parseFloat(f.per_minute_rate_chat),
        per_minute_rate_call: parseFloat(f.per_minute_rate_call),
        per_minute_rate_video: parseFloat(f.per_minute_rate_video),
        avatar_url: f.avatar_url.trim() || null,
        phone: f.phone.trim() || null,
      });
      toast.success(res.data.message === 'No changes' ? 'No changes to save' : 'Profile updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, props = {}) => (
    <div>
      <label className="text-xs text-text-secondary mb-1 block">{label}</label>
      <input className="input" value={f[key]} onChange={e => set(key, e.target.value)} {...props} />
    </div>
  );
  const toggle = (label, key) => (
    <label className="flex items-center justify-between gap-3 bg-surface-light border border-border rounded-xl px-3 py-2 cursor-pointer">
      <span className="text-sm text-text-secondary">{label}</span>
      <input type="checkbox" checked={f[key]} onChange={e => set(key, e.target.checked)} className="accent-orange w-4 h-4" />
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Edit profile — {astrologer.display_name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-light text-text-muted"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-2 gap-3">
            {field('Display name', 'display_name')}
            {field('Experience (years)', 'experience_years', { type: 'number', min: 0 })}
            {field('Login email', 'email', { type: 'email' })}
            {field('Phone', 'phone')}
          </div>
          {field('Avatar image URL', 'avatar_url', { placeholder: 'https://…' })}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Bio</label>
            <textarea rows={4} className="input resize-none" value={f.bio} onChange={e => set('bio', e.target.value)} />
          </div>
          {field('Languages (comma separated)', 'languages', { placeholder: 'Hindi, English' })}
          {field('Specializations (comma separated)', 'specializations', { placeholder: 'Vedic, Tarot' })}
          {field('Expertise areas (comma separated)', 'expertise_areas', { placeholder: 'Career, Marriage' })}
          <div className="grid grid-cols-3 gap-3">
            {field('Chat ₹/min', 'per_minute_rate_chat', { type: 'number', min: 0 })}
            {field('Call ₹/min', 'per_minute_rate_call', { type: 'number', min: 0 })}
            {field('Video ₹/min', 'per_minute_rate_video', { type: 'number', min: 0 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {toggle('Verified badge', 'is_verified')}
            {toggle('Chat available', 'is_chat_available')}
            {toggle('Voice call available', 'is_call_available')}
            {toggle('Video call available', 'is_video_available')}
          </div>
          <p className="text-xs text-text-muted">Every change is recorded in the audit log with its before and after values.</p>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AstrologersPage() {
  const [astrologers, setAstrologers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [ratesModal, setRatesModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const limit = 20;

  const fetchAstrologers = useCallback(() => {
    setLoading(true);
    api.get('/astrologers', { params: { page, limit, status: statusFilter || undefined } })
      .then((r) => { setAstrologers(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchAstrologers(); }, [fetchAstrologers]);

  const approve = async (id) => {
    try { await api.post(`/astrologers/${id}/approve`); toast.success('Approved'); fetchAstrologers(); }
    catch { toast.error('Failed'); }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try { await api.post(`/astrologers/${id}/reject`, { reason }); toast.success('Rejected'); fetchAstrologers(); }
    catch { toast.error('Failed'); }
  };

  const toggleOnline = async (id) => {
    try { await api.post(`/astrologers/${id}/toggle-online`); fetchAstrologers(); }
    catch { toast.error('Failed'); }
  };

  const ban = async (a) => {
    const reason = prompt(`Reason for banning ${a.display_name}? (optional)`);
    if (reason === null) return; // cancelled
    try {
      await api.post(`/astrologers/${a.id}/ban`, { reason });
      toast.success(`${a.display_name} has been banned`);
      fetchAstrologers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const unban = async (a) => {
    if (!window.confirm(`Unban ${a.display_name}? They will become visible to users again.`)) return;
    try {
      await api.post(`/astrologers/${a.id}/unban`);
      toast.success(`${a.display_name} has been unbanned`);
      fetchAstrologers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  const statusBadge = (s) => {
    if (s === 'approved') return 'badge-success';
    if (s === 'rejected') return 'badge-error';
    return 'badge-warning';
  };

  return (
    <div className="p-8">
      {ratesModal && <RatesModal astrologer={ratesModal} onClose={() => setRatesModal(null)} onSaved={fetchAstrologers} />}
      {editModal && <EditProfileModal astrologer={editModal} onClose={() => setEditModal(null)} onSaved={fetchAstrologers} />}

      <PageHeader title="Astrologers" subtitle={`${total} total`} />

      <div className="flex gap-3 mb-6 flex-wrap">
        {['', 'pending', 'approved', 'rejected', 'banned'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === s
                ? s === 'banned' ? 'bg-red-600 text-white' : 'bg-orange text-white'
                : 'bg-surface-light text-text-secondary hover:text-white'
            }`}
          >
            {s === '' ? 'All' : s === 'banned' ? '🚫 Banned' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-4 py-3 text-left">Astrologer</th>
              <th className="px-4 py-3 text-left">Specializations</th>
              <th className="px-4 py-3 text-right">Earnings</th>
              <th className="px-4 py-3 text-right">Consultations</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Online</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer rows={8} cols={8} />
            ) : astrologers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-text-muted">No astrologers found</td></tr>
            ) : astrologers.map((a) => (
              <tr key={a.id} className={`border-b border-divider hover:bg-surface-light/50 ${a.is_banned ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {a.is_banned && <span className="text-red-400 text-xs font-bold">🚫</span>}
                    <div>
                      <p className="font-medium text-white">{a.display_name}</p>
                      <p className="text-text-muted text-xs">{a.email}</p>
                      {a.is_banned && a.ban_reason && (
                        <p className="text-red-400 text-xs mt-0.5">Reason: {a.ban_reason}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs">{(a.specializations || []).slice(0, 2).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{fmt(a.total_earnings)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{a.total_consultations}</td>
                <td className="px-4 py-3">
                  {a.is_banned
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">Banned</span>
                    : <span className={statusBadge(a.status)}>{a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : '—'}</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <button disabled={a.is_banned} onClick={() => toggleOnline(a.id)} className={`w-10 h-5 rounded-full transition-colors ${a.is_online ? 'bg-success' : 'bg-border'} relative disabled:opacity-40`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${a.is_online ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">{format(new Date(a.created_at), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip content="Edit astrologer profile" side="left">
                      <button onClick={() => setEditModal(a)} className="p-1.5 rounded-lg bg-orange/15 hover:bg-orange/25 transition-colors">
                        <UserCog size={14} className="text-orange" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Set per-minute rates" side="left">
                      <button onClick={() => setRatesModal(a)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border transition-colors">
                        <Edit2 size={14} className="text-text-secondary" />
                      </button>
                    </Tooltip>
                    {!a.is_banned && a.status === 'pending' && (
                      <>
                        <Tooltip content="Approve astrologer" side="left">
                          <button onClick={() => approve(a.id)} className="p-1.5 rounded-lg bg-success/15 hover:bg-success/25 transition-colors">
                            <Check size={14} className="text-success" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Reject application" side="left">
                          <button onClick={() => reject(a.id)} className="p-1.5 rounded-lg bg-error/15 hover:bg-error/25 transition-colors">
                            <X size={14} className="text-error" />
                          </button>
                        </Tooltip>
                      </>
                    )}
                    {!a.is_banned && a.status === 'rejected' && (
                      <Tooltip content="Re-approve astrologer" side="left">
                        <button onClick={() => approve(a.id)} className="p-1.5 rounded-lg bg-success/15 hover:bg-success/25 transition-colors">
                          <Check size={14} className="text-success" />
                        </button>
                      </Tooltip>
                    )}
                    {/* Ban / Unban */}
                    {a.is_banned ? (
                      <Tooltip content="Remove ban — astrologer will be visible to users again" side="left">
                        <button onClick={() => unban(a)} className="p-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 transition-colors">
                          <ShieldCheck size={14} className="text-green-400" />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Ban astrologer — immediately hidden from all users" side="left">
                        <button onClick={() => ban(a)} className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 transition-colors">
                          <Ban size={14} className="text-red-400" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
