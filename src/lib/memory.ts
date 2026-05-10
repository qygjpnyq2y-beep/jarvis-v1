// ═════════════════════════════════════════════════════════════════════════════
// JARVIS Memory System — matches original jarvis.html data flow exactly
// ═════════════════════════════════════════════════════════════════════════════

import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type {
  DiaryEntry, Painting, MediaFile, ChatSession,
  SemanticMemory, EpisodicMemory, MemoryRelation, MemoryTheme, MealEntry,
} from '@/types';

// ─── Global caches (exactly like original jarvis.html) ───
export const diaryCache: DiaryEntry[] = [];
export const paintCache: Painting[] = [];
export const mediaCache: MediaFile[] = [];
export const chatSessionsCache: ChatSession[] = [];
export const mealsCache: MealEntry[] = [];

export const memCache = {
  semantic: [] as SemanticMemory[],
  episodic: [] as EpisodicMemory[],
  relations: [] as MemoryRelation[],
  themes: [] as MemoryTheme[],
};

// ─── Internal state ───
let _db: Firestore | null = null;
let _authUid: string | null = null;

// ─── Init (call after Firebase auth is ready) ───
export function initMemorySystem(db: Firestore, authUid: string) {
  _db = db;
  _authUid = authUid;
}

function uCol(name: string) {
  if (!_db || !_authUid) throw new Error('Firebase not ready');
  return collection(_db, 'users', _authUid, name);
}

function uDoc(col: string, id: string) {
  if (!_db || !_authUid) throw new Error('Firebase not ready');
  return doc(_db, 'users', _authUid, col, id);
}

export function hasR2(): boolean {
  return !!localStorage.getItem('jarvis_r2_url');
}

export function getR2Url(): string {
  return localStorage.getItem('jarvis_r2_url') || '';
}

export function setR2Url(url: string) {
  if (url) localStorage.setItem('jarvis_r2_url', url);
  else localStorage.removeItem('jarvis_r2_url');
}

export function getCurrentUid(): string | null {
  return _authUid;
}

// ─── uid helper ───
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Load all caches from Firestore (exactly like original) ───
export async function loadAllCaches(): Promise<void> {
  if (!_db || !_authUid) {
    console.warn('[JARVIS] loadAllCaches: Firebase not ready');
    return;
  }

  const tasks: { name: string; promise: Promise<any[]> }[] = [
    { name: 'diary', promise: getDocs(query(uCol('diary'), orderBy('date', 'desc'))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as DiaryEntry))) },
    { name: 'paintings', promise: getDocs(query(uCol('paintings'), orderBy('ts', 'desc'))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as Painting))) },
    { name: 'chats', promise: getDocs(query(uCol('chats'), orderBy('ts', 'desc'), limit(50))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as ChatSession))) },
    { name: 'semantic', promise: getDocs(query(uCol('memory_semantic'), orderBy('lastSeen', 'desc'), limit(60))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as SemanticMemory))) },
    { name: 'episodic', promise: getDocs(query(uCol('memory_episodic'), orderBy('date', 'desc'), limit(30))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as EpisodicMemory))) },
    { name: 'relations', promise: getDocs(query(uCol('memory_relations'), limit(50))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as MemoryRelation))) },
    { name: 'themes', promise: getDocs(query(uCol('memory_themes'), orderBy('frequency', 'desc'), limit(20))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as MemoryTheme))) },
  ];

  if (hasR2()) {
    tasks.push({ name: 'media', promise: getDocs(query(uCol('media'), orderBy('ts', 'desc'))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as MediaFile))) });
    tasks.push({ name: 'meals', promise: getDocs(query(uCol('meals'), orderBy('ts', 'desc'), limit(21))).then((s) => s.docs.map((x) => ({ id: x.id, ...x.data() } as MealEntry))) });
  }

  try {
    const results = await Promise.all(tasks.map((t) => t.promise));
    results.forEach((data, idx) => {
      const name = tasks[idx].name;
      switch (name) {
        case 'diary': diaryCache.length = 0; diaryCache.push(...data); break;
        case 'paintings': paintCache.length = 0; paintCache.push(...data); break;
        case 'chats': chatSessionsCache.length = 0; chatSessionsCache.push(...data); break;
        case 'semantic': memCache.semantic.length = 0; memCache.semantic.push(...data); break;
        case 'episodic': memCache.episodic.length = 0; memCache.episodic.push(...data); break;
        case 'relations': memCache.relations.length = 0; memCache.relations.push(...data); break;
        case 'themes': memCache.themes.length = 0; memCache.themes.push(...data); break;
        case 'media': mediaCache.length = 0; mediaCache.push(...data); break;
        case 'meals': mealsCache.length = 0; mealsCache.push(...data); break;
      }
    });
    console.log('[JARVIS] loadAllCaches done:', {
      diary: diaryCache.length,
      paintings: paintCache.length,
      media: mediaCache.length,
      chats: chatSessionsCache.length,
      semantic: memCache.semantic.length,
      meals: mealsCache.length,
    });
    // Notify all subscribers (MemoryPanel, etc.)
    window.dispatchEvent(new CustomEvent('jarvis:cache-loaded', {
      detail: { diary: diaryCache.length, paintings: paintCache.length, media: mediaCache.length },
    }));
  } catch (e) {
    console.error('[JARVIS] loadAllCaches error:', e);
  }
}

