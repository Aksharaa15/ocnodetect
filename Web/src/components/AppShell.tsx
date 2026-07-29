import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import {
  LayoutDashboard, ScanLine, MessageSquare, BookOpen,
  User, HeartPulse, LogOut, Activity, PanelLeftClose, PanelLeftOpen, Menu
} from 'lucide-react';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { key: 'scan',      label: 'Scan',      icon: ScanLine,        path: '/app/scan' },
  { key: 'chat',      label: 'AI Chat',   icon: MessageSquare,   path: '/app/chat' },
  { key: 'references',label: 'References',icon: BookOpen,        path: '/app/references' },
  { key: 'profile',   label: 'Profile',   icon: User,            path: '/app/profile' },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout, activeCase } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getInitials = (name: string) => {
    const clean = name.startsWith('Dr. ') ? name.slice(4) : name;
    const parts = clean.trim().split(/\s+/);
    if (!parts[0]) return '??';
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => { navigate('/'); setSidebarOpen(false); }} title="Go to Landing Page">
            <HeartPulse size={22} color="var(--primary)" />
            <span className="sidebar-logo-text">Ocno<span>Detect</span></span>
          </div>
          {sidebarOpen && (
            <button className="btn-icon" style={{ border: 'none', padding: 4 }} onClick={() => setSidebarOpen(false)} title="Collapse sidebar">
              <PanelLeftClose size={16} color="var(--fg-secondary)" />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ key, label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={key}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => { navigate(path); setSidebarOpen(false); }}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
                <span className="nav-item-text">{label}</span>
              </button>
            );
          })}
        </nav>

        {activeCase && (
          <div className="active-case-card" style={{ margin: '0 12px', padding: '12px', background: 'var(--primary-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,233,0.2)', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 4 }}>Active Case</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--fg)' }}>{activeCase.patientId}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{activeCase.site} · {activeCase.tnm}</div>
          </div>
        )}

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
              {getInitials(userProfile.name)}
            </div>
            <div className="sidebar-user-details" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.specialty || 'Clinician'}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 8, paddingLeft: sidebarOpen ? 8 : 0, fontSize: 13 }} onClick={logout} title="Sign out">
            <LogOut size={14} />
            <span className="signout-text">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-icon mobile-menu-btn" style={{ border: 'none', padding: 6 }} onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu">
              {sidebarOpen ? <PanelLeftClose size={18} color="var(--primary)" /> : <Menu size={18} color="var(--primary)" />}
            </button>
            {!sidebarOpen && (
              <button className="btn-icon desktop-sidebar-toggle" style={{ border: 'none', padding: 6 }} onClick={() => setSidebarOpen(true)} title="Expand sidebar">
                <PanelLeftOpen size={18} color="var(--primary)" />
              </button>
            )}
            <Activity size={14} color="var(--primary)" />
            <span className="topbar-date" style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="topbar-tag" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Clinical Intelligence Platform</div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s infinite' }} title="Backend online" />
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>

        {/* App Footer */}
        <footer className="app-footer">
          <span className="app-footer-text">OcnoDetect &copy; 2026 &middot; Clinical Intelligence Platform</span>
          <span className="app-footer-text mobile-hide-legal">AI-generated content &mdash; Final clinical responsibility remains with the surgeon</span>
        </footer>
      </div>
    </div>
  );
}
