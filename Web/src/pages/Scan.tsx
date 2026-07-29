import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { analyzeImaging, analyzeText } from '../api/api';
import type { ScanResult } from '../api/api';
import {
  Upload, FileText, ScanLine, CheckCircle, Loader2,
  Bookmark, BookmarkCheck, MessageSquare, BookOpen,
  FlaskConical, Microscope, Stethoscope, ChevronDown, ChevronUp,
  AlertCircle, Sparkles, TrendingUp, User
} from 'lucide-react';

const STEPS = ['File received', 'Parsing imaging data', 'Extracting clinical findings', 'Generating structured summary', 'Complete'];

type Phase = 'idle' | 'processing' | 'done';

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? 'var(--success)' : pct >= 65 ? 'var(--warning)' : 'var(--danger)';
  const dim = pct >= 85 ? 'var(--success-dim)' : pct >= 65 ? 'var(--warning-dim)' : 'var(--danger-dim)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 999, background: dim, color, fontSize: 11, fontWeight: 700 }}>
      <Sparkles size={10} /> {pct}% confidence
    </span>
  );
}

function ScanSummary({ result, isSaved, onSave, onChat, onRef }: {
  result: ScanResult; isSaved: boolean;
  onSave: () => void; onChat: () => void; onRef: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="summary-section">
      <button
        className="summary-section-title"
        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}
        onClick={() => toggle(id)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={12} color="var(--primary)" />{title}</span>
        {expanded[id] === false ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>
      {expanded[id] !== false && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="summary-scroll">
      {/* Header */}
      <div className="summary-header">
        <div className="summary-patient-id">
          <User size={11} style={{ marginRight: 4 }} />{result.patientId}
        </div>
        <h2 className="summary-site">{result.site}</h2>
        <div className="summary-badges" style={{ gap: 8, marginBottom: 16 }}>
          <span className="badge badge-primary">{result.tnm}</span>
          <ConfidenceBadge value={result.confidence} />
          {result.date && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{result.date}</span>}
        </div>
        {/* Actions */}
        <div className="scan-actions">
          <button className="btn btn-primary btn-sm" onClick={onSave}>
            {isSaved ? <><BookmarkCheck size={14} /> Saved</> : <><Bookmark size={14} /> Save Case</>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onChat}>
            <MessageSquare size={14} /> AI Chat
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRef}>
            <BookOpen size={14} /> References
          </button>
        </div>
      </div>

      {/* Findings */}
      <Section id="findings" title="Clinical Findings" icon={Microscope}>
        <div className="summary-list">
          {result.findings.map((f, i) => (
            <div key={i} className="summary-list-item">{f}</div>
          ))}
        </div>
      </Section>

      {/* Differentials */}
      <Section id="diff" title="Differential Diagnosis" icon={FlaskConical}>
        <table className="differential-table">
          <thead><tr><th>Diagnosis</th><th>Probability</th></tr></thead>
          <tbody>
            {result.differentials.map((d, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--fg)' }}>{d.diagnosis}</td>
                <td>
                  <span className={`badge ${d.probability === 'Primary' ? 'badge-primary' : d.probability === 'Likely' ? 'badge-success' : 'badge-neutral'}`}>
                    {d.probability}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Surgical Considerations */}
      <Section id="surg" title="Surgical Considerations" icon={Stethoscope}>
        <div className="summary-list">
          {result.surgicalConsiderations.map((s, i) => (
            <div key={i} className="summary-list-item">{s}</div>
          ))}
        </div>
      </Section>

      {/* Protocol */}
      {result.protocol && (
        <Section id="proto" title="NCCN Protocol" icon={BookOpen}>
          <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', lineHeight: 1.7 }}>{result.protocol}</p>
        </Section>
      )}

      {/* Prognostic */}
      <Section id="prog" title="Prognostic Factors" icon={TrendingUp}>
        <div className="summary-list">
          {result.prognosticFactors.map((p, i) => (
            <div key={i} className="summary-list-item">{p}</div>
          ))}
        </div>
      </Section>

      {/* MDT */}
      <Section id="mdt" title="MDT Recommendations" icon={FlaskConical}>
        <div className="summary-list">
          {result.multidisciplinaryRecommendations.map((r, i) => (
            <div key={i} className="summary-list-item">{r}</div>
          ))}
        </div>
      </Section>

      <div style={{ padding: '16px 0', fontSize: 11, color: 'var(--fg-muted)', borderTop: '1px solid var(--border)', marginTop: 8 }}>
        AI-generated content. Final clinical responsibility remains with the surgeon.
      </div>
    </div>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const { activeCase, setActiveCase, addSavedCase, savedCases, showToast } = useApp();
  const [phase, setPhase] = useState<Phase>(activeCase ? 'done' : 'idle');
  const [step, setStep] = useState(0);
  const [fileType, setFileType] = useState<'ct' | 'pdf'>('ct');
  const [patientId, setPatientId] = useState(activeCase?.patientId ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<{ cancel: boolean }>({ cancel: false });

  useEffect(() => {
    if (activeCase) { setPhase('done'); setPatientId(activeCase.patientId); }
  }, [activeCase]);

  useEffect(() => {
    if (phase !== 'processing') return;
    if (step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), 750);
    return () => clearTimeout(t);
  }, [phase, step]);

  const runAnalysis = useCallback(async (file: File | null) => {
    setPhase('processing');
    setStep(0);
    setError('');
    analysisRef.current.cancel = false;
    try {
      let result: ScanResult;
      if (file) {
        result = await analyzeImaging(file, patientId || undefined);
      } else {
        result = await analyzeText(`Patient record for ${patientId || 'PT-2024-XXXX'}`, patientId || undefined);
      }
      if (analysisRef.current.cancel) return;
      setActiveCase(result);
      setPhase('done');
      showToast('AI analysis complete.', 'success');
    } catch (err: any) {
      if (analysisRef.current.cancel) return;
      setPhase('idle');
      setError(err.message || 'Analysis failed. Please try again.');
    }
  }, [patientId, setActiveCase, showToast]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleAnalyze = () => {
    if (!selectedFile && fileType === 'ct') {
      setError('Please select a CT scan image to analyze.');
      return;
    }
    if (!selectedFile && fileType === 'pdf') {
      setError('Please select a PDF pathology report to analyze.');
      return;
    }
    runAnalysis(selectedFile);
  };

  const handleReset = () => {
    analysisRef.current.cancel = true;
    setPhase('idle');
    setStep(0);
    setSelectedFile(null);
    setPatientId('');
    setError('');
  };

  const isSaved = savedCases.some(c => c.patientId === activeCase?.patientId);

  const handleSave = () => {
    if (!activeCase) return;
    if (isSaved) { showToast('Case already saved.', 'info'); return; }
    addSavedCase(activeCase);
    showToast('Case saved to registry.', 'success');
  };

  return (
    <div style={{ height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Clinical Scan Analysis</h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', marginTop: 4 }}>Upload a CT scan or pathology PDF to generate a comprehensive AI clinical summary.</p>
      </div>

      <div className="scan-layout">
        {/* Left panel: controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* File type toggle */}
          <div className="file-type-toggle">
            <button className={`file-type-btn ${fileType === 'ct' ? 'active' : ''}`} onClick={() => { setFileType('ct'); setSelectedFile(null); }}>
              <ScanLine size={15} /> CT Scan
            </button>
            <button className={`file-type-btn ${fileType === 'pdf' ? 'active' : ''}`} onClick={() => { setFileType('pdf'); setSelectedFile(null); }}>
              <FileText size={15} /> Pathology PDF
            </button>
          </div>

          {/* Patient ID */}
          <div className="form-group">
            <label className="input-label"><User size={11} style={{ display: 'inline', marginRight: 4 }} />Patient ID (optional)</label>
            <input className="input" placeholder="e.g. PT-2024-0041" value={patientId} onChange={e => setPatientId(e.target.value)} disabled={phase === 'processing'} />
          </div>

          {/* Upload zone */}
          {phase !== 'done' && (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept={fileType === 'pdf' ? '.pdf' : 'image/*'}
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              <Upload size={32} className="upload-zone-icon" />
              <div className="upload-zone-title">
                {selectedFile ? selectedFile.name : `Drop ${fileType === 'ct' ? 'CT scan image' : 'pathology PDF'} here`}
              </div>
              <div className="upload-zone-sub">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change`
                  : `or click to browse · Max 10MB`
                }
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13 }}>
              <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--danger)' }}>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          {phase === 'idle' && (
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={handleAnalyze} disabled={!selectedFile}>
              <Sparkles size={15} /> Analyze with AI
            </button>
          )}

          {phase === 'done' && (
            <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={handleReset}>
              <Upload size={15} /> Upload New Scan
            </button>
          )}

          {/* Processing steps */}
          {phase === 'processing' && (
            <div className="process-steps">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Loader2 size={18} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Analyzing with AI...</span>
              </div>
              {STEPS.map((s, i) => (
                <div key={s} className="process-step">
                  <div className={`step-indicator ${i < step ? 'step-done' : i === step ? 'step-active' : 'step-pending'}`}>
                    {i < step ? <CheckCircle size={13} /> : i === step ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <span>{i + 1}</span>}
                  </div>
                  <span style={{ color: i <= step ? 'var(--fg)' : 'var(--fg-muted)' }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {phase === 'idle' && !activeCase && (
            <div className="empty-state">
              <ScanLine size={48} className="empty-state-icon" />
              <h2 className="empty-state-title">No scan loaded</h2>
              <p className="empty-state-sub">Upload a CT scan or pathology PDF to generate a full clinical summary with TNM staging, findings, and surgical recommendations.</p>
            </div>
          )}
          {phase === 'processing' && (
            <div className="empty-state">
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--primary-dim)', borderTop: '3px solid var(--primary)', animation: 'spin 1s linear infinite' }} />
              <h2 className="empty-state-title">Analyzing scan...</h2>
              <p className="empty-state-sub">Our multimodal AI is extracting clinical findings, TNM staging, and surgical considerations.</p>
            </div>
          )}
          {phase === 'done' && activeCase && (
            <ScanSummary
              result={activeCase}
              isSaved={isSaved}
              onSave={handleSave}
              onChat={() => navigate('/app/chat')}
              onRef={() => navigate('/app/references')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
