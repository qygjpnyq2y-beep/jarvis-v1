import { db } from './db';
import {
  isFirebaseReady,
  fbLoadDiary,
  fbLoadPaintings,
  fbLoadMedia,
  fbLoadSessions,
  fbLoadSemantic,
  fbLoadEpisodic,
  fbLoadRelations,
  fbLoadThemes,
} from './firebase';
import type { DiaryEntry, Painting, MediaFile, ChatSession, SemanticMemory, EpisodicMemory, MemoryRelation, MemoryTheme } from '@/types';

// In-memory caches (like original jarvis.html)
export const memCache = {
  diary: [] as DiaryEntry[],
  paintings: [] as Painting[],
  media: [] as MediaFile[],
  sessions: [] as ChatSession[],
  semantic: [] as SemanticMemory[],
  episodic: [] as EpisodicMemory[],
  relations: [] as MemoryRelation[],
  themes: [] as MemoryTheme[],
};

export async function loadAllCaches(): Promise<void> {
  if (isFirebaseReady()) {
    // Firebase connected: read from Firestore
    console.log('[JARVIS] Loading caches from Firestore...');
    const [diary, paintings, media, sessions, semantic, episodic, relations, themes] = await Promise.all([
      fbLoadDiary(),
      fbLoadPaintings(),
      fbLoadMedia(),
      fbLoadSessions(),
      fbLoadSemantic(),
      fbLoadEpisodic(),
      fbLoadRelations(),
      fbLoadThemes(),
    ]);
    memCache.diary = diary;
    memCache.paintings = paintings;
    memCache.media = media;
    memCache.sessions = sessions;
    memCache.semantic = semantic;
    memCache.episodic = episodic;
    memCache.relations = relations;
    memCache.themes = themes;

    // Also sync to IndexedDB for offline
    await Promise.all([
      ...diary.map((item) => db.diary.put(item)),
      ...paintings.map((item) => db.paintings.put(item)),
      ...media.map((item) => db.media.put(item)),
      ...sessions.map((item) => db.sessions.put(item)),
    ]);
  } else {
    // Local only: read from IndexedDB
    console.log('[JARVIS] Loading caches from IndexedDB...');
    const [diary, paintings, media, sessions] = await Promise.all([
      db.diary.orderBy('ts').reverse().toArray(),
      db.paintings.orderBy('ts').reverse().limit(30).toArray(),
      db.media.orderBy('ts').reverse().limit(30).toArray(),
      db.sessions.orderBy('ts').reverse().limit(20).toArray(),
    ]);
    memCache.diary = diary;
    memCache.paintings = paintings;
    memCache.media = media;
    memCache.sessions = sessions;
  }
}
