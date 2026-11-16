import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, AlertTriangle, PauseCircle, Lock, Unlock, PlayCircle, Search, History } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { TableShimmer } from '../components/Shimmer';
import { Tooltip } from '../components/Tooltip';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'astrologer', label: 'Astrologers' },
  { key: 'user', label: 'Users' },
];

const HOLD_OPTIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
];

const DEFAULT_WARNING =
  'Sharing phone numbers, email addresses or other contact details is against Grahvarta rules. Repeated violations will lead to your account being put on hold or locked.';

const displayName = (r) => r.display_name || r.name || 'Unknown';

function StateBadges({ row }) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.is_locked && <span className="badge-error">Locked</span>}
      {!row.is_locked && row.is_on_hold && (
        <Tooltip content={`On hold until ${format(new Date(row.hold_until), 'dd MMM yyyy, HH:mm')}`} side="left">
          <span className="badge-warning cursor-default">On hold</span>
        </Tooltip>
      )}
      {!row.is_locked && !row.is_on_hold && <span className="badge-gray">Active</span>}
      {row.warning_count > 0 && <span className="badge-gray">{row.warning_count} warning{row.warning_count > 1 ? 's' : ''}</span>}
    </div>
  );
}

function ActionModal({ kind, row, onClose, onDone }) {
  const [text, setText] = useState(kind === 'warn' ? DEFAULT_WARNING : '');
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);

  const titles = { warn: 'Send warning', hold: 'Put account on hold', lock: 'Lock account' };
  const submit = async () => {
    setBusy(true);
    try {
      if (kind === 'warn') await api.post(`/moderation/${row.user_id}/warn`, { message: text });
      if (kind === 'hold') await api.post(`/moderation/${row.user_id}/hold`, { hours, reason: text });
      if (kind === 'lock') await api.post(`/moderation/${row.user_id}/lock`, { reason: text });
      toast.success(kind === 'warn' ? 'Warning sent' : kind === 'hold' ? 'Account put on hold' : 'Account locked');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <h3 className="font-semibold text-white mb-1">{titles[kind]}</h3>
        <p className="text-xs text-text-muted mb-4">{displayName(row)} · {row.email}</p>

        {kind === 'hold' && (
          <div className="mb-4">
            <label className="text-xs text-text-secondary mb-1.5 block">Hold for</label>
            <div className="grid grid-cols-4 gap-2">
              {HOLD_OPTIONS.map(o => (
                <button
                  key={o.hours}
                  onClick={() => setHours(o.hours)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors ${hours === o.hours ? 'bg-orange text-white border-orange' : 'bg-surface-light text-text-secondary border-border hover:text-white'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              {row.astrologer_id
                ? 'The astrologer is taken offline and cannot go online or take consultations until the hold ends.'
                : 'The user cannot start chats or calls until the hold ends.'}
            </p>
          </div>
        )}
        {kind === 'lock' && (
          <p className="text-xs text-error mb-3">
            The account is signed out on every device and cannot log in until unlocked.
            {row.astrologer_id ? ' The astrologer is also hidden from users.' : ''}
          </p>
        )}

        <label className="text-xs text-text-secondary mb-1 block">{kind === 'warn' ? 'Message sent to the account' : 'Reason (shown to the account)'}</label>
        <textarea
          rows={kind === 'warn' ? 4 : 3}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={kind === 'warn' ? '' : 'Violation of Grahvarta communication rules'}
          className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange/50"
        />
        <p className="text-xs text-text-muted mt-1">A push notification is sent and it appears in the app's notifications.</p>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || (kind === 'warn' && !text.trim())}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 ${kind === 'lock' ? 'bg-red-600 hover:bg-red-500' : 'bg-orange hover:bg-orange/90'}`}
          >
            {busy ? 'Working…' : kind === 'warn' ? 'Send warning' : kind === 'hold' ? 'Put on hold' : 'Lock account'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ row, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/moderation/${row.user_id}`)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load history'));
  }, [row.user_id]);

  const actionLabel = { warn: 'Warned', hold: 'Put on hold', release: 'Hold released', lock: 'Locked', unlock: 'Unlocked' };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-[520px] max-w-full bg-surface border-l border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-white text-lg">{displayName(row)}</h2>
            <p className="text-xs text-text-muted">{row.email}{row.phone ? ` · ${row.phone}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-light text-text-muted hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {!data ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <>
              <section>
                <p className="text-xs text-text-muted uppercase font-semibold tracking-wider mb-3">Blocked messages ({data.violations.length})</p>
                <div className="space-y-2">
                  {data.violations.map(v => (
                    <div key={v.id} className="card p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex gap-1">
                          {(v.detected || []).map(d => <span key={d} className="badge-error capitalize">{d}</span>)}
                          <span className="badge-gray">{v.channel === 'live_chat' ? 'Live chat' : 'Consultation chat'}</span>
                        </div>
                        <span className="text-xs text-text-muted shrink-0">{format(new Date(v.created_at), 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                      <p className="text-sm text-white break-words">{v.content}</p>
                      {v.counterpart_name && <p className="text-xs text-text-muted mt-1">With {v.counterpart_name}</p>}
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p className="text-xs text-text-muted uppercase font-semibold tracking-wider mb-3">Moderation history</p>
                {data.actions.length === 0 ? (
                  <p className="text-sm text-text-muted">No action taken yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.actions.map(a => (
                      <div key={a.id} className="flex items-start justify-between gap-3 text-sm border-b border-divider pb-2">
                        <div>
                          <p className="text-white">{actionLabel[a.action] || a.action}
                            {a.hold_until && <span className="text-text-muted"> until {format(new Date(a.hold_until), 'dd MMM, HH:mm')}</span>}
                          </p>
                          {a.reason && <p className="text-xs text-text-muted mt-0.5">{a.reason}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-text-secondary">{a.admin_name || 'Admin'}</p>
                          <p className="text-xs text-text-muted">{format(new Date(a.created_at), 'dd MMM yyyy, HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViolatorsPage() {
  const [tab, setTab] = useState('astrologer');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({ astrologer: 0, user: 0 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { kind, row }
  const [history, setHistory] = useState(null);
  const limit = 20;

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get('/moderation/violators', { params: { role: tab, page, limit, q: query || undefined } })
      .then(r => { setRows(r.data.data); setTotal(r.data.total); setTabCounts(r.data.tab_counts || {}); })
      .catch(() => toast.error('Failed to load violators'))
      .finally(() => setLoading(false));
  }, [tab, page, query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const quick = async (path, ok) => {
    try { await api.post(path); toast.success(ok); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      {modal && <ActionModal kind={modal.kind} row={modal.row} onClose={() => setModal(null)} onDone={fetchData} />}
      {history && <HistoryPanel row={history} onClose={() => setHistory(null)} />}

      <PageHeader title="Rule Violators" subtitle="Accounts that tried to share phone numbers or email addresses in chat" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-white'}`}
            >
              {t.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-border'}`}>{tabCounts[t.key] || 0}</span>
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); setPage(1); setQuery(q.trim()); }} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="input pl-8 w-64" />
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-4 py-3 text-left">{tab === 'astrologer' ? 'Astrologer' : 'User'}</th>
              <th className="px-4 py-3 text-right">Violations</th>
              <th className="px-4 py-3 text-left">Latest blocked message</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer rows={6} cols={5} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-text-muted">No rule violations recorded</td></tr>
            ) : rows.map(r => (
              <tr key={r.user_id} className="border-b border-divider hover:bg-surface-light/50 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{displayName(r)}</p>
                  <p className="text-text-muted text-xs">{r.email}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-semibold ${r.violation_count >= 3 ? 'text-error' : 'text-white'}`}>{r.violation_count}</span>
                  <p className="text-xs text-text-muted">{formatDistanceToNow(new Date(r.last_violation_at), { addSuffix: true })}</p>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-text-secondary text-xs line-clamp-2 break-words">{r.last_content}</p>
                  <div className="flex gap-1 mt-1">{(r.last_detected || []).map(d => <span key={d} className="badge-error capitalize">{d}</span>)}</div>
                </td>
                <td className="px-4 py-3"><StateBadges row={r} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip content="View blocked messages & history" side="left">
                      <button onClick={() => setHistory(r)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border"><History size={14} className="text-text-secondary" /></button>
                    </Tooltip>
                    <Tooltip content="Send warning notification" side="left">
                      <button onClick={() => setModal({ kind: 'warn', row: r })} className="p-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25"><AlertTriangle size={14} className="text-yellow-400" /></button>
                    </Tooltip>
                    {r.is_on_hold ? (
                      <Tooltip content="Release hold" side="left">
                        <button onClick={() => quick(`/moderation/${r.user_id}/release`, 'Hold released')} className="p-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25"><PlayCircle size={14} className="text-green-400" /></button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Put on hold (temporary)" side="left">
                        <button disabled={r.is_locked} onClick={() => setModal({ kind: 'hold', row: r })} className="p-1.5 rounded-lg bg-orange/15 hover:bg-orange/25 disabled:opacity-30"><PauseCircle size={14} className="text-orange" /></button>
                      </Tooltip>
                    )}
                    {r.is_locked ? (
                      <Tooltip content="Unlock account" side="left">
                        <button onClick={() => window.confirm(`Unlock ${displayName(r)}?`) && quick(`/moderation/${r.user_id}/unlock`, 'Account unlocked')} className="p-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25"><Unlock size={14} className="text-green-400" /></button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Lock account" side="left">
                        <button onClick={() => setModal({ kind: 'lock', row: r })} className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25"><Lock size={14} className="text-red-400" /></button>
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
