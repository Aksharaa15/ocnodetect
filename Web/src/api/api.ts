// ─── OcnoDetect API Client ────────────────────────────────────────────────────
// Mirrors the mobile app's scanwiseApi.ts, adapted for browser + localStorage JWT

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let _token: string | null = localStorage.getItem('ocno_token');

export function setApiToken(token: string | null) {
  _token = token;
  if (token) localStorage.setItem('ocno_token', token);
  else localStorage.removeItem('ocno_token');
}

export function getStoredToken(): string | null {
  return _token;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...(options.headers as Record<string, string> || {}) };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  return fetch(url, { ...options, headers });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Login failed.'); }
  const data = await res.json();
  setApiToken(data.token);
  return data;
}

export async function registerUser(payload: {
  name: string; email: string; password: string; specialty: string; institution: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Registration failed.'); }
  const data = await res.json();
  setApiToken(data.token);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed.'); }
}

export async function verifyOtp(email: string, otp: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'OTP failed.'); }
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Reset failed.'); }
}

// ─── Protected Endpoints ──────────────────────────────────────────────────────

export interface ScanResult {
  patientId: string; site: string; tnm: string; confidence: number;
  findings: string[]; differentials: { diagnosis: string; probability: string }[];
  surgicalConsiderations: string[]; prognosticFactors: string[];
  multidisciplinaryRecommendations: string[]; protocol: string; date?: string;
}

export async function analyzeImaging(file: File, patientId?: string): Promise<ScanResult> {
  const form = new FormData();
  form.append('file', file);
  if (patientId) form.append('patientId', patientId);
  const res = await authFetch(`${BASE_URL}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Analysis failed.'); }
  return res.json();
}

export async function analyzeText(text: string, patientId?: string): Promise<ScanResult> {
  const form = new FormData();
  form.append('metadata', text);
  if (patientId) form.append('patientId', patientId);
  const res = await authFetch(`${BASE_URL}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Analysis failed.'); }
  return res.json();
}

export async function askAI(
  message: string,
  caseContext: ScanResult,
  history: { role: 'user' | 'ai'; text: string }[] = []
): Promise<string> {
  const res = await authFetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, caseContext }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Chat failed.'); }
  const data = await res.json();
  return data.reply;
}

export async function getClinicalReference(caseContext: ScanResult): Promise<{
  protocols: string[];
  papers: { title: string; authors: string; journal: string; snippet: string; tag: string; cites: number; url?: string }[];
}> {
  const res = await authFetch(`${BASE_URL}/api/reference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseContext }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Reference failed.'); }
  return res.json();
}

export async function getDashboard(): Promise<{
  stats: { label: string; value: string }[];
  recent: ScanResult[];
  insight: { patientId: string; text: string };
  distribution: { label: string; pct: number }[];
}> {
  const res = await authFetch(`${BASE_URL}/api/dashboard`);
  if (!res.ok) throw new Error('Dashboard fetch failed.');
  return res.json();
}

export async function getProfile(): Promise<{
  userProfile: { name: string; specialty: string; institution: string };
  stats: { l: string; v: string }[];
}> {
  const res = await authFetch(`${BASE_URL}/api/profile`);
  if (!res.ok) throw new Error('Profile fetch failed.');
  return res.json();
}

export async function updateProfile(p: { name: string; specialty: string; institution: string }): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Update failed.'); }
}

export async function clearAllCases(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/clear-cases`, { method: 'POST' });
  if (!res.ok) throw new Error('Clear failed.');
}

// ─── Saved Cases ──────────────────────────────────────────────────────────────

export async function getSavedCases(): Promise<ScanResult[]> {
  const res = await authFetch(`${BASE_URL}/api/saved-cases`);
  if (!res.ok) throw new Error('getSavedCases failed.');
  const data = await res.json();
  return data.savedCases;
}

export async function syncSavedCases(cases: ScanResult[]): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/saved-cases/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ savedCases: cases }),
  });
  if (!res.ok) throw new Error('syncSavedCases failed.');
}

export async function deleteSavedCase(patientId: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/saved-cases/${encodeURIComponent(patientId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('deleteSavedCase failed.');
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export interface ChatSessionPayload {
  id: string; patientId: string; title: string;
  messages: { role: 'user' | 'ai'; text: string; t: string }[];
  caseContext: ScanResult; date: string;
}

export async function getChatSessions(): Promise<ChatSessionPayload[]> {
  const res = await authFetch(`${BASE_URL}/api/chat-sessions`);
  if (!res.ok) throw new Error('getChatSessions failed.');
  const data = await res.json();
  return data.chatSessions.map((s: any) => ({ id: s.sessionId, patientId: s.patientId, title: s.title, messages: s.messages, caseContext: s.caseContext, date: s.date }));
}

export async function syncChatSessions(sessions: ChatSessionPayload[]): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/chat-sessions/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatSessions: sessions }),
  });
  if (!res.ok) throw new Error('syncChatSessions failed.');
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/chat-sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('deleteChatSession failed.');
}
