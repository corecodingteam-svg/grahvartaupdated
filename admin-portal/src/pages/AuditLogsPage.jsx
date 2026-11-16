import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { TableShimmer } from '../components/Shimmer';
import toast from 'react-hot-toast';

const EMPTY_FILTERS = { q: '', admin_id: '', action: '', entity_type: '', success: '', from: '', to: '' };

const fmtValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

function Details({ log }) {
  const changes = log.changes && Object.keys(log.changes).length ? log.changes : null;
  const body = log.request_body && Object.keys(log.request_body).length ? log.request_body : null;
  return (
    <div className="grid md:grid-cols-2 gap-4 px-4 py-4 bg-surface-light/40 text-xs">
      <div className="space-y-3">
        {changes && (
          <div>
            <p className="text-text-muted uppercase font-semibold tracking-wider mb-2">Changes</p>
            <table className="w-full">
              <thead><tr className="text-text-muted"><th className="text-left py-1 pr-2">Field</th><th className="text-left py-1 pr-2">Before</th><th className="text-left py-1">After</th></tr></thead>
              <tbody>
                {Object.entries(changes).map(([field, c]) => (
                  <tr key={field} className="border-t border-divider align-top">
                    <td className="py-1.5 pr-2 text-text-secondary font-mono">{field}</td>
                    <td className="py-1.5 pr-2 text-red-300 break-words">{fmtValue(c?.from)}</td>
                    <td className="py-1.5 text-green-300 break-words">{fmtValue(c?.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <p className="text-text-muted uppercase font-semibold tracking-wider mb-2">Request</p>
          <p className="font-mono text-text-secondary break-all">{log.method} {log.path} → {log.status_code}</p>
          {body && <pre className="mt-2 bg-card border border-border rounded-lg p-2 text-text-secondary whitespace-pre-wrap break-words max-h-56 overflow-auto">{JSON.stringify(body, null, 2)}</pre>}
        </div>
      </div>
      <div className="space-y-1.5 text-text-secondary">
        <p><span className="text-text-muted w-24 inline-block">Admin</span>{log.admin_name || '—'} {log.admin_email ? `(${log.admin_email})` : ''}</p>
        <p><span className="text-text-muted w-24 inline-block">Role</span>{log.admin_type || '—'}</p>
        <p><span className="text-text-muted w-24 inline-block">Entity</span>{log.entity_type || '—'} <span className="font-mono">{log.entity_id || ''}</span></p>
        <p><span className="text-text-muted w-24 inline-block">IP address</span><span className="font-mono">{log.ip_address || '—'}</span></p>
        <p className="break-words"><span className="text-text-muted w-24 inline-block">User agent</span>{log.user_agent || '—'}</p>
        <p><span className="text-text-muted w-24 inline-block">Time</span>{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}</p>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState({ actions: [], entity_types: [], admins: [] });
  const [open, setOpen] = useState(null);
  const limit = 50;

  useEffect(() => {
    api.get('/audit-logs/filters').then(r => setOptions(r.data.data)).catch(() => {});
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    Object.entries(applied).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    api.get('/audit-logs', { params })
      .then(r => { setLogs(r.data.data); setTotal(r.data.total); })
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [page, applied]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const apply = (e) => { e?.preventDefault(); setPage(1); setApplied(filters); };
  const reset = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };
  const totalPages = Math.ceil(total / limit);
  const select = 'bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange/50';

  return (
    <div className="p-8">
      <PageHeader title="Audit Log" subtitle={`${total} recorded admin action${total === 1 ? '' : 's'}`} />

      <form onSubmit={apply} className="card mb-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
        <input className="input col-span-2" placeholder="Search summary, admin, path, id" value={filters.q} onChange={e => set('q', e.target.value)} />
        <select className={select} value={filters.admin_id} onChange={e => set('admin_id', e.target.value)}>
          <option value="">All admins</option>
          {options.admins.map(a => <option key={a.admin_id} value={a.admin_id}>{a.admin_name || a.admin_email}</option>)}
        </select>
        <select className={select} value={filters.action} onChange={e => set('action', e.target.value)}>
          <option value="">All actions</option>
          {options.actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={select} value={filters.entity_type} onChange={e => set('entity_type', e.target.value)}>
          <option value="">All entities</option>
          {options.entity_types.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={select} value={filters.success} onChange={e => set('success', e.target.value)}>
          <option value="">Any result</option>
          <option value="true">Succeeded</option>
          <option value="false">Failed</option>
        </select>
        <input type="date" className={select} value={filters.from} onChange={e => set('from', e.target.value)} title="From" />
        <input type="date" className={select} value={filters.to} onChange={e => set('to', e.target.value)} title="To" />
        <div className="col-span-2 md:col-span-4 xl:col-span-8 flex gap-2 justify-end">
          <button type="button" onClick={reset} className="btn-ghost flex items-center gap-1.5"><RotateCcw size={14} /> Reset</button>
          <button type="submit" className="btn-primary">Apply filters</button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Summary</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer rows={10} cols={6} />
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-muted">No audit entries match these filters</td></tr>
            ) : logs.map(log => (
              <Fragment key={log.id}>
                <tr onClick={() => setOpen(open === log.id ? null : log.id)} className="border-b border-divider hover:bg-surface-light/50 cursor-pointer">
                  <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{log.admin_name || log.admin_email || '—'}</p>
                    <p className="text-xs text-text-muted">{log.admin_type || ''}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-orange whitespace-nowrap">{log.action}</td>
                  <td className="px-4 py-3 text-text-secondary">{log.summary || `${log.method} ${log.path}`}</td>
                  <td className="px-4 py-3">
                    {log.success ? <span className="badge-success">OK</span> : <span className="badge-error">{log.status_code}</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{open === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                </tr>
                {open === log.id && (
                  <tr className="border-b border-divider"><td colSpan={6} className="p-0"><Details log={log} /></td></tr>
                )}
              </Fragment>
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
