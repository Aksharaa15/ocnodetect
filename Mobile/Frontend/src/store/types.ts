export type TabKey = 'home' | 'scan' | 'chat' | 'ref' | 'profile';

export type CaseContext = {
  patientId: string;
  site: string;
  tnm: string;
  confidence?: number;
  findings?: string[];
  differentials?: Array<{ diagnosis: string; probability: string }>;
  surgicalConsiderations?: string[];
  protocol?: string;
  prognosticFactors?: string[];
  multidisciplinaryRecommendations?: string[];
  date?: string;
  userId?: string;
};
export type UserProfile = {
  name: string;
  specialty: string;
  institution: string;
};

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  t: string;
}

export interface ChatSession {
  id: string;
  patientId: string;
  title: string;
  messages: ChatMessage[];
  caseContext: CaseContext;
  date: string;
}
