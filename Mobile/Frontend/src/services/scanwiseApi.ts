/**
 * ScanwiseAI service — dynamic API integration with the Groq Express backend.
 */
import type { CaseContext, UserProfile } from '../store/types';

// The backend base API URL, dynamically loaded from the .env file.
// Prefixed with EXPO_PUBLIC_ so that Expo bundles it automatically for builds.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:5000';

export interface ScanAnalysisResult {
  patientId: string;
  site: string;
  tnm: string;
  confidence: number;
  findings: string[];
  differentials: Array<{ diagnosis: string; probability: string }>;
  surgicalConsiderations: string[];
  prognosticFactors: string[];
  multidisciplinaryRecommendations: string[];
  protocol: string;
  date?: string;
}

export interface ReferenceResult {
  protocols: string[];
  papers: Array<{
    title: string;
    authors: string;
    journal: string;
    snippet: string;
    tag: 'Staging' | 'Surgical technique' | 'Outcomes' | 'Reconstruction';
    cites: number;
  }>;
}

// ─── AUTHENTICATION STATE & INTERCEPTOR ─────────────────────────────────────

let apiToken: string | null = null;

export function setApiToken(token: string | null) {
  apiToken = token;
}

/**
 * Custom fetch wrapper that automatically appends the dynamic JWT token.
 */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = (options.headers || {}) as Record<string, string>;
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }
  options.headers = headers;

  return await fetch(url, options);
}

// ─── AUTHENTICATION API ENDPOINTS ───────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Authentication failed. Invalid email or password.');
  }

  const data = await response.json();
  setApiToken(data.token);
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  specialty: string;
  institution: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed. Clinician account already exists.');
  }

  const data = await response.json();
  setApiToken(data.token);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send OTP. Please try again.');
  }
}

export async function verifyOtp(email: string, otp: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'OTP verification failed.');
  }
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Password reset failed.');
  }
}

// ─── PROTECTED CLINICAL API ENDPOINTS ───────────────────────────────────────

/**
 * Sends a PDF pathology report or metadata parameters to the backend to generate a structured AI summary.
 */
