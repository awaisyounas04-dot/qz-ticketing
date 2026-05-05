import { useState } from 'react';

const STATUS_META = {
  new:               { label: 'New',                pill: 'intake',    queue: 'intake' },
  diagnosed:         { label: 'Diagnosed',          pill: 'intake',    queue: 'intake' },
  quote_sent:        { label: 'Quote Sent',         pill: 'intake',    queue: 'intake' },
  awaiting_approval: { label: 'Awaiting Approval',  pill: 'approved',  queue: 'intake' },
  parts_sourced:     { label: 'Parts Sourced',      pill: 'approved',  queue: 'approved' },
  ready_for_delivery:{ label: 'Ready for Delivery', pill: 'approved',  queue: 'approved' },
  completed:         { label: 'Completed',          pill: 'completed', queue: 'completed' },
};

const INTAKE_FLOW = ['new', 'diagnosed', 'quote_sent', 'awaiting_approval'];
const APPROVED_FLOW = ['parts_sourced', 'ready_for_delivery', 'completed'];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtCost(val) {
  if (!val && val !== 0) return '—';
  return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 2 });
}

export default function TicketDetailModal({ ticket, onClose, onStatusChange }) {
  const [completionData, setCompletionData] = useState({
    parts_cost: ticket.parts_cost || '',
    labour_cost: ticket.labour_cost || '',
    actual_cost: ticket.actual_cost || '',
    completion_notes: ticket.completion_notes || '',
  });
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const meta = STATUS_META[ticket.status] || STATUS_META['new'];
  const isIntake = INTAKE_FLOW.includes(ticket.status);
  const isApproved = APPROVED_FLOW.slice(0, -1).includes(ticket.status);
  const isCompleted = ticket.status === 'completed';

  const nextIntakeStatus = () => {
    const idx = INTAKE_FLOW.indexOf(ticket.status);
    return idx >= 0 && idx < INTAKE_FLOW.length - 1 ? INTAKE_FLOW[idx + 1] : null;
  };

  const nextApprovedStatus = () => {
    const idx = APPROVED_FLOW.indexOf(ticket.status);
    return idx >= 0 && idx < APPROVED_FLOW.length - 1 ? APPROVED_FLOW[idx + 1] : null;
  };

  const handleAdvance = async (nextStatus) => {
    setSaving(true);
    const extra = nextStatus === 'completed' ? completionData : {};
    await onStatusChange(ticket.ticket_number, nextStatus, extra);
    setSaving(false);
    onClose();
  };

  const totalCost = () => {
    const p = Number(completionData.parts_cost) || 0;
    const l = Number(completionData.labour_cost) || 0;
    return p + l > 0 ? fmtCost(p + l) : '—';
  };

  const nextIntake = nextIntakeStatus();
  const nextApproved = nextApprovedStatus();

  const NEXT_LABELS = {
    diagnosed: 'Mark as Diagnosed',
    quote_sent: 'Mark Quote Sent',
    awaiting_approval: 'Send for Approval',
    parts_sourced: 'Mark Parts Sourced',
    ready_for_delivery: 'Mark Ready for Delivery',
    completed: 'Mark Completed',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <div>
            <span className="modal-title">{ticket.ticket_number}</span>
            <span className={`status-pill ${meta.pill}`} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
              <span className="dot" />{meta.label}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Device Info */}
          <div className="detail-section">
            <div className="detail-section-title">Device</div>
            <div className="detail-row"><span className="detail-key">Type</span><span className="detail-val">{ticket.device_type || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Serial / Model</span><span className="detail-val">{ticket.serial || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Issue</span><span className="detail-val" style={{ maxWidth: 340, textAlign: 'right' }}>{ticket.issue_description || '—'}</span></div>
          </div>

          {/* Repair Info */}
          <div className="detail-section">
            <div className="detail-section-title">Repair Details</div>
            <div className="detail-row"><span className="detail-key">Priority</span><span className="detail-val">{ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : 'Normal'}</span></div>
            <div className="detail-row"><span className="detail-key">Technician</span><span className="detail-val">{ticket.technician || '—'}</span></div>
            <div className="detail-row"><span className="detail-key">Estimated Cost</span><span className="detail-val">{fmtCost(ticket.estimated_cost)}</span></div>
            <div className="detail-row"><span className="detail-key">Notes</span><span className="detail-val">{ticket.notes || '—'}</span></div>
          </div>

          {/* Cost breakdown — only show if approved/completed */}
          {(isApproved || isCompleted) && (
            <div className="detail-section">
              <div className="detail-section-title">Cost Breakdown</div>
              {isCompleted ? (
                <>
                  <div className="detail-row"><span className="detail-key">Parts Cost</span><span className="detail-val">{fmtCost(ticket.parts_cost)}</span></div>
                  <div className="detail-row"><span className="detail-key">Labour Cost</span><span className="detail-val">{fmtCost(ticket.labour_cost)}</span></div>
                  <div className="detail-row" style={{ borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 4, paddingTop: 8 }}>
                    <span className="detail-key" style={{ fontWeight: 600 }}>Total Actual Cost</span>
                    <span className="detail-val" style={{ fontWeight: 600, color: '#1e7e4a' }}>{fmtCost(ticket.actual_cost)}</span>
                  </div>
                  {ticket.completion_notes && (
                    <div className="detail-row"><span className="detail-key">Completion Notes</span><span className="detail-val">{ticket.completion_notes}</span></div>
                  )}
                </>
              ) : (
                /* Editable cost fields when advancing to completed */
                nextApproved === 'completed' ? (
                  <div className="form-grid" style={{ marginTop: 8 }}>
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
                      <label className="form-label">Total Actual Cost (SAR)</label>
                      <input className="form-input" type="number" placeholder="Auto or override"
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
                ) : (
                  <>
                    <div className="detail-row"><span className="detail-key">Parts Cost</span><span className="detail-val">{fmtCost(ticket.parts_cost)}</span></div>
                    <div className="detail-row"><span className="detail-key">Labour Cost</span><span className="detail-val">{fmtCost(ticket.labour_cost)}</span></div>
                  </>
                )
              )}
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

          {/* Intake queue: advance through intake steps OR approve */}
          {isIntake && nextIntake && nextIntake !== 'awaiting_approval' && (
            <button className="btn-submit" style={{ background: '#1a6fc4' }} disabled={saving}
              onClick={() => handleAdvance(nextIntake)}>
              {saving ? '...' : NEXT_LABELS[nextIntake]}
            </button>
          )}
          {ticket.status === 'quote_sent' && (
            <button className="btn-submit" style={{ background: '#b36b00' }} disabled={saving}
              onClick={() => handleAdvance('awaiting_approval')}>
              {saving ? '...' : 'Send for Approval'}
            </button>
          )}
          {ticket.status === 'awaiting_approval' && (
            <button className="btn-submit" style={{ background: '#1e7e4a' }} disabled={saving}
              onClick={() => handleAdvance('parts_sourced')}>
              {saving ? '...' : '✓ Approve — Move to Approved Queue'}
            </button>
          )}

          {/* Approved queue: advance */}
          {isApproved && nextApproved && (
            <button className="btn-submit"
              style={{ background: nextApproved === 'completed' ? '#1e7e4a' : '#0f6e56' }}
              disabled={saving}
              onClick={() => handleAdvance(nextApproved)}>
              {saving ? '...' : NEXT_LABELS[nextApproved]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
