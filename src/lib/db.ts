import Dexie, { type Table } from 'dexie';
import type {
  Message, ChatSession, DiaryEntry, Painting,
  MediaFile, SemanticMemory, EpisodicMemory,
  MemoryRelation, MemoryTheme,
} from '@/types';

export class JarvisDB extends Dexie {
  messages!: Table<Message>;
  sessions!: Table<ChatSession>;
  diary!: Table<DiaryEntry>;
  paintings!: Table<Painting>;
  media!: Table<MediaFile>;
  semantic!: Table<SemanticMemory>;
  episodic!: Table<EpisodicMemory>;
  relations!: Table<MemoryRelation>;
  themes!: Table<MemoryTheme>;
  settings!: Table<{ key: string; value: unknown }>;

  constructor() {
    super('jarvis_db');
    this.version(1).stores({
      messages: 'id, sessionId, ts',
      sessions: 'id, sessionId, ts',
      diary: 'id, date, ts',
      paintings: 'id, ts, fingerprint',
      media: 'id, ts, fingerprint',
      semantic: 'id, type, lastSeen, content',
      episodic: 'id, date, ts',
      relations: 'id, source, target, type',
      themes: 'id, theme, frequency',
      settings: 'key',
    });
  }
}

export const db = new JarvisDB();

export async function getSetting<T>(key: string, fallback?: T): Promise<T> {
  const row = await db.settings.get(key);
  return (row?.value as T) ?? fallback!;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