// ─── Diary helpers ───
export async function addDiaryEntry(text: string, date: string): Promise<void> {
  const entry: DiaryEntry = { id: genId(), date: date || new Date().toISOString().split('T')[0], text, ts: Date.now() };
  diaryCache.unshift(entry);
  if (_db && _authUid) {
    try { await addDoc(uCol('diary'), entry); } catch (e) { console.error('[JARVIS] addDiary error:', e); }
  }
}

export async function delDiaryEntry(id: string): Promise<void> {
  const idx = diaryCache.findIndex((d) => d.id === id);
  if (idx > -1) diaryCache.splice(idx, 1);
  if (_db && _authUid) {
    try { await deleteDoc(uDoc('diary', id)); } catch (e) { console.error('[JARVIS] delDiary error:', e); }
  }
}

// ─── Painting helpers ───
export async function addPainting(entry: Painting): Promise<string> {
  paintCache.unshift(entry);
  if (_db && _authUid) {
    try {
      const ref = await addDoc(uCol('paintings'), entry);
      entry.id = ref.id;
      return ref.id;
    } catch (e) { console.error('[JARVIS] addPainting error:', e); }
  }
  return entry.id;
}

export async function delPainting(id: string): Promise<void> {
  const idx = paintCache.findIndex((p) => p.id === id);
  if (idx > -1) paintCache.splice(idx, 1);
  if (_db && _authUid) {
    try { await deleteDoc(uDoc('paintings', id)); } catch (e) { console.error('[JARVIS] delPainting error:', e); }
  }
}

export async function updatePainting(id: string, data: Partial<Painting>): Promise<void> {
  const idx = paintCache.findIndex((p) => p.id === id);
  if (idx > -1) Object.assign(paintCache[idx], data);
  if (_db && _authUid) {
    try { await updateDoc(uDoc('paintings', id), data); } catch (e) { console.error('[JARVIS] updatePainting error:', e); }
  }
}

// ─── Media helpers ───
export async function addMedia(entry: MediaFile): Promise<void> {
  mediaCache.unshift(entry);
  if (_db && _authUid) {
    try { await addDoc(uCol('media'), entry); } catch (e) { console.error('[JARVIS] addMedia error:', e); }
  }
}

export async function delMedia(id: string): Promise<void> {
  const idx = mediaCache.findIndex((m) => m.id === id);
  if (idx > -1) mediaCache.splice(idx, 1);
  if (_db && _authUid) {
    try { await deleteDoc(uDoc('media', id)); } catch (e) { console.error('[JARVIS] delMedia error:', e); }
  }
}

// ─── Chat session helpers ───
export async function saveChatSession(sessionId: string, messages: any[]): Promise<void> {
  if (!_db || !_authUid || !messages.length) return;
  const firstU = messages.find((m) => m.role === 'user');
  const data = {
    sessionId,
    preview: (firstU ? (typeof firstU.content === 'string' ? firstU.content : JSON.stringify(firstU.content)) : 'New chat').substring(0, 100),
    messages: messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
    ts: Date.now(),
    messageCount: messages.length,
    source: 'web',
  };
  const existing = chatSessionsCache.find((c) => c.sessionId === sessionId);
  if (existing) {
    Object.assign(existing, data);
    try { await setDoc(uDoc('chats', existing.id!), data); } catch (e) {}
  } else {
    try {
      const ref = await addDoc(uCol('chats'), data);
      chatSessionsCache.unshift({ ...data, id: ref.id } as unknown as ChatSession);
    } catch (e) {}
  }
}

export async function delChatSession(id: string): Promise<void> {
  const idx = chatSessionsCache.findIndex((c) => c.id === id);
  if (idx > -1) chatSessionsCache.splice(idx, 1);
  if (_db && _authUid) {
    try { await deleteDoc(uDoc('chats', id)); } catch (e) {}
  }
}

