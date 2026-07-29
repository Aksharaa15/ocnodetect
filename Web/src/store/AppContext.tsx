import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ScanResult, ChatSessionPayload } from '../api/api';
import { setApiToken, getStoredToken, getProfile, getSavedCases, getChatSessions, syncSavedCases, syncChatSessions } from '../api/api';

interface UserProfile { name: string; specialty: string; institution: string; }

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string; }

interface AppState {
  // Auth
  isAuthenticated: boolean;
  token: string | null;
  userProfile: UserProfile;
  setIsAuthenticated: (v: boolean) => void;
  login: (token: string, profile: UserProfile) => void;
  logout: () => void;
  setUserProfile: (p: UserProfile) => void;

  // Active case
  activeCase: ScanResult | null;
  setActiveCase: (c: ScanResult | null) => void;

  // Saved cases
  savedCases: ScanResult[];
  setSavedCases: (cases: ScanResult[]) => void;
  addSavedCase: (c: ScanResult) => void;
  removeSavedCase: (patientId: string) => void;

  // Chat sessions
  chatSessions: ChatSessionPayload[];
  setChatSessions: (s: ChatSessionPayload[]) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // Toasts
  toasts: Toast[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Data loading
  hydrated: boolean;
}

const AppContext = createContext<AppState>(null as any);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: 'Dr. User', specialty: '', institution: '' });
  const [activeCase, setActiveCase] = useState<ScanResult | null>(null);
  const [savedCases, setSavedCasesRaw] = useState<ScanResult[]>([]);
  const [chatSessions, setChatSessionsRaw] = useState<ChatSessionPayload[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage token on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setApiToken(stored);
      setIsAuthenticated(true);
      // Fetch profile and data
      Promise.all([
        getProfile().then(d => { setUserProfile(d.userProfile); }).catch(() => {}),
        getSavedCases().then(c => setSavedCasesRaw(c)).catch(() => {}),
        getChatSessions().then(s => setChatSessionsRaw(s)).catch(() => {}),
      ]).finally(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, []);

  const login = useCallback((tok: string, profile: UserProfile) => {
    setToken(tok);
    setApiToken(tok);
    setIsAuthenticated(true);
    setUserProfile(profile);
    Promise.all([
      getSavedCases().then(c => setSavedCasesRaw(c)).catch(() => {}),
      getChatSessions().then(s => setChatSessionsRaw(s)).catch(() => {}),
    ]);
  }, []);

  const logout = useCallback(() => {
    setApiToken(null);
    setToken(null);
    setIsAuthenticated(false);
    setUserProfile({ name: 'Dr. User', specialty: '', institution: '' });
    setActiveCase(null);
    setSavedCasesRaw([]);
    setChatSessionsRaw([]);
    setActiveSessionId(null);
  }, []);

  const setSavedCases = useCallback((cases: ScanResult[]) => {
    setSavedCasesRaw(cases);
    syncSavedCases(cases).catch(() => {});
  }, []);

  const addSavedCase = useCallback((c: ScanResult) => {
    setSavedCasesRaw(prev => {
      const next = [c, ...prev.filter(p => p.patientId !== c.patientId)];
      syncSavedCases(next).catch(() => {});
      return next;
    });
  }, []);

  const removeSavedCase = useCallback((patientId: string) => {
    setSavedCasesRaw(prev => {
      const next = prev.filter(p => p.patientId !== patientId);
      syncSavedCases(next).catch(() => {});
      return next;
    });
  }, []);

  const setChatSessions = useCallback((s: ChatSessionPayload[]) => {
    setChatSessionsRaw(s);
    syncChatSessions(s).catch(() => {});
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      isAuthenticated, token, userProfile, setIsAuthenticated, login, logout, setUserProfile,
      activeCase, setActiveCase,
      savedCases, setSavedCases, addSavedCase, removeSavedCase,
      chatSessions, setChatSessions, activeSessionId, setActiveSessionId,
      toasts, showToast, dismissToast,
      hydrated,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
