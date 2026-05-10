export type Lang = 'en' | 'es' | 'ja' | 'ko' | 'de';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  ts: number;
}

export interface Attachment {
  id: string;
  name: string;
  category: 'image' | 'video' | 'audio' | 'file';
  mime: string;
  preview?: string;
  b64?: string;
  size: number;
}

export interface ChatSession {
  id: string;
  sessionId: string;
  preview: string;
  messages: Message[];
  ts: number;
  messageCount: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  text: string;
  ts: number;
}

export interface Painting {
  id: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  thumb: string;
  full: string;
  mime: string;
  ts: number;
  fingerprint: string;
}

export interface MediaFile {
  id: string;
  title: string;
  fileName: string;
  type: 'music' | 'video';
  mimeType: string;
  size: number;
  tags: string[];
  description: string;
  date: string;
  ts: number;
  fingerprint: string;
  r2Key?: string;
  storageUrl?: string;
}

export interface SemanticMemory {
  id: string;
  type: string;
  content: string;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  frequency: number;
  importance: number;
}

export interface EpisodicMemory {
  id: string;
  date: string;
  summary: string;
  importance: number;
  topics: string[];
  ts: number;
}

export interface MemoryRelation {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  ts: number;
}

export interface MemoryTheme {
  id: string;
  theme: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  desc: string;
  provider: string;
}

export interface PresetPersona {
  name: string;
  desc: string;
  prompt: string;
}

export interface OnboardingStep {
  mode: 'starter' | 'advanced';
  hasFirebase: boolean;
  hasR2: boolean;
}

export interface NotifSettings {
  inactivity: boolean;
  diary_reminder: boolean;
  weekly_summary: boolean;
  birthday: boolean;
  holidays: boolean;
  meal_recommendation: boolean;
}

export interface AppState {
  lang: Lang;
  onboarding: OnboardingStep;
  orKey: string;
  activeModel: number;
  activePreset: number;
  isCustom: boolean;
  customPrompt: string;
  r2Url: string;
  persona: PresetPersona[];
  models: ModelInfo[];
  notifSettings: NotifSettings;
  userBirthday: string;
}
