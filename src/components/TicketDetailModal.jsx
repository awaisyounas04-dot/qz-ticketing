import { useState } from 'react';

const STATUS_META = {
  new:               { label: 'New',                pill: 'intake',    queue: 'intake' },
  diagnosed:         { label: 'Diagnosed',          pill: 'intake',    queue: 'intake' },
  quote_sent:        { label: 'Quote Sent',         pill: 'intake',    queue: 'intake' },
  awaiting_approval: { label: 'Awaiting Approval',  pill: 'awaiting',  queue: 'intake' },
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
        </div>
      </div>
    </div>
  );
}