// ─── Meal helpers ───
export async function saveMeal(mealType: string, menu: string, reason: string): Promise<void> {
  const entry: MealEntry = { id: genId(), date: new Date().toISOString().split('T')[0], mealType, menu, reason: reason || '', ts: Date.now() };
  mealsCache.unshift(entry);
  if (_db && _authUid) {
    try { await addDoc(uCol('meals'), entry); } catch (e) {}
  }
}

// ─── Memory extraction helpers ───
export async function storeExtractedMemories(data: any): Promise<void> {
  if (!_db || !_authUid) return;

  for (const s of (data.semantic || [])) {
    const ex = findSimilarSemantic(s.content);
    if (ex) {
      const update = {
        frequency: (ex.frequency || 1) + 1,
        lastSeen: Date.now(),
        confidence: Math.max(ex.confidence || 0, s.confidence || 0.5),
        importance: Math.min(10, (ex.importance || 5) + 0.3),
      };
      Object.assign(ex, update);
      try { await updateDoc(uDoc('memory_semantic', ex.id!), update); } catch (e) {}
    } else {
      const doc = { type: s.type || 'general', content: s.content, confidence: s.confidence || 0.5, firstSeen: Date.now(), lastSeen: Date.now(), frequency: 1, importance: s.importance || 5, ts: Date.now() };
      try {
        const ref = await addDoc(uCol('memory_semantic'), doc);
        memCache.semantic.unshift({ ...doc, id: ref.id } as SemanticMemory);
      } catch (e) {}
    }
  }

  for (const e of (data.episodic || [])) {
    const doc = { date: e.date || new Date().toISOString().split('T')[0], summary: e.summary, importance: e.importance || 5, topics: e.topics || [], ts: Date.now() };
    try {
      const ref = await addDoc(uCol('memory_episodic'), doc);
      memCache.episodic.unshift({ ...doc, id: ref.id } as EpisodicMemory);
    } catch (err) {}
  }

  for (const r of (data.relations || [])) {
    const dup = memCache.relations.find((x) => x.source === r.source && x.target === r.target && x.type === r.type);
    if (!dup) {
      const doc = { source: r.source, target: r.target, type: r.type, strength: r.strength || 0.5, ts: Date.now() };
      try {
        const ref = await addDoc(uCol('memory_relations'), doc);
        memCache.relations.unshift({ ...doc, id: ref.id } as MemoryRelation);
      } catch (err) {}
    }
  }

  for (const t of (data.themes || [])) {
    const ex = memCache.themes.find((x) => x.theme === t);
    if (ex) {
      try { await updateDoc(uDoc('memory_themes', ex.id!), { frequency: (ex.frequency || 1) + 1, lastSeen: Date.now() }); } catch (err) {}
      ex.frequency = (ex.frequency || 1) + 1;
      ex.lastSeen = Date.now();
    } else {
      const doc = { theme: t, frequency: 1, firstSeen: Date.now(), lastSeen: Date.now() };
      try {
        const ref = await addDoc(uCol('memory_themes'), doc);
        memCache.themes.unshift({ ...doc, id: ref.id } as MemoryTheme);
      } catch (err) {}
    }
  }
}

// ─── Decay / search helpers ───
export function computeDecay(mem: SemanticMemory): number {
  const days = (Date.now() - (mem.lastSeen || Date.now())) / 86400000;
  const freq = mem.frequency || 1;
  const access = (mem as any).accessCount || 0;
  const base = mem.importance || 5;
  const decay = base * Math.exp(-0.04 * days);
  const reinforcement = Math.log1p(freq) * 0.6 + access * 0.2;
  return Math.min(10, Math.max(0.1, decay + reinforcement));
}

export function findSimilarSemantic(content: string): SemanticMemory | null {
  const c = content.toLowerCase().trim();
  const words = c.split(/\s+/).filter((w) => w.length > 1);
  for (let i = 0; i < memCache.semantic.length; i++) {
    const s = memCache.semantic[i];
    if (s.content.toLowerCase().trim() === c) return s;
    let match = 0;
    words.forEach((w) => { if (s.content.toLowerCase().indexOf(w) >= 0) match++; });
    if (match >= Math.max(2, words.length * 0.5)) return s;
  }
  return null;
}