export async function analyzeImaging(fileOrData: {
  uri?: string;
  name?: string;
  type?: string;
  text?: string;
  patientId?: string;
}): Promise<ScanAnalysisResult> {
  try {
    const formData = new FormData();

    if (fileOrData.uri) {
      // PDF pathology report upload
      formData.append('file', {
        uri: fileOrData.uri,
        name: fileOrData.name || 'pathology.pdf',
        type: fileOrData.type || 'application/pdf',
      } as any);
      if (fileOrData.patientId) {
        formData.append('patientId', fileOrData.patientId);
      }
    } else {
      // Dynamic synthesis metadata or text reports
      formData.append('metadata', fileOrData.text || '');
      formData.append('patientId', fileOrData.patientId || '');
    }

    console.log(`[API] Dispatching clinical upload request to: ${BASE_URL}/api/upload`);

    const response = await authFetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Analysis failed (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.warn('[API] Error in analyzeImaging:', error);
    throw error;
  }
}

/**
 * Queries the case-anchored Groq chat backend.
 */
export async function askAI(
  question: string,
  caseContext: CaseContext,
  history: Array<{ role: 'user' | 'ai'; text: string }> = []
): Promise<string> {
  try {
    console.log(`[API] Dispatching chat query to: ${BASE_URL}/api/chat`);
    const response = await authFetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, history, caseContext }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Chat failed (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.warn('[API] Error in askAI:', error);
    throw error;
  }
}

/**
 * Fetches case-specific NCCN sub-protocols and PubMed publications dynamically.
 */
export async function getClinicalReference(caseContext: CaseContext): Promise<ReferenceResult> {
  try {
    console.log(`[API] Dispatching reference query to: ${BASE_URL}/api/reference`);
    const response = await authFetch(`${BASE_URL}/api/reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseContext }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Reference lookup failed (HTTP ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.warn('[API] Error in getClinicalReference:', error);
    throw error;
  }
}

/**
 * Fetches dynamic Dashboard stats, live-computed registries, and Insights.
 */
export async function getDashboard(): Promise<{
  stats: Array<{ label: string; value: string }>;
  recent: CaseContext[];
  insight: { patientId: string; text: string };
  distribution: Array<{ label: string; pct: number }>;
}> {
  try {
    const response = await authFetch(`${BASE_URL}/api/dashboard`);
    if (!response.ok) {
      throw new Error(`Dashboard fetch failed (HTTP ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[API] Error in getDashboard:', error);
    throw error;
  }
}

/**
 * Fetches mutable user profile and live staged metrics.
 */
export async function getProfile(): Promise<{
  userProfile: UserProfile;
  stats: Array<{ l: string; v: string }>;
}> {
  try {
    const response = await authFetch(`${BASE_URL}/api/profile`);
    if (!response.ok) {
      throw new Error(`Profile fetch failed (HTTP ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[API] Error in getProfile:', error);
    throw error;
  }
}

/**
 * Updates mutable profile parameters.
 */
export async function updateProfile(profile: UserProfile): Promise<boolean> {
  try {
    const response = await authFetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      throw new Error(`Profile update failed (HTTP ${response.status})`);
    }
    return true;
  } catch (error) {
    console.warn('[API] Error in updateProfile:', error);
    throw error;
  }
}

/**
 * Wipes out the backend case registry.
 */
export async function clearAllCases(): Promise<boolean> {
  try {
    const response = await authFetch(`${BASE_URL}/api/clear-cases`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Clear cases failed (HTTP ${response.status})`);
    }
    return true;
  } catch (error) {
    console.warn('[API] Error in clearAllCases:', error);
    throw error;
  }
}

// ─── SAVED CASES API ──────────────────────────────────────────────────────────

/** Fetch all bookmarked cases from MongoDB for the authenticated surgeon. */
export async function getSavedCases(): Promise<CaseContext[]> {
  const response = await authFetch(`${BASE_URL}/api/saved-cases`);
  if (!response.ok) throw new Error(`getSavedCases failed (HTTP ${response.status})`);
  const data = await response.json();
  return data.savedCases as CaseContext[];
}

/** Full sync — overwrites the server's saved cases list with the client's current list. */
export async function syncSavedCases(savedCases: CaseContext[]): Promise<void> {
  const response = await authFetch(`${BASE_URL}/api/saved-cases/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ savedCases }),
  });
  if (!response.ok) throw new Error(`syncSavedCases failed (HTTP ${response.status})`);
}

/** Delete a single bookmarked case by patientId. */
export async function deleteSavedCase(patientId: string): Promise<void> {
  const response = await authFetch(`${BASE_URL}/api/saved-cases/${encodeURIComponent(patientId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`deleteSavedCase failed (HTTP ${response.status})`);
}

// ─── CHAT SESSIONS API ────────────────────────────────────────────────────────

export interface ChatSessionPayload {
  id: string;
  patientId: string;
  title: string;
  messages: { role: 'user' | 'ai'; text: string; t: string }[];
  caseContext: CaseContext;
  date: string;
}

/** Fetch all chat sessions from MongoDB for the authenticated surgeon. */
export async function getChatSessions(): Promise<ChatSessionPayload[]> {
  const response = await authFetch(`${BASE_URL}/api/chat-sessions`);
  if (!response.ok) throw new Error(`getChatSessions failed (HTTP ${response.status})`);
  const data = await response.json();
  // Map MongoDB sessionId field back to client-side id field
  return data.chatSessions.map((s: any) => ({
    id: s.sessionId,
    patientId: s.patientId,
    title: s.title,
    messages: s.messages,
    caseContext: s.caseContext,
    date: s.date,
  })) as ChatSessionPayload[];
}

/** Full sync — upserts all sessions on the server and removes any that were deleted locally. */
export async function syncChatSessions(chatSessions: ChatSessionPayload[]): Promise<void> {
  const response = await authFetch(`${BASE_URL}/api/chat-sessions/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatSessions }),
  });
  if (!response.ok) throw new Error(`syncChatSessions failed (HTTP ${response.status})`);
}

/** Delete a single chat session by its client-side id. */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await authFetch(`${BASE_URL}/api/chat-sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`deleteChatSession failed (HTTP ${response.status})`);
}
