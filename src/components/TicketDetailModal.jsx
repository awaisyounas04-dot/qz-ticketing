import { useState } from 'react';

const STATUS_META = {
  new:                { label: 'New',                        pill: 'intake' },
  diagnosed:          { label: 'Diagnosed',                  pill: 'intake' },
  quote_sent:         { label: 'Quote Sent',                 pill: 'intake' },
  awaiting_approval:  { label: 'Awaiting Approval',          pill: 'awaiting' },
  parts_sourced:      { label: 'Parts Sourced',              pill: 'approved' },
  ready_for_delivery: { label: 'Ready for Delivery',         pill: 'approved' },
  completed:          { label: 'Completed',                  pill: 'completed' },
  rejected:           { label: 'Rejected – Non-Repairable',  pill: 'rejected' },
  returned:           { label: 'Returned Without Repair',    pill: 'returned' },
};

const TRANSITIONS = {
  new:                ['diagnosed', 'rejected', 'returned'],
  diagnosed:          ['quote_sent', 'rejected', 'returned'],
  quote_sent:         ['awaiting_approval', 'rejected', 'returned'],
  awaiting_approval:  ['parts_sourced', 'rejected', 'returned'],
  parts_sourced:      ['ready_for_delivery', 'rejected', 'returned'],
  ready_for_delivery: ['completed', 'rejected', 'returned'],
  completed:          [],
  rejected:           [],
  returned:           [],
};

const TRANSITION_LABELS = {
  diagnosed:          'Diagnosed',
  quote_sent:         'Quote Sent',
  awaiting_approval:  'Awaiting Approval → Move to Approved Queue',
  parts_sourced:      'Parts Sourced',
  ready_for_delivery: 'Ready for Delivery',
  completed:          'Completed',
  rejected:           'Rejected – Non-Repairable',
  returned:           'Returned Without Repair',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtCost(val) {
  if (!val && val !== 0) return '—';
  return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 2 });
}

