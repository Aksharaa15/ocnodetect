import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CaseContext, ChatSession, TabKey, UserProfile } from './types';
import {
  ReferenceResult,
  setApiToken,
  syncSavedCases,
  syncChatSessions,
  getSavedCases,
  getChatSessions,
} from '../services/scanwiseApi';
import { loadMobileState, saveMobileState, wipeMobileState } from '../services/persistence';

export interface AlertConfig {
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }>;
}

interface AppState {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  activeCase: CaseContext | null;
  setActiveCase: (c: CaseContext | null) => void;
  activeReference: ReferenceResult | null;
  setActiveReference: (r: ReferenceResult | null) => void;
  savedCases: CaseContext[];
  setSavedCases: (cases: CaseContext[]) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  isOnboarded: boolean;
  setIsOnboarded: (v: boolean) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  alertConfig: AlertConfig | null;
  showAlert: (title: string, message: string, buttons?: AlertConfig['buttons']) => void;
  hideAlert: () => void;
  clearUserSession: () => void;
  hydrated: boolean;
}

const defaultProfile: UserProfile = {
  name: '',
  specialty: '',
  institution: '',
};

const startingSavedCases: CaseContext[] = [];

const startingChatSessions: ChatSession[] = [];

const AppContext = createContext<AppState>({
  tab: 'home',
  setTab: () => {},
  activeCase: null,
  setActiveCase: () => {},
  activeReference: null,
  setActiveReference: () => {},
  savedCases: startingSavedCases,
  setSavedCases: () => {},
  userProfile: defaultProfile,
  setUserProfile: () => {},
  isOnboarded: false,
  setIsOnboarded: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  authToken: null,
  setAuthToken: () => {},
  chatSessions: startingChatSessions,
  setChatSessions: () => {},
  activeSessionId: null,
  setActiveSessionId: () => {},
  alertConfig: null,
  showAlert: () => {},
  hideAlert: () => {},
  clearUserSession: () => {},
  hydrated: false,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>('home');
  const [activeCase, setActiveCaseState] = useState<CaseContext | null>(null);
  const [activeReference, setActiveReference] = useState<ReferenceResult | null>(null);
  const [savedCases, setSavedCases] = useState<CaseContext[]>(startingSavedCases);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(startingChatSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons']) => {
    setAlertConfig({ title, message, buttons });
  };

  const hideAlert = () => {
    setAlertConfig(null);
  };

  // 1. Synchronize authToken to apiService dynamically
  useEffect(() => {
    setApiToken(authToken);
  }, [authToken]);

  // 2. Hydrate state from disk at startup
  useEffect(() => {
    async function hydrate() {
      try {
        const savedState = await loadMobileState();
        if (savedState) {
          if (savedState.savedCases) setSavedCases(savedState.savedCases);
          if (savedState.chatSessions) setChatSessions(savedState.chatSessions);
          if (savedState.activeSessionId !== undefined) setActiveSessionId(savedState.activeSessionId);
          if (savedState.activeCase !== undefined) setActiveCaseState(savedState.activeCase);
          if (savedState.userProfile) setUserProfile(savedState.userProfile);
          if (savedState.isOnboarded !== undefined) setIsOnboarded(savedState.isOnboarded);
          if (savedState.authToken) {
            setApiToken(savedState.authToken); // Force synchronous sync before state changes trigger downstream fetches!
            setAuthToken(savedState.authToken);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('[Persistence] Failed to hydrate local state:', err);
      } finally {
        setHydrated(true);
      }
    }
    hydrate();
  }, []);

  // 3. Automatically save state updates to disk
  useEffect(() => {
    if (hydrated) {
      saveMobileState({
        savedCases,
        chatSessions,
        activeSessionId,
        activeCase,
        userProfile,
        authToken,
        isOnboarded,
      });
    }
  }, [savedCases, chatSessions, activeSessionId, activeCase, userProfile, authToken, isOnboarded, hydrated]);

  // 4. Restore savedCases + chatSessions from MongoDB on every login
  // ALWAYS overwrite local state with cloud data — this guarantees a new user
  // with 0 items clears any leftover data from the previous user on this device.
  useEffect(() => {
    if (!isAuthenticated) return;
    async function restoreFromCloud() {
      try {
        const [cloudCases, cloudChats] = await Promise.all([
          getSavedCases(),
          getChatSessions(),
        ]);
        // Always set — even empty arrays clear the previous user's residual data
        setSavedCases(cloudCases);
        setChatSessions(cloudChats as any);
        console.log(`[Cloud] Restored ${cloudCases.length} saved cases, ${cloudChats.length} chat sessions from MongoDB.`);
      } catch (err) {
        console.warn('[Cloud] Could not restore from MongoDB on auth:', err);
      }
    }
    restoreFromCloud();
  }, [isAuthenticated]);

  // 5. Debounced sync of savedCases to MongoDB on every change
  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    const timer = setTimeout(async () => {
      try {
        await syncSavedCases(savedCases);
      } catch (err) {
        console.warn('[Cloud] savedCases sync failed:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [savedCases, isAuthenticated, hydrated]);

  // 6. Debounced sync of chatSessions to MongoDB on every change
  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    const timer = setTimeout(async () => {
      try {
        await syncChatSessions(chatSessions as any);
      } catch (err) {
        console.warn('[Cloud] chatSessions sync failed:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [chatSessions, isAuthenticated, hydrated]);

  const setActiveCase = (c: CaseContext | null) => {
    setActiveCaseState(c);
    // Invalidate/clear active reference cache on report upload or case changes
    setActiveReference(null);

    if (c) {
      // Look for existing chat sessions for this patientId
      const sessionsForCase = chatSessions.filter(s => s.patientId === c.patientId);
      if (sessionsForCase.length > 0) {
        // Load the most recent session
        setActiveSessionId(sessionsForCase[sessionsForCase.length - 1].id);
      } else {
        // Create a new default session for this case
        const newSessionId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          patientId: c.patientId,
          title: `Case Query: ${c.patientId}`,
          messages: [],
          caseContext: c,
          date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        };
        setChatSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSessionId);
      }
    } else {
      setActiveSessionId(null);
    }
  };
  const clearUserSession = () => {
    setAuthToken(null);
    setApiToken(null);
    setIsAuthenticated(false);
    setIsOnboarded(false);
    setTab('home'); // Reset tab back to Dashboard on logout!
    setActiveCaseState(null);
    setActiveReference(null);
    setSavedCases([]);
    setChatSessions([]);
    setActiveSessionId(null);
    setUserProfile(defaultProfile);

    // Write a clean slate to disk immediately so if the app is killed before
    // React's effect chain flushes, the next boot starts with blank session data.
    wipeMobileState().catch(err =>
      console.warn('[Persistence] Could not wipe state on logout:', err)
    );
  };

  return (
    <AppContext.Provider
      value={{
        tab,
        setTab,
        activeCase,
        setActiveCase,
        activeReference,
        setActiveReference,
        savedCases,
        setSavedCases,
        userProfile,
        setUserProfile,
        isOnboarded,
        setIsOnboarded,
        isAuthenticated,
        setIsAuthenticated,
        authToken,
        setAuthToken,
        chatSessions,
        setChatSessions,
        activeSessionId,
        setActiveSessionId,
        alertConfig,
        showAlert,
        hideAlert,
        clearUserSession,
        hydrated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  return useContext(AppContext);
}
