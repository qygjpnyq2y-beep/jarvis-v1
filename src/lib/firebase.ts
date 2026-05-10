import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import type { DiaryEntry, Painting, MediaFile, ChatSession, SemanticMemory, EpisodicMemory, MemoryRelation, MemoryTheme } from '@/types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function initFirebase(config: Record<string, string>): boolean {
  try {
    if (app) return true;
    app = initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
    return true;
  } catch (e) {
    console.error('[Firebase] Init error:', e);
    return false;
  }
}

export function isFirebaseReady(): boolean {
  return app !== null && db !== null;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

function getUserId(): string | null {
  return auth?.currentUser?.uid || localStorage.getItem('jarvis_uid') || 'anonymous';
}

// ─── Diary ───
export async function fbLoadDiary(): Promise<DiaryEntry[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'diary');
    const snap = await getDocs(query(ref, orderBy('ts', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DiaryEntry));
  } catch (e) {
    console.error('[Firebase] loadDiary error:', e);
    return [];
  }
}

export async function fbSaveDiary(entry: DiaryEntry): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'diary', entry.id), entry);
  } catch (e) {
    console.error('[Firebase] saveDiary error:', e);
  }
}

export async function fbDeleteDiary(id: string): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'diary', id));
  } catch (e) {
    console.error('[Firebase] deleteDiary error:', e);
  }
}

// ─── Paintings ───
export async function fbLoadPaintings(): Promise<Painting[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'paintings');
    const snap = await getDocs(query(ref, orderBy('ts', 'desc'), limit(30)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Painting));
  } catch (e) {
    console.error('[Firebase] loadPaintings error:', e);
    return [];
  }
}

export async function fbSavePainting(p: Painting): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'paintings', p.id), p);
  } catch (e) {
    console.error('[Firebase] savePainting error:', e);
  }
}

export async function fbDeletePainting(id: string): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'paintings', id));
  } catch (e) {
    console.error('[Firebase] deletePainting error:', e);
  }
}

// ─── Media ───
export async function fbLoadMedia(): Promise<MediaFile[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'media');
    const snap = await getDocs(query(ref, orderBy('ts', 'desc'), limit(30)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaFile));
  } catch (e) {
    console.error('[Firebase] loadMedia error:', e);
    return [];
  }
}

// ─── Sessions ───
export async function fbLoadSessions(): Promise<ChatSession[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'chats');
    const snap = await getDocs(query(ref, orderBy('ts', 'desc'), limit(20)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
  } catch (e) {
    console.error('[Firebase] loadSessions error:', e);
    return [];
  }
}

// ─── Semantic Memory ───
export async function fbLoadSemantic(): Promise<SemanticMemory[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'memory_semantic');
    const snap = await getDocs(query(ref, orderBy('lastSeen', 'desc'), limit(60)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SemanticMemory));
  } catch (e) {
    console.error('[Firebase] loadSemantic error:', e);
    return [];
  }
}

// ─── Episodic Memory ───
export async function fbLoadEpisodic(): Promise<EpisodicMemory[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'memory_episodic');
    const snap = await getDocs(query(ref, orderBy('date', 'desc'), limit(30)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EpisodicMemory));
  } catch (e) {
    console.error('[Firebase] loadEpisodic error:', e);
    return [];
  }
}

// ─── Relations ───
export async function fbLoadRelations(): Promise<MemoryRelation[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'memory_relations');
    const snap = await getDocs(query(ref, limit(50)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryRelation));
  } catch (e) {
    console.error('[Firebase] loadRelations error:', e);
    return [];
  }
}

// ─── Themes ───
export async function fbLoadThemes(): Promise<MemoryTheme[]> {
  if (!db) return [];
  const uid = getUserId();
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'memory_themes');
    const snap = await getDocs(query(ref, orderBy('frequency', 'desc'), limit(20)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryTheme));
  } catch (e) {
    console.error('[Firebase] loadThemes error:', e);
    return [];
  }
}

// ─── Generic save/delete helpers ───
export async function fbSaveDoc(col: string, id: string, data: Record<string, unknown>): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, col, id), data, { merge: true });
  } catch (e) {
    console.error('[Firebase] saveDoc error:', e);
  }
}

export async function fbDeleteDoc(col: string, id: string): Promise<void> {
  if (!db) return;
  const uid = getUserId();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid, col, id));
  } catch (e) {
    console.error('[Firebase] deleteDoc error:', e);
  }
}