export function isMealRequest(text: string): boolean {
  const t = text.toLowerCase().replace(/[.,?!~]/g, '');
  const nonFoodTopics = /(영화|드라마|책|도서|음악|노래|게임|울동|헬스|회의|일정|약속|여행|옷|쇼핑|공부|학교|회사|업무|프로젝트|코딩|개발|만화|애니|넷플|왓챠|디즈니|유튜브|tv|television|movie|book|music|song|game|exercise|work|study|travel|shopping|netflix|watch|see|read|play|listen|만나|친구|데이트|향수|향|화장품|뷰티|화장|패션|신발|가방|시계|악세서리|선글라스|코디|스킨|로션|립스틱|perfume|cosmetic|beauty|fashion|shoes|bag|watch|accessory)/;
  if (nonFoodTopics.test(t)) return false;
  const foodCore = /(밥|먹|메뉴|식사|요리|간식|디저트|맛집|배고파|배고픔|출출|해장|다이어트|식단|영양|반찬|국|찌개|구이|볶음|면|빵|커피|음료|breakfast|lunch|dinner|food|eat|meal|menu|cook|hungry|snack|recipe)/;
  return foodCore.test(t);
}

// ─── buildMemCtx (original from jarvis.html) ───
export function buildMemCtx(): string {
  let ctx = '';
  if (diaryCache.length) {
    const sorted = [...diaryCache].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    ctx += '\n\n[USER\'S DIARY]\n';
    sorted.forEach((d) => { ctx += '--- ' + d.date + ' ---\n' + d.text + '\n\n'; });
    ctx += '[END DIARY]\n';
  }
  if (mealsCache.length) {
    ctx += '\n[RECENT MEALS (LAST 14)]\n';
    mealsCache.slice(0, 14).forEach((m) => { ctx += '- ' + m.date + ' ' + m.mealType + ': ' + m.menu + '\n'; });
    ctx += '[END MEALS]\n';
  }
  if (memCache.semantic.length) {
    const active = memCache.semantic
      .map((s) => ({ ...s, activeScore: computeDecay(s) }))
      .filter((s) => s.activeScore > 1.5)
      .sort((a, b) => b.activeScore - a.activeScore)
      .slice(0, 15);
    if (active.length) {
      ctx += '\n[SEMANTIC MEMORY - WHO USER IS]\n';
      active.forEach((s) => { ctx += '- [' + s.type + '] ' + s.content + ' (relevance:' + s.activeScore.toFixed(1) + ')\n'; });
      ctx += '[END SEMANTIC]\n';
    }
  }
  if (memCache.episodic.length) {
    ctx += '\n[EPISODIC MEMORY - RECENT EVENTS]\n';
    memCache.episodic.slice(0, 8).forEach((e) => { ctx += '- ' + e.date + ': ' + e.summary + ' (importance:' + e.importance + ')\n'; });
    ctx += '[END EPISODIC]\n';
  }
  if (memCache.themes.length) {
    ctx += '\n[RECURRING THEMES]\n';
    memCache.themes.slice(0, 6).forEach((t) => { ctx += '- ' + t.theme + ' (freq:' + t.frequency + ')\n'; });
    ctx += '[END THEMES]\n';
  }
  if (memCache.relations.length) {
    ctx += '\n[RELATIONAL MEMORY]\n';
    memCache.relations.slice(0, 10).forEach((r) => { ctx += '- ' + r.source + ' \u2192 ' + r.target + ' (' + r.type + ')\n'; });
    ctx += '[END RELATIONS]\n';
  }
  if (paintCache.length) {
    ctx += '\n[PAINTINGS - ' + paintCache.length + ' works]\n';
    paintCache.forEach((p) => { const t = (p.tags || []).join(', '); ctx += '- "' + p.title + '" (' + p.date + ')' + (t ? ' [' + t + ']' : '') + (p.description ? ' - ' + p.description : '') + '\n'; });
    ctx += '[END CATALOG]\n';
  }
  if (mediaCache.length) {
    ctx += '\n[MEDIA - ' + mediaCache.length + ' files]\n';
    mediaCache.forEach((m) => { ctx += '- "' + m.title + '" (' + m.type + ')' + ((m as any).storageUrl ? ' [audio available]' : '') + ((m.tags && m.tags.length) ? ' [' + m.tags.join(', ') + ']' : '') + (m.description ? ' - ' + m.description : '') + '\n'; });
    ctx += '[END MEDIA]\n';
  }
  if (chatSessionsCache.length) {
    const recent = chatSessionsCache.slice(0, 5);
    ctx += '\n[RECENT CONVERSATIONS]\n';
    recent.forEach((c) => {
      ctx += '\n--- ' + fmtDate(c.ts) + ' ---\n';
      if (c.messages && c.messages.length) {
        c.messages.slice(-10).forEach((m) => {
          const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          ctx += (m.role === 'assistant' ? 'Jarvis' : 'User') + ': ' + content.substring(0, 250) + '\n';
        });
      }
    });
    ctx += '[END CONVERSATIONS]\n';
  }
  return ctx;
}