export default function TicketDetailModal({ ticket, onClose, onStatusChange, statusHistory, onEdit }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [completionData, setCompletionData] = useState({
    parts_cost: ticket.parts_cost || '',
    labour_cost: ticket.labour_cost || '',
    actual_cost: ticket.actual_cost || '',
    completion_notes: ticket.completion_notes || '',
  });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!ticket) return null;

  const meta = STATUS_META[ticket.status] || STATUS_META['new'];
  const transitions = TRANSITIONS[ticket.status] || [];
  const isTerminal = transitions.length === 0;
  const isCompleted = ticket.status === 'completed';

  const totalCost = () => {
    const p = Number(completionData.parts_cost) || 0;
    const l = Number(completionData.labour_cost) || 0;
    return p + l > 0 ? fmtCost(p + l) : '—';
  };

  const handleUpdate = async () => {
    if (!selectedStatus) { setError('Please select a status.'); return; }
    setSaving(true); setError('');
    try {
      const extra = {};
      if (selectedStatus === 'completed') {
        const pc = completionData.parts_cost ? Number(completionData.parts_cost) : null;
        const lc = completionData.labour_cost ? Number(completionData.labour_cost) : null;
        const ac = completionData.actual_cost ? Number(completionData.actual_cost) : (pc && lc ? pc + lc : pc || lc || null);
        Object.assign(extra, { parts_cost: pc, labour_cost: lc, actual_cost: ac, completion_notes: completionData.completion_notes || null });
      }
      if (selectedStatus === 'rejected') extra.rejection_reason = reason || null;
      if (selectedStatus === 'returned') extra.return_reason = reason || null;
      await onStatusChange(ticket.ticket_number, selectedStatus, extra);
      onClose();
    } catch (e) {
      setError(e.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const btnStyle = () => {
    if (selectedStatus === 'completed')         return { background: '#1e7e4a' };
    if (selectedStatus === 'rejected')          return { background: '#b91c1c' };
    if (selectedStatus === 'returned')          return { background: '#7c3aed' };
    if (selectedStatus === 'awaiting_approval') return { background: '#b36b00' };
    return { background: '#1a6fc4' };
  };

  const btnLabel = () => {
    if (!selectedStatus)                        return 'Update Status';
    if (selectedStatus === 'completed')         return 'Mark Completed';
    if (selectedStatus === 'rejected')          return 'Mark Rejected';
    if (selectedStatus === 'returned')          return 'Mark Returned';
    if (selectedStatus === 'awaiting_approval') return 'Approve & Move to Approved Queue';
    return 'Update Status';
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="modal-title">{ticket.ticket_number}</span>
            <span className={`status-pill ${meta.pill}`}><span className="dot" />{meta.label}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Device */}
          <div className="detail-section">
            <div className="detail-section-title">Device</div>
            <div className="detail-row"><span className="detail-key">Type</span><span className="detail-val">{ticket.device_type || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Serial / Model</span><span className="detail-val">{ticket.serial || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Issue</span><span className="detail-val" style={{ maxWidth: 340, textAlign: 'right' }}>{ticket.issue_description || '—'}</span></div>
          </div>

          {/* Repair Details */}
          <div className="detail-section">
            <div className="detail-section-title">Repair Details</div>
            <div className="detail-row"><span className="detail-key">Priority</span><span className="detail-val">{ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : 'Normal'}</span></div>
            <div className="detail-row"><span className="detail-key">Technician</span><span className="detail-val">{ticket.technician || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Estimated Cost</span><span className="detail-val">{fmtCost(ticket.estimated_cost)}</span></div>
            {ticket.notes && <div className="detail-row"><span className="detail-key">Notes</span><span className="detail-val">{ticket.notes}</span></div>}
          </div>

          {/* Completed cost breakdown */}
          {isCompleted && (
            <div className="detail-section">
              <div className="detail-section-title">Cost Breakdown</div>
              <div className="detail-row"><span className="detail-key">Parts Cost</span><span className="detail-val">{fmtCost(ticket.parts_cost)}</span></div>
              <div className="detail-row"><span className="detail-key">Labour Cost</span><span className="detail-val">{fmtCost(ticket.labour_cost)}</span></div>
              <div className="detail-row" style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', marginTop: 4, paddingTop: 8 }}>
                <span className="detail-key" style={{ fontWeight: 600 }}>Total Expenses</span>
                <span className="detail-val" style={{ fontWeight: 600, color: '#1e7e4a' }}>{fmtCost(ticket.actual_cost)}</span>
              </div>
              {ticket.completion_notes && <div className="detail-row"><span className="detail-key">Notes</span><span className="detail-val">{ticket.completion_notes}</span></div>}
            </div>
          )}

          {/* Rejection reason */}
          {ticket.status === 'rejected' && ticket.rejection_reason && (
            <div className="detail-section">
              <div className="detail-section-title">Rejection Reason</div>
              <p style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{ticket.rejection_reason}</p>
            </div>
          )}

          {/* Return reason */}
          {ticket.status === 'returned' && ticket.return_reason && (
            <div className="detail-section">
              <div className="detail-section-title">Return Reason</div>
              <p style={{ fontSize: 13, color: '#7c3aed', lineHeight: 1.6 }}>{ticket.return_reason}</p>
            </div>
          )}

          {/* Status update dropdown */}
          {!isTerminal && (
            <div className="detail-section">
              <div className="detail-section-title">Update Status</div>
              <select className="form-select" value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setReason(''); setError(''); }}>
                <option value="">— Select next status —</option>
                {transitions.map(s => (
                  <option key={s} value={s}>{TRANSITION_LABELS[s]}</option>
                ))}
              </select>

              {selectedStatus === 'completed' && (
                <div className="form-grid" style={{ marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Parts Cost (SAR)</label>
                    <input className="form-input" type="number" placeholder="0.00"
                      value={completionData.parts_cost}
                      onChange={e => setCompletionData(d => ({ ...d, parts_cost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Labour Cost (SAR)</label>
                    <input className="form-input" type="number" placeholder="0.00"
                      value={completionData.labour_cost}
                      onChange={e => setCompletionData(d => ({ ...d, labour_cost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Override (SAR)</label>
                    <input className="form-input" type="number" placeholder="Auto-calculated"
                      value={completionData.actual_cost}
                      onChange={e => setCompletionData(d => ({ ...d, actual_cost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Computed Total</label>
                    <div style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#1e7e4a' }}>{totalCost()}</div>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Completion Notes</label>
                    <textarea className="form-input" placeholder="Final notes, warranty info..."
                      value={completionData.completion_notes}
                      onChange={e => setCompletionData(d => ({ ...d, completion_notes: e.target.value }))} />
                  </div>
                </div>
              )}

              {selectedStatus === 'rejected' && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Rejection Reason (optional)</label>
                  <textarea className="form-input" placeholder="e.g. Beyond economical repair, parts unavailable..."
                    value={reason} onChange={e => setReason(e.target.value)} />
                </div>
              )}

              {selectedStatus === 'returned' && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Return Reason (optional)</label>
                  <textarea className="form-input" placeholder="e.g. Customer declined quote, requested return..."
                    value={reason} onChange={e => setReason(e.target.value)} />
                </div>
              )}

              {error && <p style={{ color: '#e24b4a', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>
          )}

          {/* Status History */}
          {statusHistory && statusHistory.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Status History</div>
              <div className="history-timeline">
                {statusHistory.map((h, i) => (
                  <div key={i} className="history-item">
                    <span className="history-dot" />
                    <span className="history-text">
                      <strong>{STATUS_META[h.to_status]?.label || h.to_status}</strong>
                      {h.from_status ? <> — from {STATUS_META[h.from_status]?.label || h.from_status}</> : ' — Initial status'}
                      {' · '}{fmtDate(h.changed_at)}
                      {h.notes && <> · "{h.notes}"</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="detail-section">
            <div className="detail-section-title">Timeline</div>
            <div className="detail-row"><span className="detail-key">Created</span><span className="detail-val">{fmtDate(ticket.created_at)}</span></div>
            <div className="detail-row"><span className="detail-key">Last Updated</span><span className="detail-val">{fmtDate(ticket.updated_at)}</span></div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-edit" onClick={() => { onClose(); onEdit(ticket); }}>✎ Edit Ticket</button>
          {!isTerminal && (
            <button className="btn-submit" style={btnStyle()} disabled={saving || !selectedStatus} onClick={handleUpdate}>
              {saving ? 'Saving...' : btnLabel()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
