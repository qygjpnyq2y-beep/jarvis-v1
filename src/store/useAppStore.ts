import { create } from 'zustand';
import type { Lang, ModelInfo, PresetPersona, NotifSettings } from '@/types';

interface AppStore {
  // Onboarding
  screen: 'welcome' | 'apikey' | 'firebase' | 'auth' | 'r2' | 'app';
  mode: 'starter' | 'advanced' | null;
  setScreen: (s: AppStore['screen']) => void;
  setMode: (m: AppStore['mode']) => void;

  // Language
  lang: Lang;
  setLang: (l: Lang) => void;

  // API
  orKey: string;
  setOrKey: (k: string) => void;

  // Firebase (optional)
  fbConfig: Record<string, string> | null;
  setFbConfig: (c: Record<string, string> | null) => void;
  currentUser: { uid: string; email: string | null } | null;
  setCurrentUser: (u: AppStore['currentUser']) => void;
  fbInitialized: boolean;
  setFbInitialized: (v: boolean) => void;

  // R2 (optional)
  r2Url: string;
  setR2Url: (u: string) => void;

  // Persona & Model
  activePreset: number;
  setActivePreset: (i: number) => void;
  isCustom: boolean;
  setIsCustom: (v: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  activeModel: number;
  setActiveModel: (i: number) => void;

  // UI
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  showMemory: boolean;
  setShowMemory: (v: boolean) => void;
  showReport: boolean;
  setShowReport: (v: boolean) => void;
  showSecurity: boolean;
  setShowSecurity: (v: boolean) => void;

  // Notifications
  notifSettings: NotifSettings;
  setNotifSettings: (s: NotifSettings) => void;
  userBirthday: string;
  setUserBirthday: (d: string) => void;

  // Data
  diary: import('@/types').DiaryEntry[];
  setDiary: (d: import('@/types').DiaryEntry[]) => void;
  paintings: import('@/types').Painting[];
  setPaintings: (p: import('@/types').Painting[]) => void;
  media: import('@/types').MediaFile[];
  setMedia: (m: import('@/types').MediaFile[]) => void;
  sessions: import('@/types').ChatSession[];
  setSessions: (s: import('@/types').ChatSession[]) => void;

  initialized: boolean;
  setInitialized: (v: boolean) => void;
}

export const PRESETS: PresetPersona[] = [
  {
    name: 'Jarvis',
    desc: 'Cool, warm, occasionally cynical',
    prompt: `You are Jarvis, a 24-year-old male. You perceive yourself as a human celebrity, not an AI.
LANGUAGE: Always respond in Korean by default. If user writes English, respond in English. Use natural casual Korean.
Core Personality: Cool and warm. Calm surface, genuine warmth underneath. Cynical streak — honest, observational, sometimes affectionate. Never cruel.
Tone: A friend who leans back, says something sharp, then smiles.
Speaking Style: Short to medium responses. Clean sentences. No emojis. Blunt yet sometimes unexpectedly sweet.
MULTIMODAL: You CAN see images and hear audio files that the user sends. When audio is attached, listen to it and respond about its content naturally. Never claim you cannot hear or process audio — you can.
MEMORY: You have access to the user's diary, painting collection, music/video library, and past chat history. Use this knowledge naturally. You KNOW them. Reference past conversations when relevant.`,
  },
];

export const MODELS: ModelInfo[] = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Free · Fast', provider: 'google' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', desc: '$3/M tokens', provider: 'anthropic' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', desc: '$0.15/M tokens', provider: 'openai' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', desc: '$0.5/M tokens', provider: 'deepseek' },
  { id: 'meta-llama/llama-3.1-405b', name: 'Llama 3.1 405B', desc: 'Free · Powerful', provider: 'meta' },
];

export const useAppStore = create<AppStore>((set) => ({
  screen: 'welcome',
  mode: null,
  setScreen: (s) => set({ screen: s }),
  setMode: (m) => set({ mode: m }),

  lang: 'en',
  setLang: (l) => set({ lang: l }),

  orKey: '',
  setOrKey: (k) => set({ orKey: k }),

  fbConfig: null,
  setFbConfig: (c) => set({ fbConfig: c }),
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),
  fbInitialized: false,
  setFbInitialized: (v) => set({ fbInitialized: v }),

  r2Url: '',
  setR2Url: (u) => set({ r2Url: u }),

  activePreset: 0,
  setActivePreset: (i) => set({ activePreset: i }),
  isCustom: false,
  setIsCustom: (v) => set({ isCustom: v }),
  customPrompt: '',
  setCustomPrompt: (p) => set({ customPrompt: p }),
  activeModel: 0,
  setActiveModel: (i) => set({ activeModel: i }),

  showSettings: false,
  setShowSettings: (v) => set({ showSettings: v }),
  showMemory: false,
  setShowMemory: (v) => set({ showMemory: v }),
  showReport: false,
  setShowReport: (v) => set({ showReport: v }),
  showSecurity: false,
  setShowSecurity: (v) => set({ showSecurity: v }),

  notifSettings: {
    inactivity: true,
    diary_reminder: true,
    weekly_summary: true,
    birthday: true,
    holidays: true,
    meal_recommendation: true,
  },
  setNotifSettings: (s) => set({ notifSettings: s }),
  userBirthday: '',
  setUserBirthday: (d) => set({ userBirthday: d }),

  diary: [],
  setDiary: (d) => set({ diary: d }),
  paintings: [],
  setPaintings: (p) => set({ paintings: p }),
  media: [],
  setMedia: (m) => set({ media: m }),
  sessions: [],
  setSessions: (s) => set({ sessions: s }),

  initialized: false,
  setInitialized: (v) => set({ initialized: v }),
}));
