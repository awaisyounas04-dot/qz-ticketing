import { useState } from 'react';

export default function SupabaseModal({ onClose, onSave, currentUrl, currentKey }) {
  const [url, setUrl] = useState(currentUrl || '');
  const [key, setKey] = useState(currentKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handleSave = async () => {
    if (!url.trim() || !key.trim()) { setTestResult('Both fields are required.'); return; }
    setTesting(true); setTestResult('');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(url.trim(), key.trim());
      const { error } = await client.from('tickets').select('ticket_number').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      setTestResult('✓ Connection successful!');
      onSave(url.trim(), key.trim());
      setTimeout(onClose, 800);
    } catch (e) {
      setTestResult('✕ ' + (e.message || 'Connection failed. Check your URL and key.'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">Supabase Configuration</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Project URL</label>
              <input className="form-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co" />
            </div>
            <div className="form-group full">
              <label className="form-label">Anon / Public Key</label>
              <input className="form-input" value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
            </div>
          </div>
          {testResult && (
            <p style={{ marginTop: 10, fontSize: 13, color: testResult.startsWith('✓') ? '#1e7e4a' : '#e24b4a', fontWeight: 500 }}>
              {testResult}
            </p>
          )}
          <div className="sup-info">
            Find these in your Supabase project → <code>Settings → API</code>.
            Make sure you've run the SQL schema to create the <code>tickets</code> table first.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={handleSave} disabled={testing}>
            {testing ? 'Testing...' : 'Save & Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
