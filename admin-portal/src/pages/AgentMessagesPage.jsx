import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, CheckCircle2, RotateCcw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'replied', label: 'Replied' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' },
];

const STATUS_BADGE = { open: 'badge-warning', replied: 'badge-success', closed: 'badge-gray' };

function MessageCard({ m, onChanged }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const update = async (body, ok) => {
    setBusy(true);
    try {
      await api.patch(`/agent-messages/${m.id}`, body);
      toast.success(ok);
      setReply('');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {m.profile_picture_url ? (
            <img src={`https://api.grahvarta.com${m.profile_picture_url}`} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center font-bold text-orange">
              {(m.agent_name || '?')[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{m.agent_name || 'Agent'}</p>
            <p className="text-xs text-text-muted truncate">
              {m.phone}{m.agent_email ? ` · ${m.agent_email}` : ''}{m.token_no ? ` · ${m.token_no}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={STATUS_BADGE[m.status] || 'badge-gray'}>{m.status}</span>
          <p className="text-xs text-text-muted mt-1" title={format(new Date(m.created_at), 'dd MMM yyyy, HH:mm')}>
            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <p className="text-sm text-white whitespace-pre-wrap break-words bg-surface-light rounded-xl px-4 py-3">{m.message}</p>

      {m.admin_reply && (
        <div className="border-l-2 border-orange pl-3">
          <p className="text-xs text-text-muted mb-1">
            Reply by {m.replied_by || 'Admin'}{m.replied_at ? ` · ${format(new Date(m.replied_at), 'dd MMM, HH:mm')}` : ''}
          </p>
          <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{m.admin_reply}</p>
        </div>
      )}

      {m.status !== 'closed' && (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={m.admin_reply ? 'Send another reply…' : 'Write a reply — the agent sees it in the app under "Write to Us"'}
            className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-orange/50"
          />
          <div className="flex gap-2 justify-end">
            <button
              disabled={busy}
              onClick={() => update({ status: 'closed' }, 'Marked as closed')}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <CheckCircle2 size={14} /> Close
            </button>
            <button
              disabled={busy || !reply.trim()}
              onClick={() => update({ reply: reply.trim() }, 'Reply saved')}
              className="btn-primary text-sm disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
      {m.status === 'closed' && (
        <div className="flex justify-end">
          <button disabled={busy} onClick={() => update({ status: 'open' }, 'Reopened')} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RotateCcw size={14} /> Reopen
          </button>
        </div>
      )}
    </div>
  );
}

export default function AgentMessagesPage() {
  const [tab, setTab] = useState('open');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ open: 0, replied: 0, closed: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get('/agent-messages', { params: { status: tab || undefined, page, limit } })
      .then(r => { setRows(r.data.data); setTotal(r.data.total); setCounts(r.data.tab_counts || {}); })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);
  const allCount = (counts.open || 0) + (counts.replied || 0) + (counts.closed || 0);

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Agent Messages" subtitle={'Sent from "Write to Us" in the agent onboarding app (also emailed to support@grahvarta.com)'} />

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-white'}`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-border'}`}>
              {t.key ? counts[t.key] || 0 : allCount}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
          <MessageSquare size={40} className="opacity-40" />
          <p className="text-sm">No {tab || ''} messages</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(m => <MessageCard key={m.id} m={m} onChanged={fetchData} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-text-muted">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