// ─── Search helpers for Chat context ───
export function searchPaintFor(q: string): Painting[] {
  if (!q || !paintCache.length) return [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = paintCache.map((p) => {
    const hay = [p.title, p.description].concat(p.tags || []).join(' ').toLowerCase();
    let s = 0;
    terms.forEach((t) => { if (hay.indexOf(t) >= 0) s += 1; if ((p.tags || []).indexOf(t) >= 0) s += 2; if (p.title.toLowerCase().indexOf(t) >= 0) s += 1.5; });
    return { ...p, _score: s };
  }).filter((x) => x._score > 0);
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 5);
}

export function searchMediaFor(q: string): MediaFile[] {
  if (!q || !mediaCache.length) return [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = mediaCache.map((m) => {
    const hay = [m.title, m.description || '', m.fileName || ''].concat(m.tags || []).join(' ').toLowerCase();
    let s = 0;
    terms.forEach((t) => { if (hay.indexOf(t) >= 0) s += 1; if ((m.tags || []).indexOf(t) >= 0) s += 2; if (m.title.toLowerCase().indexOf(t) >= 0) s += 1.5; });
    return { ...m, _score: s };
  }).filter((x) => x._score > 0 && (x as any).storageUrl);
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 2);
}

export async function recommendMeal(mealType: string, orKey: string, activeModel: number): Promise<{ menu: string; reason: string; cuisine: string }> {
  const recent = mealsCache.slice(0, 10).map((m) => m.menu || '?');
  const prefs = memCache.semantic.filter((s) => s.type === 'preference' || s.type === 'food' || /(맛|먹|음식|요리|매운|달콤|건강)/.test(s.content));
  const diaryNotes = diaryCache.slice(0, 14).map((d) => d.date + ': ' + d.text).join('\n');
  const typeKor: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
  const mealKor = typeKor[mealType] || mealType;
  const prompt = '너는 Jarvis야. 사용자의 ' + mealKor + ' 메뉴를 하나 추천해줘.\n\n' +
    '[최근 추천했던 메뉴 (이건 피해줘)]\n' + recent.join(', ') + '\n\n' +
    '[사용자 취향]\n' + prefs.map((p) => '- ' + p.content).join('\n') + '\n\n' +
    '[사용자의 최근 일기 (식단, 기분, 상황을 참고해서 추천해)]\n' + diaryNotes + '\n\n' +
    '현재 시간 (KST): ' + new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString() + '\n\n' +
    '반드시 아래 JSON 형식으로만 응답해. 모든 값은 한국어로 작성해야 해.\n' +
    '{"menu":"메뉴 이름","reason":"추천 이유","cuisine":"한식|양식|중식|일식|기타"}';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + orKey },
    body: JSON.stringify({ model: activeModel, messages: [{ role: 'user', content: prompt }], max_tokens: 500 }),
  });
  const data = await res.json();
  const c = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(c);
}

export async function extractMemoriesAsync(recentMessages: any[], orKey: string, activeModel: number): Promise<void> {
  if (!orKey) return;
  const text = recentMessages.map((m) => {
    const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return (m.role === 'assistant' ? 'Jarvis' : 'User') + ': ' + c.substring(0, 400);
  }).join('\n');
  const prompt = 'Analyze this conversation and extract memories. Return ONLY JSON.\n' +
    'Schema: {"semantic":[{"type":"interest|project|value|emotion|goal|preference|food","content":"...","confidence":0.9}],"episodic":[{"date":"YYYY-MM-DD","summary":"...","importance":8,"topics":["..."]}],"relations":[{"source":"...","target":"...","type":"relates_to|part_of|contradicts|prefers","strength":0.8}],"themes":["..."]}\n' +
    'Rules:\n- Use Korean for content if user wrote Korean.\n- importance: 1-10. Routine=2, Major decisions=9.\n- relations connect concepts (e.g., Privacy \u2192 Self-hosting).\n- Do NOT extract greetings.\n\nConversation:\n' + text;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + orKey },
      body: JSON.stringify({ model: activeModel, messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }),
    });
    const data = await res.json();
    if (data.error || !data.choices) return;
    const c = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
    await storeExtractedMemories(JSON.parse(c));
  } catch (e) {
    console.error('[JARVIS] Memory extract error:', e);
  }
}

export async function fetchUrlAsB64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fmtDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
