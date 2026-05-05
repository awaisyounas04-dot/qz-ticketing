import { useState } from 'react';

const STATUS_META = {
  new:                { label: 'New',                   pill: 'intake',    queue: 'intake' },
  diagnosed:          { label: 'Diagnosed',             pill: 'intake',    queue: 'intake' },
  quote_sent:         { label: 'Quote Sent',            pill: 'intake',    queue: 'intake' },
  awaiting_approval:  { label: 'Awaiting Approval',     pill: 'awaiting',  queue: 'intake' },
  parts_sourced:      { label: 'Parts Sourced',         pill: 'approved',  queue: 'approved' },
  ready_for_delivery: { label: 'Ready for Delivery',    pill: 'approved',  queue: 'approved' },
  completed:          { label: 'Completed',             pill: 'completed', queue: 'completed' },
  rejected:           { label: 'Rejected – Non-Repairable', pill: 'rejected',  queue: 'rejected' },
  returned:           { label: 'Returned Without Repair',   pill: 'returned',  queue: 'returned' },
};

const INTAKE_FLOW   = ['new', 'diagnosed', 'quote_sent', 'awaiting_approval'];
const APPROVED_FLOW = ['parts_sourced', 'ready_for_delivery', 'completed'];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtCost(val) {
  if (!val && val !== 0) return '—';
  return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 2 });
}

const NEXT_LABELS = {
  diagnosed:          'Mark as Diagnosed',
  quote_sent:         'Mark Quote Sent',
  awaiting_approval:  'Send for Approval',
  parts_sourced:      'Mark Parts Sourced',
  ready_for_delivery: 'Mark Ready for Delivery',
  completed:          'Mark Completed',
};

