import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import NewTicketModal from './components/NewTicketModal';
import TicketDetailModal from './components/TicketDetailModal';
import SupabaseModal from './components/SupabaseModal';
import ToastContainer from './components/Toast';
import { useToast } from './lib/useToast';

// ── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
  return 'QZ-' + String(Date.now()).slice(-6) + Math.floor(Math.random() * 10);
}

function fmtCost(val) {
  if (!val) return '—';
  return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 0 });
}

function StatusPill({ status }) {
  const labels = { intake: 'Intake', approved: 'Approved', completed: 'Completed' };
  return (
    <span className={`status-pill ${status}`}>
      <span className="dot" />
      {labels[status] || status}
    </span>
  );
}

function PriorityCell({ priority }) {
  const label = (priority || 'normal');
  return (
    <div className="priority-wrap">
      <span className={`priority-dot ${label}`} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </div>
  );
}

// ── Demo seed data ────────────────────────────────────────────────────────────
const DEMO_TICKETS = [
  { ticket_number: 'QZ-100001', customer_name: 'Saudi Aramco', contact: '+966 13 872 0000', device_type: 'Siemens S7-400 PLC', serial: '6ES7 412-2XK07', issue_description: 'CPU module not booting, fault LED active', priority: 'high', technician: 'Ahmad K.', estimated_cost: 4500, actual_cost: null, notes: 'Customer needs urgent turnaround', status: 'intake', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100002', customer_name: 'SABIC', contact: '+966 12 422 5000', device_type: 'Allen Bradley CompactLogix', serial: '1769-L36ERMS', issue_description: 'I/O card replacement and re-configuration required', priority: 'normal', technician: 'Omar S.', estimated_cost: 1800, actual_cost: null, notes: '', status: 'approved', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100003', customer_name: 'Retech Systems', contact: '+966 11 234 5678', device_type: 'Beckhoff CP2621-0000', serial: 'CP2621-0000', issue_description: 'HMI touch screen unresponsive, cracked panel', priority: 'normal', technician: 'Ahmad K.', estimated_cost: 2200, actual_cost: 2100, notes: 'Part sourced from Germany', status: 'completed', created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { ticket_number: 'QZ-100004', customer_name: 'Ma\'aden', contact: '', device_type: 'ABB ACS880 Drive', serial: '', issue_description: 'Overcurrent fault on startup, IGBT suspected', priority: 'high', technician: '', estimated_cost: 7200, actual_cost: null, notes: '', status: 'intake', created_at: new Date(Date.now() - 1 * 86400000).toISOString(), updated_at: new Date().toISOString() },
];

const TAB_LABELS = { all: 'All Tickets', intake: 'Intake Queue', approved: 'Approved — In Progress', completed: 'Completed' };

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showSupabase, setShowSupabase] = useState(false);

  const [supaUrl, setSupaUrl] = useState(() => localStorage.getItem('qz_supa_url') || process.env.REACT_APP_SUPABASE_URL || '');
  const [supaKey, setSupaKey] = useState(() => localStorage.getItem('qz_supa_key') || process.env.REACT_APP_SUPABASE_ANON_KEY || '');
  const [connected, setConnected] = useState(false);
  const [connLabel, setConnLabel] = useState('Local mode');

  const supaRef = useRef(null);
  const { toasts, addToast } = useToast();

  // ── Init Supabase or local ────────────────────────────────────────────────
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
      // Realtime subscription
      client.channel('tickets-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new, ...prev.filter(t => t.ticket_number !== payload.new.ticket_number)]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(t => t.ticket_number === payload.new.ticket_number ? payload.new : t));
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.ticket_number !== payload.old.ticket_number));
          }
        })
        .subscribe();
    } catch (e) {
      console.error('Supabase init error:', e);
      setConnected(false);
      setConnLabel('Connection failed — using local mode');
      const local = JSON.parse(localStorage.getItem('qz_tickets_local') || 'null');
      setTickets(local || DEMO_TICKETS);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initSupabase(supaUrl, supaKey);
  }, []); // eslint-disable-line

  // ── Persist local tickets ─────────────────────────────────────────────────
  useEffect(() => {
    if (!connected) localStorage.setItem('qz_tickets_local', JSON.stringify(tickets));
  }, [tickets, connected]);

  // ── Create ticket ─────────────────────────────────────────────────────────
  const createTicket = useCallback(async (form) => {
    const ticket = {
      ticket_number: genId(),
      customer_name: form.customer_name.trim(),
      contact: form.contact.trim(),
      device_type: form.device_type.trim(),
      serial: form.serial.trim(),
      issue_description: form.issue_description.trim(),
      priority: form.priority,
      technician: form.technician.trim(),
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      actual_cost: null,
      notes: form.notes.trim(),
      status: 'intake',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supaRef.current) {
      const { data, error } = await supaRef.current.from('tickets').insert(ticket).select().single();
      if (error) throw error;
      setTickets(prev => [data, ...prev]);
    } else {
      setTickets(prev => [ticket, ...prev]);
    }
    addToast('Ticket created: ' + ticket.ticket_number, 'success');
  }, [addToast]);

  // ── Change status ─────────────────────────────────────────────────────────
  const changeStatus = useCallback(async (ticketNumber, newStatus) => {
    const updated_at = new Date().toISOString();
    if (supaRef.current) {
      const { error } = await supaRef.current.from('tickets').update({ status: newStatus, updated_at }).eq('ticket_number', ticketNumber);
      if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
    }
    setTickets(prev => prev.map(t => t.ticket_number === ticketNumber ? { ...t, status: newStatus, updated_at } : t));
    const labels = { approved: 'Ticket approved', completed: 'Ticket marked completed' };
    addToast(labels[newStatus] || 'Status updated', 'success');
  }, [addToast]);

  // ── Connect Supabase ──────────────────────────────────────────────────────
  const handleSupabaseSave = useCallback((url, key) => {
    localStorage.setItem('qz_supa_url', url);
    localStorage.setItem('qz_supa_key', key);
    setSupaUrl(url); setSupaKey(key);
    setLoading(true);
    initSupabase(url, key);
    addToast('Supabase connected', 'success');
  }, [initSupabase, addToast]);

  // ── Filtered tickets ──────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    if (tab !== 'all' && t.status !== tab) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.customer_name?.toLowerCase().includes(s) &&
        !t.device_type?.toLowerCase().includes(s) &&
        !t.ticket_number?.toLowerCase().includes(s) &&
        !t.technician?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const intake = tickets.filter(t => t.status === 'intake').length;
  const approved = tickets.filter(t => t.status === 'approved').length;
  const completed = tickets.filter(t => t.status === 'completed').length;
  const revenue = tickets.filter(t => t.status === 'completed' && t.actual_cost).reduce((a, t) => a + Number(t.actual_cost), 0);

  // ── Render ────────────────────────────────────────────────────────────────
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
          <div className="connection-badge" onClick={() => setShowSupabase(true)} title="Configure Supabase">
            <span className={`conn-dot ${connected ? 'live' : ''}`} />
            {connLabel}
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Ticket</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="nav">
        {['all', 'intake', 'approved', 'completed'].map(t => (
          <div key={t} className={`nav-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All Tickets' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={`tab-badge ${(t === 'intake' || t === 'approved') ? 'hot' : ''}`}>
              {t === 'all' ? tickets.length : t === 'intake' ? intake : t === 'approved' ? approved : completed}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card s-intake">
            <div className="stat-label">Intake</div>
            <div className="stat-val">{intake}</div>
            <div className="stat-sub">Awaiting approval</div>
          </div>
          <div className="stat-card s-approved">
            <div className="stat-label">Approved</div>
            <div className="stat-val">{approved}</div>
            <div className="stat-sub">In progress</div>
          </div>
          <div className="stat-card s-completed">
            <div className="stat-label">Completed</div>
            <div className="stat-val">{completed}</div>
            <div className="stat-sub">All time</div>
          </div>
          <div className="stat-card s-revenue">
            <div className="stat-label">Revenue</div>
            <div className="stat-val" style={{ fontSize: 22 }}>
              {revenue > 0 ? 'SAR ' + revenue.toLocaleString('en-SA') : '—'}
            </div>
            <div className="stat-sub">From completed jobs</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <span className="toolbar-title">{TAB_LABELS[tab]}</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="toolbar-right">
            <input
              className="search-input"
              type="text"
              placeholder="Search customer, device, ticket #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-sel" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
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
                <th style={{ width: 160 }}>Customer</th>
                <th style={{ width: 150 }}>Device</th>
                <th>Issue</th>
                <th style={{ width: 95 }}>Priority</th>
                <th style={{ width: 105 }}>Status</th>
                <th style={{ width: 110 }}>Est. Cost</th>
                <th style={{ width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>Loading tickets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-label">No tickets found</div>
                    <div className="empty-sub">
                      {search || priorityFilter ? 'Try adjusting your filters' : 'Create your first ticket using the button above'}
                    </div>
                  </div>
                </td></tr>
              ) : (
                filtered.map(ticket => (
                  <tr key={ticket.ticket_number}>
                    <td><span className="ticket-id">{ticket.ticket_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{ticket.customer_name}</td>
                    <td><span className="device-chip">{ticket.device_type || '—'}</span></td>
                    <td><span className="issue-text">{ticket.issue_description || '—'}</span></td>
                    <td><PriorityCell priority={ticket.priority} /></td>
                    <td><StatusPill status={ticket.status} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtCost(ticket.estimated_cost)}</td>
                    <td>
                      <div className="action-wrap">
                        <button className="action-btn view" onClick={() => setShowDetail(ticket)}>View</button>
                        {ticket.status === 'intake' && (
                          <button className="action-btn approve" onClick={() => changeStatus(ticket.ticket_number, 'approved')}>Approve</button>
                        )}
                        {ticket.status === 'approved' && (
                          <button className="action-btn complete" onClick={() => changeStatus(ticket.ticket_number, 'completed')}>Complete</button>
                        )}
                        {ticket.status === 'completed' && (
                          <span className="done-label">✓ Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSubmit={createTicket} />}
      {showDetail && <TicketDetailModal ticket={showDetail} onClose={() => setShowDetail(null)} onStatusChange={changeStatus} />}
      {showSupabase && (
        <SupabaseModal
          onClose={() => setShowSupabase(false)}
          onSave={handleSupabaseSave}
          currentUrl={supaUrl}
          currentKey={supaKey}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
