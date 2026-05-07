import { useState, useEffect } from 'react';

const EMPTY = {
  device_type: '',
  serial: '',
  issue_description: '',
  priority: 'normal',
  technician: '',
  estimated_cost: '',
  notes: ''
};

export default function NewTicketModal({ onClose, onSubmit, existingTickets = [], editTicket = null }) {
  const isEdit = !!editTicket;
  const [form, setForm] = useState(isEdit ? {
    device_type: editTicket.device_type || '',
    serial: editTicket.serial || '',
    issue_description: editTicket.issue_description || '',
    priority: editTicket.priority || 'normal',
    technician: editTicket.technician || '',
    estimated_cost: editTicket.estimated_cost || '',
    notes: editTicket.notes || '',
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTicket) {
      setForm({
        device_type: editTicket.device_type || '',
        serial: editTicket.serial || '',
        issue_description: editTicket.issue_description || '',
        priority: editTicket.priority || 'normal',
        technician: editTicket.technician || '',
        estimated_cost: editTicket.estimated_cost || '',
        notes: editTicket.notes || '',
      });
    }
  }, [editTicket]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.device_type.trim()) { setError('Device type is required.'); return; }
    if (!form.issue_description.trim()) { setError('Issue description is required.'); return; }

    // Duplicate serial check (only if serial is provided)
    if (form.serial.trim()) {
      const duplicate = existingTickets.find(t => {
        if (isEdit && t.ticket_number === editTicket.ticket_number) return false; // skip self
        return t.serial && t.serial.trim().toLowerCase() === form.serial.trim().toLowerCase();
      });
      if (duplicate) {
        setError(`Serial number "${form.serial.trim()}" already exists on ticket ${duplicate.ticket_number} (${duplicate.device_type}). Please check before proceeding.`);
        return;
      }
    }

    setSaving(true); setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save ticket.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">{isEdit ? `Edit Ticket — ${editTicket.ticket_number}` : 'New Repair Ticket'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Device Type *</label>
              <input className="form-input" value={form.device_type} onChange={e => set('device_type', e.target.value)} placeholder="e.g. Siemens PLC S7-400, Beckhoff CP2621" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Serial / Model #</label>
              <input className="form-input" value={form.serial} onChange={e => { set('serial', e.target.value); setError(''); }} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Issue Description *</label>
              <textarea className="form-input" value={form.issue_description} onChange={e => set('issue_description', e.target.value)} placeholder="Describe the fault or repair needed..." />
            </div>
            <div className="form-group">
              <label className="form-label">Technician</label>
              <input className="form-input" value={form.technician} onChange={e => set('technician', e.target.value)} placeholder="Assign technician" />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Cost (SAR)</label>
              <input className="form-input" type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group full">
              <label className="form-label">Internal Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional internal notes..." />
            </div>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 7, fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
              ⚠ {error}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={saving}>
            {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Ticket')}
          </button>
        </div>
      </div>
    </div>
  );
}
