import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { getClinicalReference } from '../api/api';
import {
  BookOpen, ExternalLink, ChevronRight, ScanLine,
  Microscope, RefreshCw, Shield
} from 'lucide-react';

const TAG_COLORS: Record<string, string> = {
  'Staging': 'badge-primary',
  'Surgical technique': 'badge-success',
  'Outcomes': 'badge-warning',
  'Reconstruction': 'badge-neutral',
};

const TAG_ALL = 'All';

export default function References() {
  const navigate = useNavigate();
  const { activeCase } = useApp();
  const [protocols, setProtocols] = useState<string[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(TAG_ALL);
  const [error, setError] = useState('');

  const loadReferences = async () => {
    if (!activeCase) return;
    setLoading(true);
    setError('');
    try {
      const data = await getClinicalReference(activeCase);
      setProtocols(data.protocols || []);
      setPapers(data.papers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load references.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReferences(); }, [activeCase]);

  const tags = [TAG_ALL, ...Array.from(new Set(papers.map(p => p.tag)))];
  const filtered = activeTag === TAG_ALL ? papers : papers.filter(p => p.tag === activeTag);

  if (!activeCase) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Clinical References</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', marginTop: 4 }}>NCCN protocols and PubMed research tailored to your active case.</p>
        </div>
        <div className="empty-state">
          <BookOpen size={48} className="empty-state-icon" />
          <h2 className="empty-state-title">No active case</h2>
          <p className="empty-state-sub">Load a patient case from the Scan page to surface case-specific NCCN protocols and curated research papers.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/scan')}>
            <ScanLine size={14} /> Go to Scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Clinical References</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', marginTop: 4 }}>
            Case: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{activeCase.patientId}</span> · {activeCase.site} · {activeCase.tnm}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadReferences} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>Loading case-specific references...</p>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', gap: 8, padding: '14px 16px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--danger)', marginBottom: 24 }}>
          {error}
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={loadReferences}>Retry</button>
        </div>
      ) : (
        <div className="ref-layout">
          {/* NCCN Protocols */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Shield size={14} color="var(--primary)" />
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>NCCN Protocols</h2>
            </div>
            {protocols.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '20px 0' }}>No protocols found.</div>
            ) : (
              <div className="protocol-list">
                {protocols.map((p, i) => (
                  <div key={i} className="protocol-item">
                    <div className="protocol-bullet">
                      <ChevronRight size={11} color="var(--primary)" />
                    </div>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Research Papers */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Microscope size={14} color="var(--primary)" />
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Research Papers</h2>
            </div>

            {/* Tag filters */}
            {papers.length > 0 && (
              <div className="ref-tag-filters">
                {tags.map(tag => (
                  <button key={tag} className={`ref-tag ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.length === 0 ? (
                <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '20px 0' }}>No papers found.</div>
              ) : (
                filtered.map((p, i) => (
                  <div key={i} className="ref-paper-card">
                    <h3 className="ref-paper-title">{p.title}</h3>
                    <p className="ref-paper-authors">{p.authors} &middot; {p.journal}</p>
                    <p className="ref-paper-snippet">{p.snippet}</p>
                    <div className="ref-paper-footer">
                      <span className={`badge ${TAG_COLORS[p.tag] || 'badge-neutral'}`}>{p.tag}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{p.cites} citations</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', gap: 5, padding: '4px 10px' }}>
                          PubMed <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer disclaimer */}
      <div style={{ marginTop: 32, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11.5, color: 'var(--fg-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Shield size={12} />
        References are AI-synthesized. Verify against official NCCN guidelines before clinical application. Final clinical responsibility remains with the surgeon.
      </div>
    </div>
  );
}
