import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import NewTicketModal from './components/NewTicketModal';
import TicketDetailModal from './components/TicketDetailModal';
import SupabaseModal from './components/SupabaseModal';
import ToastContainer from './components/Toast';
import { useToast } from './lib/useToast';

// ── Status config ─────────────────────────────────────────────
const STATUS_META = {
  new:                { label: 'New',                        pill: 'intake',    queue: 'intake' },
  diagnosed:          { label: 'Diagnosed',                  pill: 'intake',    queue: 'intake' },
  quote_sent:         { label: 'Quote Sent',                 pill: 'intake',    queue: 'intake' },
  awaiting_approval:  { label: 'Awaiting Approval',          pill: 'awaiting',  queue: 'intake' },
  parts_sourced:      { label: 'Parts Sourced',              pill: 'approved',  queue: 'approved' },
  ready_for_delivery: { label: 'Ready for Delivery',         pill: 'approved',  queue: 'approved' },
  completed:          { label: 'Completed',                  pill: 'completed', queue: 'completed' },
  rejected:           { label: 'Rejected – Non-Repairable',  pill: 'rejected',  queue: 'rejected' },
  returned:           { label: 'Returned Without Repair',    pill: 'returned',  queue: 'returned' },
};

const INTAKE_STATUSES    = ['new', 'diagnosed', 'quote_sent', 'awaiting_approval'];
const APPROVED_STATUSES  = ['parts_sourced', 'ready_for_delivery'];
const COMPLETED_STATUSES = ['completed'];
const REJECTED_STATUSES  = ['rejected'];
const RETURNED_STATUSES  = ['returned'];
const ALL_STATUSES       = [...INTAKE_STATUSES, ...APPROVED_STATUSES, ...COMPLETED_STATUSES, ...REJECTED_STATUSES, ...RETURNED_STATUSES];

const TAB_CONFIG = [
  { key: 'all',       label: 'All',       statuses: ALL_STATUSES },
  { key: 'intake',    label: 'Intake',    statuses: INTAKE_STATUSES },
  { key: 'approved',  label: 'Approved',  statuses: APPROVED_STATUSES },
  { key: 'completed', label: 'Completed', statuses: COMPLETED_STATUSES },
  { key: 'rejected',  label: 'Rejected',  statuses: REJECTED_STATUSES },
  { key: 'returned',  label: 'Returned',  statuses: RETURNED_STATUSES },
];

const DEMO_TICKETS = [
  { ticket_number: 'QZ-100001', device_type: 'Siemens S7-400 PLC', serial: '6ES7 412-2XK07', issue_description: 'CPU module not booting', priority: 'high', technician: 'Ahmad K.', estimated_cost: 4500, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: null, return_reason: null, notes: '', status: 'new', created_at: new Date(Date.now()-2*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100002', device_type: 'Allen Bradley CompactLogix', serial: '1769-L36ERMS', issue_description: 'I/O card replacement required', priority: 'normal', technician: 'Omar S.', estimated_cost: 1800, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: null, return_reason: null, notes: '', status: 'diagnosed', created_at: new Date(Date.now()-5*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100003', device_type: 'Beckhoff CP2621-0000', serial: 'CP2621-0000', issue_description: 'HMI touch screen unresponsive', priority: 'normal', technician: 'Ahmad K.', estimated_cost: 2200, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: null, return_reason: null, notes: '', status: 'awaiting_approval', created_at: new Date(Date.now()-4*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100004', device_type: 'ABB ACS880 Drive', serial: '', issue_description: 'Overcurrent fault on startup', priority: 'high', technician: '', estimated_cost: 7200, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: null, return_reason: null, notes: '', status: 'parts_sourced', created_at: new Date(Date.now()-3*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100005', device_type: 'Schneider M340 PLC', serial: 'BMX P34 2020', issue_description: 'Modbus communication offline', priority: 'normal', technician: 'Omar S.', estimated_cost: 3100, parts_cost: 1200, labour_cost: 900, actual_cost: 2100, completion_notes: 'Replaced comm card', rejection_reason: null, return_reason: null, notes: '', status: 'completed', created_at: new Date(Date.now()-10*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100006', device_type: 'Fanuc CNC Controller', serial: 'A06B-0223', issue_description: 'Main board damaged beyond repair', priority: 'high', technician: 'Ahmad K.', estimated_cost: 12000, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: 'Main PCB shorted, replacement cost exceeds device value', return_reason: null, notes: '', status: 'rejected', created_at: new Date(Date.now()-7*86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100007', device_type: 'Mitsubishi FR-A740 Drive', serial: 'FR-A740-7.5K', issue_description: 'Intermittent fault, no clear diagnosis', priority: 'low', technician: 'Omar S.', estimated_cost: 2800, parts_cost: null, labour_cost: null, actual_cost: null, completion_notes: null, rejection_reason: null, return_reason: 'Customer declined quote, requested return', notes: '', status: 'returned', created_at: new Date(Date.now()-6*86400000).toISOString(), updated_at: new Date().toISOString() },
];

function genId() { return 'QZ-' + String(Date.now()).slice(-6) + Math.floor(Math.random()*10); }
function fmtCost(val) { if (!val && val !== 0) return '—'; return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 0 }); }
function pct(n, d) { if (!d) return '0%'; return (n / d * 100).toFixed(1) + '%'; }

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META['new'];
  return <span className={`status-pill ${meta.pill}`}><span className="dot" />{meta.label}</span>;
}
function PriorityCell({ priority }) {
  const label = priority || 'normal';
  return <div className="priority-wrap"><span className={`priority-dot ${label}`} />{label.charAt(0).toUpperCase()+label.slice(1)}</div>;
}

