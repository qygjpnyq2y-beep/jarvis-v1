import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, BookOpen, Image, Music, MessageSquare,
  Network, Search, Trash2, FileImage, FileAudio, FileVideo,
  Upload, XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/lib/db';
import { isFirebaseReady, fbSaveDoc, fbDeleteDoc } from '@/lib/firebase';
import { loadAllCaches } from '@/lib/memory';
import type { DiaryEntry, Painting, MediaFile } from '@/types';

export default function MemoryPanel() {
  const { t } = useTranslation();
  const {
    showMemory, setShowMemory, setDiary, setPaintings, setMedia, setSessions,
    diary, paintings, media, sessions,
    r2Url,
  } = useAppStore();
  const [tab, setTab] = useState('diary');
  const [diaryText, setDiaryText] = useState('');
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQ, setSearchQ] = useState('');
  const [paintSearch, setPaintSearch] = useState('');
  const [paintPage, setPaintPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [loading, setLoading] = useState(false);

  const PPP = 30;

  // Load data from Firestore/IndexedDB → store when panel opens
  useEffect(() => {
    if (!showMemory) return;
    setLoading(true);
    loadAllCaches()
      .then(() => {
        // Sync memCache to store so React re-renders
        const s = useAppStore.getState();
        // Read from IndexedDB (which was synced by loadAllCaches)
        return Promise.all([
          db.diary.orderBy('ts').reverse().toArray(),
          db.paintings.orderBy('ts').reverse().limit(50).toArray(),
          db.media.orderBy('ts').reverse().limit(50).toArray(),
          db.sessions.orderBy('ts').reverse().limit(20).toArray(),
        ]).then(([d, p, m, ses]) => {
          s.setDiary(d);
          s.setPaintings(p);
          s.setMedia(m);
          s.setSessions(ses);
        });
      })
      .catch((e) => console.error('[MemoryPanel] Load error:', e))
      .finally(() => setLoading(false));
  }, [showMemory]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadAllCaches()
      .then(() =>
        Promise.all([
          db.diary.orderBy('ts').reverse().toArray(),
          db.paintings.orderBy('ts').reverse().limit(50).toArray(),
          db.media.orderBy('ts').reverse().limit(50).toArray(),
          db.sessions.orderBy('ts').reverse().limit(20).toArray(),
        ])
      )
      .then(([d, p, m, ses]) => {
        setDiary(d);
        setPaintings(p);
        setMedia(m);
        setSessions(ses);
      })
      .catch((e) => console.error('[MemoryPanel] Refresh error:', e))
      .finally(() => setLoading(false));
  }, [setDiary, setPaintings, setMedia, setSessions]);

  // ─── Diary ───
  const addDiary = async () => {
    if (!diaryText.trim()) return;
    const entry: DiaryEntry = {
      id: `diary_${Date.now()}`,
      date: diaryDate,
      text: diaryText.trim(),
      ts: Date.now(),
    };
    await db.diary.put(entry);
    if (isFirebaseReady()) await fbSaveDoc('diary', entry.id, entry);
    setDiary([entry, ...diary]);
    setDiaryText('');
  };

  const delDiary = async (id: string) => {
    await db.diary.delete(id);
    if (isFirebaseReady()) await fbDeleteDoc('diary', id);
    setDiary(diary.filter((d) => d.id !== id));
  };

  // ─── Paintings Upload ───
  const handlePaintUpload = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    let done = 0;
    const newEntries: Painting[] = [];
    for (const file of imageFiles) {
      setUploadProgress(`${done + 1}/${imageFiles.length} ${file.name}`);
      try {
        const b64 = await fileToB64(file);
        const thumb = await makeThumb(file);
        const entry: Painting = {
          id: `paint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          tags: [],
          date: new Date().toISOString().split('T')[0],
          thumb,
          full: b64,
          mime: 'image/jpeg',
          ts: Date.now(),
          fingerprint: fileFP(file),
        };
        await db.paintings.put(entry);
        if (isFirebaseReady()) await fbSaveDoc('paintings', entry.id, entry);
        newEntries.push(entry);
        done++;
      } catch (e) {
        console.error('Upload error:', e);
      }
    }
    setUploading(false);
    setUploadProgress('');
    setPaintPage(0);
    if (newEntries.length > 0) {
      setPaintings([...newEntries, ...paintings]);
    }
  };

  const delPaint = async (id: string) => {
    await db.paintings.delete(id);
    if (isFirebaseReady()) await fbDeleteDoc('paintings', id);
    setPaintings(paintings.filter((p) => p.id !== id));
  };

  // ─── Media Upload ───
  const handleMediaUpload = async (files: FileList | null) => {
    if (!files) return;
    const mediaFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );
    if (!mediaFiles.length) return;
    setUploading(true);
    let done = 0;
    const newEntries: MediaFile[] = [];
    for (const file of mediaFiles) {
      setUploadProgress(`${done + 1}/${mediaFiles.length} ${file.name}`);
      try {
        const entry: MediaFile = {
          id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          type: file.type.startsWith('audio/') ? 'music' : 'video',
          mimeType: file.type,
          size: file.size,
          tags: [],
          description: '',
          date: new Date().toISOString().split('T')[0],
          ts: Date.now(),
          fingerprint: fileFP(file),
        };
        await db.media.put(entry);
        if (isFirebaseReady()) await fbSaveDoc('media', entry.id, entry);
        newEntries.push(entry);
        done++;
      } catch (e) {
        console.error('Media upload error:', e);
      }
    }
    setUploading(false);
    setUploadProgress('');
    if (newEntries.length > 0) {
      setMedia([...newEntries, ...media]);
    }
  };

  const delMedia = async (id: string) => {
    await db.media.delete(id);
    if (isFirebaseReady()) await fbDeleteDoc('media', id);
    setMedia(media.filter((m) => m.id !== id));
  };

  // ─── Filters ───
  const filteredDiary = diary.filter((d) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return d.text.toLowerCase().includes(q) || d.date.includes(q);
  });

  const filteredPaintings = paintings.filter((p) => {
    if (!paintSearch) return true;
    const q = paintSearch.toLowerCase();
    const hay = [p.title, p.description].concat(p.tags || []).join(' ').toLowerCase();
    return hay.includes(q);
  });
  const paintEnd = Math.min((paintPage + 1) * PPP, filteredPaintings.length);

  if (!showMemory) return null;

  const tabs = [
    { key: 'diary', label: t('memory.tabs.diary'), icon: BookOpen },
    { key: 'paintings', label: t('memory.tabs.paintings'), icon: Image },
    { key: 'media', label: t('memory.tabs.media'), icon: Music },
    { key: 'chats', label: t('memory.tabs.chats'), icon: MessageSquare },
    { key: 'graph', label: t('memory.tabs.graph'), icon: Network },
    { key: 'search', label: t('memory.tabs.search'), icon: Search },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMemory(false)} />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-[#080c14]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{ animation: 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="px-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
              {t('memory.title')}
            </h2>
            <span className="text-[9px] text-blue-400/40 tracking-wider">
              {isFirebaseReady() ? t('memory.synced') : t('memory.local')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-blue-400 transition-colors disabled:opacity-30"
              title="Refresh"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMemory(false)}
              className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4 flex-shrink-0">
          <div className="flex border border-white/10 rounded-xl overflow-hidden bg-white/[0.03]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                  tab === t.key ? 'bg-blue-500/10 text-blue-400' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="px-6 mb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-blue-400 text-xs">Loading memory...</span>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="px-6 mb-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-blue-400 text-xs">{uploadProgress}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {/* ─── Diary Tab ─── */}
          {tab === 'diary' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  placeholder={t('memory.diary.placeholder')}
                  className="w-full h-24 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 resize-none"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={diaryDate}
                    onChange={(e) => setDiaryDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm focus:outline-none focus:border-blue-500/30"
                  />
                  <button
                    onClick={addDiary}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-xs tracking-wider hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    {t('memory.diary.add')}
                  </button>
                </div>
              </div>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t('memory.diary.search')}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
              />
              <p className="text-xs text-white/30">
                {t('memory.diary.count', { count: filteredDiary.length })}
              </p>
              <div className="space-y-2">
                {filteredDiary.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-blue-400/60 font-medium">{entry.date}</span>
                      <button
                        onClick={() => delDiary(entry.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">{entry.text}</p>
                  </div>
                ))}
                {filteredDiary.length === 0 && (
                  <p className="text-sm text-white/20 text-center py-8">{t('memory.search.empty')}</p>
                )}
              </div>
            </div>
          )}

          {/* ─── Paintings Tab ─── */}
          {tab === 'paintings' && (
            <div className="space-y-4">
              {/* Upload zone */}
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.03]"
                onClick={() => document.getElementById('paintInput')?.click()}
              >
                <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm">{t('memory.paintings.upload')}</p>
                <p className="text-white/20 text-[10px] mt-1">{t('memory.paintings.bulk')}</p>
              </div>
              <input
                type="file"
                id="paintInput"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePaintUpload(e.target.files)}
              />
              <input
                value={paintSearch}
                onChange={(e) => { setPaintSearch(e.target.value); setPaintPage(0); }}
                placeholder={t('memory.paintings.search')}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
              />
              <p className="text-xs text-white/30">
                {filteredPaintings.length} paintings
              </p>
              <div className="grid grid-cols-3 gap-2">
                {filteredPaintings.slice(0, paintEnd).map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] relative group"
                  >
                    {p.thumb ? (
                      <img src={p.thumb} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-[10px] text-white/80 truncate">{p.title}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); delPaint(p.id); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {paintEnd < filteredPaintings.length && (
                <button
                  onClick={() => setPaintPage((p) => p + 1)}
                  className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/30 text-sm hover:text-blue-400 hover:border-blue-500/20 transition-all"
                >
                  {t('memory.paintings.loadMore')} ({filteredPaintings.length - paintEnd})
                </button>
              )}
            </div>
          )}

          {/* ─── Media Tab ─── */}
          {tab === 'media' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.03]"
                onClick={() => document.getElementById('mediaInput')?.click()}
              >
                <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm">{t('memory.media.drop')}</p>
                <p className="text-white/20 text-[10px] mt-1">{t('memory.media.types')}</p>
              </div>
              <input
                type="file"
                id="mediaInput"
                multiple
                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) => handleMediaUpload(e.target.files)}
              />
              <p className="text-xs text-white/30">
                {t('memory.media.count', { count: media.length })}
              </p>
              <div className="space-y-2">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      {m.type === 'music' ? <FileAudio className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 truncate">{m.title}</p>
                      <p className="text-[11px] text-white/30">
                        {m.type} &middot; {(m.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => delMedia(m.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {media.length === 0 && (
                  <p className="text-sm text-white/20 text-center py-8">
                    {r2Url ? t('memory.media.drop') : t('memory.media.configure')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── Chats Tab ─── */}
          {tab === 'chats' && (
            <div>
              <p className="text-xs text-white/30 mb-3">
                {t('memory.chats.count', { count: sessions.length })}
              </p>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/30">
                        {new Date(s.ts).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">{s.preview || 'New chat'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Graph Tab ─── */}
          {tab === 'graph' && (
            <div>
              <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-2 uppercase opacity-80">
                {t('memory.graph.title')}
              </h3>
              <p className="text-xs text-white/30 mb-4">{t('memory.graph.subtitle')}</p>
              <p className="text-sm text-white/20 text-center py-8">{t('memory.graph.empty')}</p>
            </div>
          )}

          {/* ─── Search Tab ─── */}
          {tab === 'search' && (
            <div>
              <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
                {t('memory.search.placeholder')}
              </h3>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t('memory.search.placeholder')}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 mb-4"
              />
              {searchQ && (
                <div className="space-y-2">
                  {filteredDiary.slice(0, 5).map((d) => (
                    <div key={d.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-[10px] text-blue-400/60">{d.date}</span>
                      <p className="text-sm text-white/50 line-clamp-2">{d.text}</p>
                    </div>
                  ))}
                  {filteredDiary.length === 0 && (
                    <p className="text-sm text-white/20 text-center py-8">{t('memory.search.empty')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function makeThumb(file: File, sz = 200): Promise<string> {
  return new Promise((resolve) => {
    const i = document.createElement('img');
    i.onload = () => {
      const w = i.width, h = i.height;
      const ra = Math.min(sz / w, sz / h);
      const nw = Math.round(w * ra), nh = Math.round(h * ra);
      const c = document.createElement('canvas');
      c.width = nw;
      c.height = nh;
      c.getContext('2d')!.drawImage(i, 0, 0, nw, nh);
      resolve(c.toDataURL('image/jpeg', 0.65));
      URL.revokeObjectURL(i.src);
    };
    i.src = URL.createObjectURL(file);
  });
}

function fileFP(f: File): string {
  return f.name + '__' + f.size + '__' + f.lastModified;
}