export default function TicketDetailModal({ ticket, onClose, onStatusChange, statusHistory }) {
  const [completionData, setCompletionData] = useState({
    parts_cost:       ticket.parts_cost || '',
    labour_cost:      ticket.labour_cost || '',
    actual_cost:      ticket.actual_cost || '',
    completion_notes: ticket.completion_notes || '',
  });
  const [rejectionReason, setRejectionReason] = useState(ticket.rejection_reason || '');
  const [returnReason,    setReturnReason]    = useState(ticket.return_reason || '');
  const [showOutcome,     setShowOutcome]     = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const meta        = STATUS_META[ticket.status] || STATUS_META['new'];
  const isIntake    = INTAKE_FLOW.includes(ticket.status);
  const isApproved  = APPROVED_FLOW.slice(0, -1).includes(ticket.status);
  const isCompleted = ticket.status === 'completed';
  const isTerminal  = ['completed', 'rejected', 'returned'].includes(ticket.status);

  const nextIntake   = () => { const i = INTAKE_FLOW.indexOf(ticket.status);   return i >= 0 && i < INTAKE_FLOW.length   - 1 ? INTAKE_FLOW[i + 1]   : null; };
  const nextApproved = () => { const i = APPROVED_FLOW.indexOf(ticket.status); return i >= 0 && i < APPROVED_FLOW.length - 1 ? APPROVED_FLOW[i + 1] : null; };

  const handleAdvance = async (nextStatus, extra = {}) => {
    setSaving(true);
    await onStatusChange(ticket.ticket_number, nextStatus, extra);
    setSaving(false);
    onClose();
  };

  const handleOutcomeSubmit = async () => {
    if (!selectedOutcome) return;
    setSaving(true);
    if (selectedOutcome === 'completed') {
      const extra = { ...completionData };
      if (!extra.actual_cost && extra.parts_cost && extra.labour_cost) {
        extra.actual_cost = Number(extra.parts_cost) + Number(extra.labour_cost);
      }
      await onStatusChange(ticket.ticket_number, 'completed', extra);
    } else if (selectedOutcome === 'rejected') {
      await onStatusChange(ticket.ticket_number, 'rejected', { rejection_reason: rejectionReason });
    } else if (selectedOutcome === 'return_nr') {
      await onStatusChange(ticket.ticket_number, 'returned', { return_reason: returnReason });
    }
    setSaving(false);
    onClose();
  };

  const totalCost = () => {
    const p = Number(completionData.parts_cost) || 0;
    const l = Number(completionData.labour_cost) || 0;
    return p + l > 0 ? fmtCost(p + l) : '—';
  };

  const ni = nextIntake();
  const na = nextApproved();
  const canShowOutcome = ticket.status === 'ready_for_delivery' || isIntake || (isApproved && na === 'completed');

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
            <div className="detail-row"><span className="detail-key">Notes</span><span className="detail-val">{ticket.notes || '—'}</span></div>
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

          {/* Rejected reason */}
          {ticket.status === 'rejected' && ticket.rejection_reason && (
            <div className="detail-section">
              <div className="detail-section-title">Rejection Reason</div>
              <p style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>{ticket.rejection_reason}</p>
            </div>
          )}

          {/* Returned reason */}
          {ticket.status === 'returned' && ticket.return_reason && (
            <div className="detail-section">
              <div className="detail-section-title">Return Reason</div>
              <p style={{ fontSize: 13, color: '#7c3aed', lineHeight: 1.6 }}>{ticket.return_reason}</p>
            </div>
          )}

          {/* Outcome selector (when applicable) */}
          {!isTerminal && (showOutcome || canShowOutcome) && (
            <div className="outcome-section">
              <div className="outcome-section-title">Select Outcome</div>
              <div className="outcome-btn-group">
                <button className={`outcome-btn ${selectedOutcome === 'completed' ? 'selected complete' : ''}`} onClick={() => setSelectedOutcome('completed')}>
                  ✓ Completed
                </button>
                <button className={`outcome-btn ${selectedOutcome === 'rejected' ? 'selected reject' : ''}`} onClick={() => setSelectedOutcome('rejected')}>
                  ✕ Rejected – Non-Repairable
                </button>
                <button className={`outcome-btn ${selectedOutcome === 'return_nr' ? 'selected return_nr' : ''}`} onClick={() => setSelectedOutcome('return_nr')}>
                  ↩ Returned Without Repair
                </button>
              </div>

              {selectedOutcome === 'completed' && (
                <div className="form-grid" style={{ marginTop: 10 }}>
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
                    <label className="form-label">Total (override)</label>
                    <input className="form-input" type="number" placeholder="Auto-calculated"
                      value={completionData.actual_cost}
                      onChange={e => setCompletionData(d => ({ ...d, actual_cost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Computed</label>
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

              {selectedOutcome === 'rejected' && (
                <div className="form-group full" style={{ marginTop: 10 }}>
                  <label className="form-label">Rejection Reason (optional)</label>
                  <textarea className="form-input" placeholder="e.g. Beyond economical repair, parts unavailable..."
                    value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                </div>
              )}

              {selectedOutcome === 'return_nr' && (
                <div className="form-group full" style={{ marginTop: 10 }}>
                  <label className="form-label">Return Reason (optional)</label>
                  <textarea className="form-input" placeholder="e.g. Customer declined quote, requested return..."
                    value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          {statusHistory && statusHistory.length > 0 && (
            <div className="detail-section" style={{ marginTop: 16 }}>
              <div className="detail-section-title">Status History</div>
              <div className="history-timeline">
                {statusHistory.map((h, i) => (
                  <div key={i} className="history-item">
                    <span className="history-dot" />
                    <span className="history-text">
                      <strong>{STATUS_META[h.to_status]?.label || h.to_status}</strong>
                      {h.from_status && <> from {STATUS_META[h.from_status]?.label || h.from_status}</>}
                      {' — '}{fmtDate(h.changed_at)}
                      {h.notes && <> · {h.notes}</>}
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

          {/* Intake advance buttons */}
          {isIntake && ni && ni !== 'awaiting_approval' && !showOutcome && (
            <button className="btn-submit" style={{ background: '#1a6fc4' }} disabled={saving}
              onClick={() => handleAdvance(ni)}>
              {saving ? '...' : NEXT_LABELS[ni]}
            </button>
          )}
          {ticket.status === 'quote_sent' && !showOutcome && (
            <button className="btn-submit" style={{ background: '#b36b00' }} disabled={saving}
              onClick={() => handleAdvance('awaiting_approval')}>
              {saving ? '...' : 'Send for Approval'}
            </button>
          )}
          {ticket.status === 'awaiting_approval' && !showOutcome && (
            <button className="btn-submit" style={{ background: '#1e7e4a' }} disabled={saving}
              onClick={() => handleAdvance('parts_sourced')}>
              {saving ? '...' : '✓ Approve'}
            </button>
          )}

          {/* Approved queue advance (non-final steps) */}
          {isApproved && na && na !== 'completed' && !showOutcome && (
            <button className="btn-submit" style={{ background: '#0f6e56' }} disabled={saving}
              onClick={() => handleAdvance(na)}>
              {saving ? '...' : NEXT_LABELS[na]}
            </button>
          )}

          {/* Show outcome selector for any active ticket */}
          {!isTerminal && !showOutcome && (
            <button className="btn-submit" style={{ background: '#6b7280' }} onClick={() => setShowOutcome(true)}>
              Set Outcome ▾
            </button>
          )}

          {/* Confirm outcome */}
          {showOutcome && selectedOutcome && (
            <button
              className={selectedOutcome === 'rejected' ? 'btn-reject' : selectedOutcome === 'return_nr' ? 'btn-return' : 'btn-submit'}
              style={selectedOutcome === 'completed' ? { background: '#1e7e4a' } : {}}
              disabled={saving}
              onClick={handleOutcomeSubmit}>
              {saving ? '...' : selectedOutcome === 'completed' ? 'Confirm Completed' : selectedOutcome === 'rejected' ? 'Confirm Rejected' : 'Confirm Return'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