function OutcomeBar({ tickets }) {
  const total     = tickets.length;
  const completed = tickets.filter(t => t.status === 'completed').length;
  const rejected  = tickets.filter(t => t.status === 'rejected').length;
  const returned  = tickets.filter(t => t.status === 'returned').length;
  const active    = total - completed - rejected - returned;
  if (!total) return null;
  return (
    <div className="outcome-bar-wrap">
      <div className="outcome-bar-title">Item Flow Overview</div>
      <div className="outcome-bar">
        {completed > 0 && <div className="outcome-bar-seg completed" style={{ width: pct(completed, total) }} />}
        {rejected  > 0 && <div className="outcome-bar-seg rejected"  style={{ width: pct(rejected, total)  }} />}
        {returned  > 0 && <div className="outcome-bar-seg returned"  style={{ width: pct(returned, total)  }} />}
        {active    > 0 && <div className="outcome-bar-seg active"    style={{ width: pct(active, total)    }} />}
      </div>
      <div className="outcome-legend">
        <div className="outcome-legend-item"><span className="outcome-legend-dot completed" />{pct(completed,total)} Completed ({completed})</div>
        <div className="outcome-legend-item"><span className="outcome-legend-dot rejected"  />{pct(rejected,total)} Rejected ({rejected})</div>
        <div className="outcome-legend-item"><span className="outcome-legend-dot returned"  />{pct(returned,total)} Returned ({returned})</div>
        <div className="outcome-legend-item"><span className="outcome-legend-dot active"    />{pct(active,total)} Active ({active})</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('all');
  const [search, setSearch]             = useState('');
  const [priorityFilter, setPriority]   = useState('');
  const [statusFilter, setStatus]       = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [showNew, setShowNew]           = useState(false);
  const [showDetail, setShowDetail]     = useState(null);
  const [showSupabase, setShowSupabase] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);

  const [supaUrl, setSupaUrl] = useState(() => localStorage.getItem('qz_supa_url') || process.env.REACT_APP_SUPABASE_URL || '');
  const [supaKey, setSupaKey] = useState(() => localStorage.getItem('qz_supa_key') || process.env.REACT_APP_SUPABASE_ANON_KEY || '');
  const [connected, setConnected] = useState(false);
  const [connLabel, setConnLabel] = useState('Local mode');

  const supaRef = useRef(null);
  const { toasts, addToast } = useToast();

  // ── Supabase init ──────────────────────────────────────────
  const initSupabase = useCallback(async (url, key) => {
    if (!url || !key) {
      const local = JSON.parse(localStorage.getItem('qz_tickets_local') || 'null');
      setTickets(local || DEMO_TICKETS);
      setConnected(false);
      setConnLabel('Local mode — configure Supabase for multi-user sync');
      setLoading(false);
      return;
    }
    try {
      const client = createClient(url, key);
      supaRef.current = client;
      const { data, error } = await client.from('tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data);
      setConnected(true);
      setConnLabel('Live — Supabase connected');
      setLoading(false);
      client.channel('tickets-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
          if (payload.eventType === 'INSERT') setTickets(prev => [payload.new, ...prev.filter(t => t.ticket_number !== payload.new.ticket_number)]);
          else if (payload.eventType === 'UPDATE') setTickets(prev => prev.map(t => t.ticket_number === payload.new.ticket_number ? payload.new : t));
          else if (payload.eventType === 'DELETE') setTickets(prev => prev.filter(t => t.ticket_number !== payload.old.ticket_number));
        }).subscribe();
    } catch (e) {
      setConnected(false);
      setConnLabel('Connection failed — using local mode');
      const local = JSON.parse(localStorage.getItem('qz_tickets_local') || 'null');
      setTickets(local || DEMO_TICKETS);
      setLoading(false);
    }
  }, []);

  useEffect(() => { initSupabase(supaUrl, supaKey); }, []); // eslint-disable-line
  useEffect(() => { if (!connected) localStorage.setItem('qz_tickets_local', JSON.stringify(tickets)); }, [tickets, connected]);

  // ── Load status history for a ticket ──────────────────────
  const loadHistory = useCallback(async (ticketNumber) => {
    if (!supaRef.current) { setStatusHistory([]); return; }
    try {
      const { data } = await supaRef.current.from('ticket_status_history')
        .select('*').eq('ticket_number', ticketNumber).order('changed_at', { ascending: true });
      setStatusHistory(data || []);
    } catch { setStatusHistory([]); }
  }, []);

  const openDetail = useCallback((ticket) => {
    setShowDetail(ticket);
    loadHistory(ticket.ticket_number);
  }, [loadHistory]);

  // ── Create ticket ──────────────────────────────────────────
  const createTicket = useCallback(async (form) => {
    const ticket = {
      ticket_number: genId(),
      device_type: form.device_type.trim(),
      serial: form.serial.trim(),
      issue_description: form.issue_description.trim(),
      priority: form.priority,
      technician: form.technician.trim(),
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      parts_cost: null, labour_cost: null, actual_cost: null,
      completion_notes: null, rejection_reason: null, return_reason: null,
      notes: form.notes.trim(),
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (supaRef.current) {
      const { data, error } = await supaRef.current.from('tickets').insert(ticket).select().single();
      if (error) throw error;
      // Log history
      await supaRef.current.from('ticket_status_history').insert({ ticket_number: ticket.ticket_number, from_status: null, to_status: 'new' });
      setTickets(prev => [data, ...prev]);
    } else {
      setTickets(prev => [ticket, ...prev]);
    }
    addToast('Ticket created: ' + ticket.ticket_number, 'success');
  }, [addToast]);

  // ── Change status ──────────────────────────────────────────
  const changeStatus = useCallback(async (ticketNumber, newStatus, extra = {}) => {
    const updated_at = new Date().toISOString();
    const updates = { status: newStatus, updated_at };

    // Attach extra fields
    if (newStatus === 'completed') {
      const pc = extra.parts_cost ? Number(extra.parts_cost) : null;
      const lc = extra.labour_cost ? Number(extra.labour_cost) : null;
      const ac = extra.actual_cost ? Number(extra.actual_cost) : (pc && lc ? pc + lc : pc || lc || null);
      Object.assign(updates, { parts_cost: pc, labour_cost: lc, actual_cost: ac, completion_notes: extra.completion_notes || null });
    }
    if (newStatus === 'rejected') updates.rejection_reason = extra.rejection_reason || null;
    if (newStatus === 'returned') updates.return_reason = extra.return_reason || null;

    if (supaRef.current) {
      const currentTicket = tickets.find(t => t.ticket_number === ticketNumber);
      const { error } = await supaRef.current.from('tickets').update(updates).eq('ticket_number', ticketNumber);
      if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
      // Log history
      await supaRef.current.from('ticket_status_history').insert({
        ticket_number: ticketNumber,
        from_status: currentTicket?.status || null,
        to_status: newStatus,
        notes: newStatus === 'rejected' ? extra.rejection_reason : newStatus === 'returned' ? extra.return_reason : null,
      });
    }

    setTickets(prev => prev.map(t => t.ticket_number === ticketNumber ? { ...t, ...updates } : t));
    const labels = {
      diagnosed: 'Marked as diagnosed', quote_sent: 'Quote marked sent',
      awaiting_approval: 'Sent for approval', parts_sourced: 'Parts sourced',
      ready_for_delivery: 'Ready for delivery', completed: 'Ticket completed ✓',
      rejected: 'Ticket marked rejected', returned: 'Ticket marked as returned',
    };
    addToast(labels[newStatus] || 'Status updated', newStatus === 'rejected' ? 'error' : 'success');
  }, [addToast, tickets]);

  const handleSupabaseSave = useCallback((url, key) => {
    localStorage.setItem('qz_supa_url', url);
    localStorage.setItem('qz_supa_key', key);
    setSupaUrl(url); setSupaKey(key);
    setLoading(true);
    initSupabase(url, key);
    addToast('Supabase connected', 'success');
  }, [initSupabase, addToast]);

  // ── Filter & stats ─────────────────────────────────────────
  const tabCfg = TAB_CONFIG.find(t => t.key === tab);

  const inDateRange = (t) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(t.created_at);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  };

  const filtered = tickets.filter(t => {
    if (!tabCfg.statuses.includes(t.status)) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (statusFilter   && t.status   !== statusFilter)   return false;
    if (!inDateRange(t)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.device_type?.toLowerCase().includes(s) && !t.ticket_number?.toLowerCase().includes(s) && !t.technician?.toLowerCase().includes(s) && !t.issue_description?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Apply date filter to stats too
  const rangeTickets = tickets.filter(inDateRange);
  const countIn = (statuses) => rangeTickets.filter(t => statuses.includes(t.status)).length;
  const totalReceived  = rangeTickets.length;
  const totalCompleted = countIn(COMPLETED_STATUSES);
  const totalRejected  = countIn(REJECTED_STATUSES);
  const totalReturned  = countIn(RETURNED_STATUSES);
  const totalActive    = countIn([...INTAKE_STATUSES, ...APPROVED_STATUSES]);
  const totalExpenses  = rangeTickets.filter(t => t.status === 'completed' && t.actual_cost).reduce((a, t) => a + Number(t.actual_cost), 0);
  const awaitingApproval = countIn(['awaiting_approval']);

  const statusOptions = tabCfg.statuses.map(s => ({ value: s, label: STATUS_META[s]?.label || s }));

  const rowClass = (t) => {
    if (t.status === 'rejected') return 'row-rejected';
    if (t.status === 'returned') return 'row-returned';
    return '';
  };

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">QZ</div>
          <div>
            <div className="topbar-name">QZ Industrial — Repair Tickets</div>
            <div className="topbar-sub">wais.youn@qzindustrial.com</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="connection-badge" onClick={() => setShowSupabase(true)}>
            <span className={`conn-dot ${connected ? 'live' : ''}`} />{connLabel}
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Ticket</button>
        </div>
      </div>

      {/* Nav */}
      <div className="nav">
        {TAB_CONFIG.map(t => {
          const count = t.key === 'all' ? tickets.length : countIn(t.statuses);
          const isHot = (t.key === 'intake' || t.key === 'approved') && count > 0;
          const isRed = (t.key === 'rejected') && count > 0;
          return (
            <div key={t.key} className={`nav-tab ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setStatus(''); }}>
              {t.label}
              <span className={`tab-badge ${isHot ? 'hot' : ''} ${isRed ? 'red' : ''}`}>{count}</span>
            </div>
          );
        })}
      </div>

      <div className="content">
        {/* Date filter bar */}
        <div className="date-filter-bar">
          <span className="date-filter-label">Filter by date</span>
          <input className="date-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="date-filter-sep">→</span>
          <input className="date-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && <button className="date-clear" onClick={() => { setDateFrom(''); setDateTo(''); }}>✕ Clear</button>}
        </div>

        {/* Stats row 1 — item counts */}
        <div className="dashboard-grid">
          <div className="stat-card s-total">
            <div className="stat-label">Total Received</div>
            <div className="stat-val">{totalReceived}</div>
            <div className="stat-sub">{totalActive} currently active</div>
          </div>
          <div className="stat-card s-completed">
            <div className="stat-label">Completed</div>
            <div className="stat-val">{totalCompleted}</div>
            <div className="stat-pct" style={{ color: '#1e7e4a' }}>{pct(totalCompleted, totalReceived)} success rate</div>
          </div>
          <div className="stat-card s-rejected">
            <div className="stat-label">Rejected</div>
            <div className="stat-val">{totalRejected}</div>
            <div className="stat-pct" style={{ color: '#b91c1c' }}>{pct(totalRejected, totalReceived)} of received</div>
          </div>
          <div className="stat-card s-returned">
            <div className="stat-label">Returned</div>
            <div className="stat-val">{totalReturned}</div>
            <div className="stat-pct" style={{ color: '#7c3aed' }}>{pct(totalReturned, totalReceived)} of received</div>
          </div>
        </div>

        {/* Stats row 2 — queue + expenses */}
        <div className="dashboard-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card s-intake">
            <div className="stat-label">Intake Queue</div>
            <div className="stat-val">{countIn(INTAKE_STATUSES)}</div>
            <div className="stat-sub">{awaitingApproval} awaiting approval</div>
          </div>
          <div className="stat-card s-approved">
            <div className="stat-label">Approved Queue</div>
            <div className="stat-val">{countIn(APPROVED_STATUSES)}</div>
            <div className="stat-sub">In progress</div>
          </div>
          <div className="stat-card s-expenses" style={{ gridColumn: 'span 2' }}>
            <div className="stat-label">Total Expenses — Completed Jobs</div>
            <div className="stat-val">{totalExpenses > 0 ? 'SAR ' + totalExpenses.toLocaleString('en-SA') : '—'}</div>
            <div className="stat-sub">Parts + Labour costs for all completed tickets</div>
          </div>
        </div>

        {/* Outcome bar */}
        <OutcomeBar tickets={rangeTickets} />

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <span className="toolbar-title">{tabCfg.label === 'All' ? 'All Tickets' : tabCfg.label + ' Queue'}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="toolbar-right">
            <input className="search-input" type="text" placeholder="Search device, ticket #, issue..." value={search} onChange={e => setSearch(e.target.value)} />
            {tab !== 'all' && statusOptions.length > 1 && (
              <select className="filter-sel" value={statusFilter} onChange={e => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <select className="filter-sel" value={priorityFilter} onChange={e => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="ticket-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Ticket #</th>
                <th style={{ width: 165 }}>Device</th>
                <th>Issue</th>
                <th style={{ width: 88 }}>Priority</th>
                <th style={{ width: 175 }}>Status</th>
                <th style={{ width: 110 }}>Cost</th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={7}>Loading tickets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-label">No tickets found</div>
                    <div className="empty-sub">{search || priorityFilter || statusFilter ? 'Try adjusting your filters' : 'Create your first ticket using the button above'}</div>
                  </div>
                </td></tr>
              ) : filtered.map(ticket => (
                <tr key={ticket.ticket_number} className={rowClass(ticket)}>
                  <td><span className="ticket-id">{ticket.ticket_number}</span></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{ticket.device_type || '—'}</div>
                    {ticket.serial && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{ticket.serial}</div>}
                  </td>
                  <td><span className="issue-text">{ticket.issue_description || '—'}</span></td>
                  <td><PriorityCell priority={ticket.priority} /></td>
                  <td><StatusPill status={ticket.status} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {ticket.status === 'completed' ? fmtCost(ticket.actual_cost) : fmtCost(ticket.estimated_cost)}
                  </td>
                  <td><button className="action-btn view" onClick={() => openDetail(ticket)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew     && <NewTicketModal onClose={() => setShowNew(false)} onSubmit={createTicket} />}
      {showDetail  && <TicketDetailModal ticket={showDetail} onClose={() => setShowDetail(null)} onStatusChange={changeStatus} statusHistory={statusHistory} />}
      {showSupabase && <SupabaseModal onClose={() => setShowSupabase(false)} onSave={handleSupabaseSave} currentUrl={supaUrl} currentKey={supaKey} />}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
