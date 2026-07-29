import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { getDashboard } from '../api/api';
import {
  Stethoscope, Users, MessageSquare, Timer,
  ChevronRight, Sparkles, Activity
} from 'lucide-react';

const ICONS = [Stethoscope, Users, MessageSquare, Timer];
const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function parseNum(v: string): number {
  const t = v.match(/^(\d+)m\s*(\d+)s$/);
  if (t) return parseInt(t[1]) * 60 + parseInt(t[2]);
  return parseInt(v.replace(/\D/g, '')) || 0;
}
function fmtNum(n: number, orig: string): string {
  if (/m/.test(orig)) { const m = Math.floor(n / 60); const s = n % 60; return m > 0 ? `${m}m ${s}s` : `${s}s`; }
  return String(n);
}

function CountUp({ target, orig }: { target: number; orig: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let raf: number;
    const start = Date.now();
    const dur = 1400;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - (1 - p) * (1 - p);
      setVal(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{fmtNum(val, orig)}</>;
}

function DistBar({ label, pct, idx }: { label: string; pct: number; idx: number }) {
  const [h, setH] = useState(0);
  useEffect(() => { const t = setTimeout(() => setH(pct), 80 + idx * 60); return () => clearTimeout(t); }, [pct, idx]);
  const abbr = label.length > 8 ? label.slice(0, 3).toUpperCase() : label.toUpperCase();
  const color = CHART_COLORS[idx % CHART_COLORS.length];
  return (
    <div className="dist-bar-col">
      <div className="dist-bar-pct">{pct}%</div>
      <div className="dist-bar-track">
        <div className="dist-bar" style={{ height: `${h}%`, background: color }} />
      </div>
      <div className="dist-bar-label">{abbr}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile, savedCases, setActiveCase, activeCase } = useApp();
  const [stats, setStats] = useState<{ label: string; value: string }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [insight, setInsight] = useState<{ patientId: string; text: string } | null>(null);
  const [dist, setDist] = useState<{ label: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const displayName = userProfile.name.startsWith('Dr. ') ? userProfile.name.slice(4).split(' ')[0] : userProfile.name.split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  useEffect(() => {
    getDashboard().then(d => {
      setStats(d.stats);
      setRecent(d.recent);
      setInsight(d.insight);
      setDist(d.distribution);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [activeCase]);

  const defaultStats = [
    { label: 'Cases Reviewed', value: '0' },
    { label: 'Total Patients', value: '0' },
    { label: 'Chat Sessions', value: '0' },
    { label: 'Avg. Processing', value: '0s' },
  ];
  const merged = defaultStats.map((d, i) => {
    const b = stats.find(s => s.label === d.label);
    return { ...d, value: b?.value ?? d.value, Icon: ICONS[i] };
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>
            {greeting}, {userProfile.name.startsWith('Dr.') ? '' : 'Dr. '}{displayName}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)' }}>
            {recent.length} cases analyzed in database
          </p>
        </div>
        <div style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11.5, color: 'var(--fg-secondary)', background: 'var(--surface)' }}>
          {today}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {merged.map(({ label, value, Icon }, i) => (
          <div key={label} className="stat-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="stat-card-accent" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: 8 }}>
              <span className="stat-label">{label}</span>
              <Icon size={13} className="stat-icon" />
            </div>
            <div className="stat-value" style={{ paddingLeft: 8 }}>
              {loading ? '—' : <CountUp target={parseNum(value)} orig={value} />}
            </div>
          </div>
        ))}
      </div>

      {/* Recent saved cases */}
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)' }}>Recent Saved Cases</div>
      <div className="case-list" style={{ marginBottom: 24 }}>
        {savedCases.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            No saved cases. Upload a scan and save it to your registry.
          </div>
        ) : (
          [...savedCases].reverse().slice(0, 5).map((c, i) => (
            <div key={`${c.patientId}-${i}`} className="case-row" onClick={() => { setActiveCase(c); navigate('/app/scan'); }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="case-id">{c.patientId}</span>
                  <span style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, color: 'var(--fg-secondary)' }}>{c.site}</span>
                  <span style={{ fontSize: 10, background: 'var(--primary-dim)', border: '1px solid rgba(14,165,233,0.2)', padding: '1px 6px', borderRadius: 4, color: 'var(--primary)' }}>{c.tnm}</span>
                </div>
              </div>
              <span className="case-date">{c.date || 'Saved'}</span>
              <ChevronRight size={14} color="var(--fg-dim)" />
            </div>
          ))
        )}
      </div>

      {/* Insight banner */}
      {insight && recent.length > 0 && (
        <div className="insight-banner" style={{ marginBottom: 32 }}>
          <div className="insight-label">
            <Sparkles size={12} /> Case Insight
          </div>
          <p className="insight-text">
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{insight.patientId}</span>{' '}
            {insight.text.replace(insight.patientId, '').trim()}
          </p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, paddingLeft: 0, color: 'var(--primary)' }} onClick={() => navigate('/app/scan')}>
            Open case <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Distribution */}
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)' }}>Case Distribution — last 30 days</div>
      <div className="dist-card">
        {dist.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>No distribution data. Staged cases will appear here.</div>
        ) : (
          <>
            <div className="dist-chart">
              {dist.map((d, i) => <DistBar key={d.label} label={d.label} pct={d.pct} idx={i} />)}
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
            <div className="dist-legend">
              {dist.map((d, i) => (
                <div key={d.label} className="dist-legend-item">
                  <div className="dist-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.label} ({d.pct}%)
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} color="var(--fg-muted)" />
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{dist.length === 0 ? 'No active metrics' : 'Trending stable'}</span>
        </div>
      </div>
    </div>
  );
}
