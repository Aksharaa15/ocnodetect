import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { getProfile, updateProfile, clearAllCases } from '../api/api';
import {
  User, Building, Stethoscope, Edit2, Check, X,
  Trash2, LogOut, Bookmark, ChevronRight,
  AlertTriangle, ShieldCheck, Bell, Sparkles
} from 'lucide-react';

function getInitials(name: string) {
  const clean = name.startsWith('Dr. ') ? name.slice(4) : name;
  const parts = clean.trim().split(/\s+/);
  if (!parts[0]) return '??';
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Profile() {
  const { userProfile, setUserProfile, logout, savedCases, setSavedCases, setActiveCase, showToast, removeSavedCase } = useApp();
  const [stats, setStats] = useState<{ l: string; v: string }[]>([]);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [saving, setSaving] = useState(false);

  const [showSaved, setShowSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearTyped, setClearTyped] = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getProfile().then(d => {
      setUserProfile(d.userProfile);
      setStats(d.stats);
    }).catch(() => {});
  }, []);

  const startEdit = () => {
    setEditName(userProfile.name);
    setEditSpecialty(userProfile.specialty);
    setEditInstitution(userProfile.institution);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editSpecialty.trim() || !editInstitution.trim()) {
      showToast('All fields are required.', 'error'); return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: editName.trim(), specialty: editSpecialty.trim(), institution: editInstitution.trim() });
      setUserProfile({ name: editName.trim(), specialty: editSpecialty.trim(), institution: editInstitution.trim() });
      setEditing(false);
      showToast('Profile updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Update failed.', 'error');
    } finally { setSaving(false); }
  };

  const handleClearAll = async () => {
    if (clearTyped !== 'DELETE') { showToast('Type DELETE to confirm.', 'error'); return; }
    setClearing(true);
    try {
      await clearAllCases();
      setSavedCases([]);
      setActiveCase(null);
      setClearTyped('');
      setShowClearConfirm(false);
      showToast('All case data cleared.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Clear failed.', 'error');
    } finally { setClearing(false); }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(7,14,26,0.85) 100%)', border: '1px solid var(--border-strong)' }}>
        <div style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #0284C7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 24px rgba(14,165,233,0.4)',
              border: '3px solid rgba(255,255,255,0.15)'
            }}>
              <span style={{ margin: 'auto' }}>{getInitials(userProfile.name)}</span>
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                <ShieldCheck size={12} /> Verified Clinician
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>{userProfile.name}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span><Stethoscope size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--primary)' }} />{userProfile.specialty}</span>
                <span>&bull;</span>
                <span><Building size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--fg-muted)' }} />{userProfile.institution}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {!editing ? (
              <button className="btn btn-secondary" onClick={startEdit}>
                <Edit2 size={14} /> Edit Profile
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
            )}
            <button className="btn btn-danger" onClick={logout} style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Edit Form Drawer inside header */}
        {editing && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '24px 36px', background: 'rgba(7,14,26,0.95)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="input-label"><User size={11} style={{ display: 'inline', marginRight: 4 }} />Full Name</label>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label"><Stethoscope size={11} style={{ display: 'inline', marginRight: 4 }} />Specialty</label>
                <input className="input" value={editSpecialty} onChange={e => setEditSpecialty(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label"><Building size={11} style={{ display: 'inline', marginRight: 4 }} />Institution</label>
                <input className="input" value={editInstitution} onChange={e => setEditInstitution(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? <span className="spinner" /> : <><Check size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.l} className="card" style={{ padding: '20px 24px', textAlign: 'center', background: 'rgba(12,22,36,0.6)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 4, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* 2-Column Split Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column: Clinician Details & Account Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <User size={16} color="var(--primary)" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Clinician Details</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Holder</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{userProfile.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medical Specialty</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{userProfile.specialty}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Hospital / Center</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{userProfile.institution}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staging Protocol Standard</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} /> AJCC 8th Edition &amp; NCCN 2024
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Case Registry & Danger Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Access */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
              <Bookmark size={16} color="var(--primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Case Registry</h3>
            </div>

            <div className="account-list">
              <div className="account-row" onClick={() => setShowSaved(true)}>
                <div className="account-row-icon"><Bookmark size={15} color="var(--primary)" /></div>
                <div style={{ flex: 1 }}>
                  <div className="account-row-label">Saved Patient Cases</div>
                  <div className="account-row-hint">{savedCases.length} cases in registry</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, background: 'var(--primary-dim)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>{savedCases.length}</span>
                  <ChevronRight size={14} color="var(--fg-dim)" />
                </div>
              </div>

              <div className="account-row">
                <div className="account-row-icon"><Bell size={15} color="var(--fg-secondary)" /></div>
                <div style={{ flex: 1 }}>
                  <div className="account-row-label">Notifications &amp; Alerts</div>
                  <div className="account-row-hint">MDT tumor board reminders</div>
                </div>
                <ChevronRight size={14} color="var(--fg-dim)" />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="danger-zone" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={16} color="var(--danger)" />
              <span className="danger-title">Danger Zone</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--fg-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Permanently purge all case registry records. This action cannot be undone.
            </p>
            {!showClearConfirm ? (
              <button className="btn btn-danger btn-sm" onClick={() => setShowClearConfirm(true)}>
                <Trash2 size={13} /> Clear All Case Data
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--danger)' }}>Type <strong>DELETE</strong> to confirm:</p>
                <input
                  className="input"
                  placeholder="Type DELETE"
                  value={clearTyped}
                  onChange={e => setClearTyped(e.target.value)}
                  style={{ borderColor: 'var(--danger)', maxWidth: 260, padding: '6px 10px', fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={clearing || clearTyped !== 'DELETE'}>
                    {clearing ? <span className="spinner" /> : 'Confirm Delete'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setShowClearConfirm(false); setClearTyped(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Cases Modal */}
      {showSaved && (
        <div className="modal-backdrop" onClick={() => setShowSaved(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title">Saved Patient Cases ({savedCases.length})</h2>
              <button className="btn-icon" style={{ border: 'none', padding: 6 }} onClick={() => setShowSaved(false)}><X size={15} /></button>
            </div>
            {savedCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-muted)', fontSize: 13 }}>No saved cases found.</div>
            ) : (
              <div className="case-list">
                {savedCases.map((c) => (
                  <div key={c.patientId} className="case-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="case-id">{c.patientId}</span>
                        <span style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, color: 'var(--fg-secondary)' }}>{c.site}</span>
                        <span style={{ fontSize: 10, background: 'var(--primary-dim)', padding: '1px 6px', borderRadius: 4, color: 'var(--primary)', fontWeight: 600 }}>{c.tnm}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.date || 'Saved'}</div>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 6 }}
                      onClick={() => removeSavedCase(c.patientId)}
                    ><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
