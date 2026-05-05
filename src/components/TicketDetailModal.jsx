const STATUS_LABELS = { intake: 'Intake', approved: 'Approved', completed: 'Completed' };
const PRIORITY_LABELS = { high: 'High', normal: 'Normal', low: 'Low' };

function fmt(val) {
  if (!val) return '—';
  return val;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtCost(val) {
  if (!val) return '—';
  return 'SAR ' + Number(val).toLocaleString('en-SA', { minimumFractionDigits: 2 });
}

export default function TicketDetailModal({ ticket, onClose, onStatusChange }) {
  if (!ticket) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <span className="modal-title">Ticket {ticket.ticket_number}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <div className="detail-section-title">Customer</div>
            <div className="detail-row"><span className="detail-key">Name</span><span className="detail-val">{fmt(ticket.customer_name)}</span></div>
            <div className="detail-row"><span className="detail-key">Contact</span><span className="detail-val">{fmt(ticket.contact)}</span></div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Device</div>
            <div className="detail-row"><span className="detail-key">Type</span><span className="detail-val">{fmt(ticket.device_type)}</span></div>
            <div className="detail-row"><span className="detail-key">Serial / Model</span><span className="detail-val">{fmt(ticket.serial)}</span></div>
            <div className="detail-row"><span className="detail-key">Issue</span><span className="detail-val" style={{maxWidth:320,textAlign:'right'}}>{fmt(ticket.issue_description)}</span></div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Repair Details</div>
            <div className="detail-row"><span className="detail-key">Status</span><span className="detail-val"><span className={`status-pill ${ticket.status}`}><span className="dot" />{STATUS_LABELS[ticket.status]}</span></span></div>
            <div className="detail-row"><span className="detail-key">Priority</span><span className="detail-val">{PRIORITY_LABELS[ticket.priority] || 'Normal'}</span></div>
            <div className="detail-row"><span className="detail-key">Technician</span><span className="detail-val">{fmt(ticket.technician)}</span></div>
            <div className="detail-row"><span className="detail-key">Estimated Cost</span><span className="detail-val">{fmtCost(ticket.estimated_cost)}</span></div>
            <div className="detail-row"><span className="detail-key">Actual Cost</span><span className="detail-val">{fmtCost(ticket.actual_cost)}</span></div>
            <div className="detail-row"><span className="detail-key">Notes</span><span className="detail-val">{fmt(ticket.notes)}</span></div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Timeline</div>
            <div className="detail-row"><span className="detail-key">Created</span><span className="detail-val">{fmtDate(ticket.created_at)}</span></div>
            <div className="detail-row"><span className="detail-key">Last Updated</span><span className="detail-val">{fmtDate(ticket.updated_at)}</span></div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          {ticket.status === 'intake' && (
            <button className="btn-submit" style={{background:'#b36b00'}} onClick={() => { onStatusChange(ticket.ticket_number, 'approved'); onClose(); }}>
              Approve Ticket
            </button>
          )}
          {ticket.status === 'approved' && (
            <button className="btn-submit" style={{background:'#1e7e4a'}} onClick={() => { onStatusChange(ticket.ticket_number, 'completed'); onClose(); }}>
              Mark Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
