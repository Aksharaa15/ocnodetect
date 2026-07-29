import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { askAI, deleteChatSession } from '../api/api';
import type { ChatSessionPayload } from '../api/api';
import {
  Send, Plus, Trash2, MessageSquare, X, ScanLine,
  Bot, User, Clock, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const SUGGESTIONS = [
  'What is the NCCN-recommended nodal dissection for T3N2b BOT?',
  'What are typical free flap options for this resection?',
  'Is concurrent chemoradiation indicated here?',
  'Summarise surgical risks for this stage',
];

function parseMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function Chat() {
  const navigate = useNavigate();
  const { activeCase, setActiveCase, chatSessions, setChatSessions, activeSessionId, setActiveSessionId, showToast } = useApp();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const newSession = useCallback(() => {
    if (!activeCase) { showToast('Load a case first from the Scan page.', 'error'); return; }
    const id = `sess-${Date.now()}`;
    const session: ChatSessionPayload = {
      id, patientId: activeCase.patientId,
      title: `${activeCase.patientId} · ${activeCase.site}`,
      messages: [],
      caseContext: activeCase,
      date: new Date().toLocaleDateString(),
    };
    const next = [session, ...chatSessions];
    setChatSessions(next);
    setActiveSessionId(id);
  }, [activeCase, chatSessions, setChatSessions, setActiveSessionId, showToast]);

  // Auto-create session when active case loads and no session exists
  useEffect(() => {
    if (activeCase && chatSessions.length === 0) newSession();
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || !activeSession) return;
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user' as const, text: text.trim(), t };
    const updSession = { ...activeSession, messages: [...activeSession.messages, userMsg] };
    const next = chatSessions.map(s => s.id === activeSession.id ? updSession : s);
    setChatSessions(next);
    setInput('');
    setTyping(true);

    try {
      const history = activeSession.messages.map(m => ({ role: m.role, text: m.text }));
      const reply = await askAI(text.trim(), activeSession.caseContext, history);
      const aiMsg = { role: 'ai' as const, text: reply, t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      const withAi = { ...updSession, messages: [...updSession.messages, aiMsg] };
      setChatSessions(chatSessions.map(s => s.id === activeSession.id ? withAi : s));
    } catch (err: any) {
      showToast(err.message || 'AI chat failed.', 'error');
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = chatSessions.filter(s => s.id !== id);
    setChatSessions(next);
    if (activeSessionId === id) setActiveSessionId(next[0]?.id || null);
    try { await deleteChatSession(id); } catch {}
  };

  return (
    <div style={{ height: 'calc(100vh - 60px - 48px - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>AI Chat</h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-secondary)', marginTop: 4 }}>Case-anchored clinical consultation with OcnoDetect AI.</p>
      </div>

      <div className="chat-layout" style={{ flex: 1, minHeight: 0, gridTemplateColumns: sessionsOpen ? '300px 1fr' : '1fr', transition: 'grid-template-columns 0.3s ease' }}>
        {/* History panel */}
        {sessionsOpen && (
          <div className="chat-history-panel">
            <div className="chat-history-header">
              <span>Sessions</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={newSession}>
                  <Plus size={13} /> New
                </button>
                <button className="btn-icon" style={{ border: 'none', padding: 4 }} onClick={() => setSessionsOpen(false)} title="Close sessions list">
                  <PanelLeftClose size={15} color="var(--fg-secondary)" />
                </button>
              </div>
            </div>
            <div className="chat-history-list">
              {chatSessions.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>
                  No sessions yet. Load a case and start a new chat.
                </div>
              ) : (
                chatSessions.map(s => (
                  <div
                    key={s.id}
                    className={`chat-history-item ${s.id === activeSessionId ? 'active' : ''}`}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="chat-session-title">{s.title}</span>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 2 }}
                        onClick={e => deleteSession(s.id, e)}
                      ><Trash2 size={11} /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={9} color="var(--fg-muted)" />
                      <span className="chat-session-date">{s.date}</span>
                      <span className="chat-session-date">· {s.messages.length} msgs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main chat */}
        <div className="chat-main">
          {/* Top session toggle button if closed */}
          {!sessionsOpen && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginBottom: 12, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setSessionsOpen(true)}
              title="Open sessions list"
            >
              <PanelLeftOpen size={14} color="var(--primary)" /> Show Sessions ({chatSessions.length})
            </button>
          )}

          {/* Case context banner */}
          {activeCase && (
            <div className="case-context-banner">
              <ScanLine size={14} color="var(--primary)" />
              <span style={{ flex: 1, color: 'var(--fg-secondary)' }}>
                Active case: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{activeCase.patientId}</span> · {activeCase.site} · {activeCase.tnm}
              </span>
              <button className="btn-icon" style={{ border: 'none', padding: 4 }} onClick={() => setActiveCase(null)}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* Messages area */}
          <div className="messages-area" ref={messagesRef}>
            {!activeSession ? (
              <div className="empty-state">
                <MessageSquare size={40} className="empty-state-icon" />
                <h2 className="empty-state-title">No active session</h2>
                <p className="empty-state-sub">
                  {activeCase ? 'Start a new chat session to begin consulting the AI.' : 'Load a case from the Scan page first, then start a chat.'}
                </p>
                {!activeCase && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/app/scan')}>
                    <ScanLine size={13} /> Go to Scan
                  </button>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <Bot size={40} className="empty-state-icon" />
                <h2 className="empty-state-title">OcnoDetect AI ready</h2>
                <p className="empty-state-sub">Ask any clinical question about this patient case. The AI is anchored to the active case context.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  <div className={`message-avatar ${m.role}`}>
                    {m.role === 'ai' ? <Bot size={13} /> : <User size={13} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {m.role === 'ai' && <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 600 }}>OcnoDetect AI</span>}
                    <div className={`message-bubble ${m.role}`}>{m.role === 'ai' ? parseMarkdown(m.text) : m.text}</div>
                    <span className="message-time">{m.t}</span>
                  </div>
                </div>
              ))
            )}
            {typing && (
              <div className="message">
                <div className="message-avatar ai"><Bot size={13} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 600 }}>OcnoDetect AI</span>
                  <div className="message-bubble ai">
                    <div className="dot-bounce"><span /><span /><span /></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          {activeSession && messages.length === 0 && activeCase && (
            <div className="suggestion-chips">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={activeSession ? 'Ask a clinical question...' : 'Start a new session to chat'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!activeSession || typing}
              rows={1}
            />
            <button
              className="btn btn-primary"
              style={{ padding: '10px 14px', flexShrink: 0 }}
              onClick={() => send(input)}
              disabled={!input.trim() || !activeSession || typing}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
