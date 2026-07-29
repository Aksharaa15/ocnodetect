import * as FileSystem from 'expo-file-system/legacy';
import type { CaseContext, ChatSession, UserProfile } from '../store/types';

const STATE_FILE_PATH = FileSystem.documentDirectory + 'ocnodetect_state.json';

interface PersistentState {
  savedCases?: CaseContext[];
  chatSessions?: ChatSession[];
  activeSessionId?: string | null;
  activeCase?: CaseContext | null;
  userProfile?: UserProfile;
  authToken?: string | null;
  isOnboarded?: boolean;
}

export async function saveMobileState(state: PersistentState) {
  try {
    const rawData = JSON.stringify(state, null, 2);
    await FileSystem.writeAsStringAsync(STATE_FILE_PATH, rawData, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    console.log('[Persistence] Saved mobile state to local storage successfully.');
  } catch (err) {
    console.error('[Persistence] Failed to save mobile state:', err);
  }
}

export async function loadMobileState(): Promise<PersistentState | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STATE_FILE_PATH);
    if (fileInfo.exists) {
      const rawData = await FileSystem.readAsStringAsync(STATE_FILE_PATH, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('[Persistence] Loaded mobile state from local storage successfully.');
      return JSON.parse(rawData);
    }
    console.log('[Persistence] No saved state found. Using defaults.');
    return null;
  } catch (err) {
    console.error('[Persistence] Failed to load mobile state:', err);
    return null;
  }
}

export async function wipeMobileState() {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STATE_FILE_PATH);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(STATE_FILE_PATH);
      console.log('[Persistence] Wiped mobile state successfully.');
    }
  } catch (err) {
    console.error('[Persistence] Failed to wipe mobile state:', err);
  }
}
