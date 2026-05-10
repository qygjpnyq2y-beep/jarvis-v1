import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, BookOpen, Image, Music, MessageSquare,
  Network, Search, Trash2, FileImage, FileAudio, FileVideo,
  Upload, XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  diaryCache, paintCache, mediaCache, chatSessionsCache, memCache,
  addDiaryEntry, delDiaryEntry, addPainting, delPainting,
  addMedia, delMedia, delChatSession, loadAllCaches,
  computeDecay, hasR2, genId,
} from '@/lib/memory';
import type { Painting, MediaFile, SemanticMemory } from '@/types';

export default function MemoryPanel() {
  const { t } = useTranslation();
  const { showMemory, setShowMemory } = useAppStore();
  const [tab, setTab] = useState('diary');
  const [diaryText, setDiaryText] = useState('');
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQ, setSearchQ] = useState('');
  const [paintSearch, setPaintSearch] = useState('');
  const [paintPage, setPaintPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [forceVer, setForceVer] = useState(0);
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);
  const PPP = 30;

  // Subscribe to cache-loaded events
  useEffect(() => {
    const handler = () => setForceVer((v) => v + 1);
    window.addEventListener('jarvis:cache-loaded', handler);
    return () => window.removeEventListener('jarvis:cache-loaded', handler);
  }, []);

  // Force re-render helper
  const refresh = useCallback(() => {
    loadAllCaches().then(() => setForceVer((v) => v + 1));
  }, []);

  // ─── Diary ───
  const handleAddDiary = async () => {
    if (!diaryText.trim()) return;
    await addDiaryEntry(diaryText.trim(), diaryDate);
    setDiaryText('');
    setForceVer((v) => v + 1);
  };

  const handleDelDiary = async (id: string) => {
    await delDiaryEntry(id);
    setForceVer((v) => v + 1);
  };

  // ─── Paintings ───
  const handlePaintUpload = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    let done = 0;
    for (const file of imageFiles) {
      setUploadProgress(`${done + 1}/${imageFiles.length} ${file.name}`);
      try {
        const [thumb, full] = await Promise.all([makeThumb(file, 200), resizeImg(file, 1024)]);
        const entry: Painting = {
          id: genId(),
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          tags: [],
          date: new Date().toISOString().split('T')[0],
          thumb: 'data:image/jpeg;base64,' + thumb,
          full: 'data:image/jpeg;base64,' + full,
          mime: 'image/jpeg',
          ts: Date.now(),
          fingerprint: fileFP(file),
        };
        await addPainting(entry);
        done++;
      } catch (e) {
        console.error('Paint upload error:', e);
      }
    }
    setUploading(false);
    setUploadProgress('');
    setPaintPage(0);
    setForceVer((v) => v + 1);
  };

  const handleDelPaint = async (id: string) => {
    await delPainting(id);
    setForceVer((v) => v + 1);
  };

  // openPaintDetail placeholder for future painting detail view

  // ─── Media ───
  const handleMediaUpload = async (files: FileList | null) => {
    if (!files) return;
    const mediaFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );
    if (!mediaFiles.length) return;
    setUploading(true);
    let done = 0;
    for (const file of mediaFiles) {
      setUploadProgress(`${done + 1}/${mediaFiles.length} ${file.name}`);
      try {
        const entry: MediaFile = {
          id: genId(),
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
        await addMedia(entry);
        done++;
      } catch (e) {
        console.error('Media upload error:', e);
      }
    }
    setUploading(false);
    setUploadProgress('');
    setForceVer((v) => v + 1);
  };

  const handleDelMedia = async (id: string) => {
    await delMedia(id);
    setForceVer((v) => v + 1);
  };

  // ─── Chats ───
  const handleDelChat = async (id: string) => {
    await delChatSession(id);
    setForceVer((v) => v + 1);
  };

  // ─── Filters ───
  const filteredDiary = diaryCache.filter((d) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return d.text.toLowerCase().includes(q) || d.date.includes(q);
  });

  const filteredPaintings = paintCache.filter((p) => {
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
    <div className="fixed inset-0 z-50" key={forceVer}>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/94 backdrop-blur-xl z-[100] flex items-center justify-center cursor-zoom-out" onClick={() => setLightbox(null)}>
          {lightbox.type === 'image' ? (
            <img src={lightbox.url} className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain shadow-2xl" />
          ) : (
            <video src={lightbox.url} controls autoPlay className="max-w-[92vw] max-h-[88vh] rounded-xl" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white text-xl hover:bg-white/20 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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
              synced to cloud
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-blue-400 transition-colors" title="Refresh">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowMemory(false)} className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4 flex-shrink-0">
          <div className="flex border border-white/10 rounded-xl overflow-hidden bg-white/[0.03]">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'graph') setForceVer((v) => v + 1); }} className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${tab === t.key ? 'bg-blue-500/10 text-blue-400' : 'text-white/30 hover:text-white/50'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

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
                  value={diaryText} onChange={(e) => setDiaryText(e.target.value)}
                  placeholder={t('memory.diary.placeholder')}
                  className="w-full h-24 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 resize-none"
                />
                <div className="flex gap-2">
                  <input type="date" value={diaryDate} onChange={(e) => setDiaryDate(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm focus:outline-none focus:border-blue-500/30" />
                  <button onClick={handleAddDiary} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-xs tracking-wider hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
                    {t('memory.diary.add')}
                  </button>
                </div>
              </div>
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder={t('memory.diary.search')} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30" />
              <p className="text-xs text-white/30">{diaryCache.length} entries</p>
              <div className="space-y-2">
                {filteredDiary.map((entry) => (
                  <div key={entry.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-blue-400/60 font-medium">{entry.date}</span>
                      <button onClick={() => handleDelDiary(entry.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">{entry.text}</p>
                  </div>
                ))}
                {filteredDiary.length === 0 && <p className="text-sm text-white/20 text-center py-8">{t('memory.search.empty')}</p>}
              </div>
            </div>
          )}

          {/* ─── Paintings Tab ─── */}
          {tab === 'paintings' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.03]" onClick={() => document.getElementById('paintInput')?.click()}>
                <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm">{t('memory.paintings.upload')}</p>
                <p className="text-white/20 text-[10px] mt-1">{t('memory.paintings.bulk')}</p>
              </div>
              <input type="file" id="paintInput" multiple accept="image/*" className="hidden" onChange={(e) => handlePaintUpload(e.target.files)} />
              <input value={paintSearch} onChange={(e) => { setPaintSearch(e.target.value); setPaintPage(0); }} placeholder={t('memory.paintings.search')} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30" />
              <p className="text-xs text-white/30">{paintCache.length} paintings</p>
              <div className="grid grid-cols-3 gap-2">
                {filteredPaintings.slice(0, paintEnd).map((p) => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] relative group cursor-pointer" onClick={() => setLightbox({ url: p.thumb, type: 'image' })}>
                    {p.thumb ? <img src={p.thumb} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileImage className="w-8 h-8 text-white/20" /></div>}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-[10px] text-white/80 truncate">{p.title}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelPaint(p.id); }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {paintEnd < filteredPaintings.length && (
                <button onClick={() => setPaintPage((p) => p + 1)} className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/30 text-sm hover:text-blue-400 hover:border-blue-500/20 transition-all">
                  {t('memory.paintings.loadMore')} ({filteredPaintings.length - paintEnd})
                </button>
              )}
            </div>
          )}

          {/* ─── Media Tab ─── */}
          {tab === 'media' && (
            <div className="space-y-4">
              {hasR2() ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.03]" onClick={() => document.getElementById('mediaInput')?.click()}>
                  <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">Drop music or video files</p>
                  <p className="text-white/20 text-[10px] mt-1">MP3, WAV, MP4, WebM</p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-red-500/15 rounded-xl p-6 text-center" style={{ borderColor: 'rgba(255,95,95,0.15)' }}>
                  <p className="text-white/30 text-sm">Media uploads disabled</p>
                  <p className="text-white/20 text-[10px] mt-1">Configure R2 Worker in Settings to enable</p>
                </div>
              )}
              <input type="file" id="mediaInput" multiple accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm" className="hidden" onChange={(e) => handleMediaUpload(e.target.files)} />
              <p className="text-xs text-white/30">{mediaCache.length} media files</p>
              <div className="space-y-2">
                {mediaCache.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      {m.type === 'music' ? <FileAudio className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 truncate">{m.title}</p>
                      <p className="text-[11px] text-white/30">{m.type} &middot; {(m.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={() => handleDelMedia(m.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {mediaCache.length === 0 && <p className="text-sm text-white/20 text-center py-8">{hasR2() ? 'Drop music or video files' : 'No R2 Worker configured'}</p>}
              </div>
            </div>
          )}

          {/* ─── Chats Tab ─── */}
          {tab === 'chats' && (
            <div>
              <p className="text-xs text-white/30 mb-3">{chatSessionsCache.length} conversations</p>
              <div className="space-y-2">
                {chatSessionsCache.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/30">{new Date(s.ts).toLocaleDateString()}</span>
                      <button onClick={() => handleDelChat(s.id!)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">{s.preview || 'New chat'}</p>
                  </div>
                ))}
                {chatSessionsCache.length === 0 && <p className="text-sm text-white/20 text-center py-8">No conversations yet</p>}
              </div>
            </div>
          )}

          {/* ─── Graph Tab ─── */}
          {tab === 'graph' && (
            <div>
              {(() => {
                const byType: Record<string, SemanticMemory[]> = {};
                memCache.semantic.forEach((s) => { if (!byType[s.type]) byType[s.type] = []; byType[s.type].push(s); });
                return (
                  <>
                    {Object.keys(byType).map((type) => (
                      <div key={type}>
                        <div className="text-[11px] text-blue-400 tracking-[1.5px] font-bold my-4">{type.toUpperCase()}</div>
                        {byType[type].sort((a, b) => computeDecay(b) - computeDecay(a)).slice(0, 6).map((s) => (
                          <div key={s.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between mb-2">
                            <span className="text-xs text-white/50">{s.content}</span>
                            <span className="text-[11px] text-white/20">{computeDecay(s).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {memCache.relations.length > 0 && (
                      <>
                        <div className="text-[11px] text-blue-400 tracking-[1.5px] font-bold mt-5 mb-3">RELATIONS</div>
                        {memCache.relations.slice(0, 15).map((r) => (
                          <div key={r.id} className="pl-4 mb-2 text-[11px] text-white/20 border-l-2 border-white/[0.06]">
                            <span className="text-blue-400/40">&rarr; </span>{r.source} &rarr; {r.target} <span className="text-blue-400/50">{r.type}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {memCache.episodic.length > 0 && (
                      <>
                        <div className="text-[11px] text-blue-400 tracking-[1.5px] font-bold mt-5 mb-3">EPISODIC TIMELINE</div>
                        {memCache.episodic.slice(0, 5).map((e) => (
                          <div key={e.id} className="p-3 rounded-xl bg-white/[0.03] border border-yellow-500/15 mb-2">
                            <span className="text-[11px] text-yellow-400 mr-3">{e.date}</span>
                            <span className="text-xs text-white/50">{e.summary}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {memCache.semantic.length === 0 && memCache.relations.length === 0 && memCache.episodic.length === 0 && (
                      <p className="text-sm text-white/20 text-center py-8">No memory graph yet.<br />Chat more to build it.</p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ─── Search Tab ─── */}
          {tab === 'search' && (
            <div>
              <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">CROSS-MEMORY SEARCH</h3>
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search across semantic, episodic, diary..." className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 mb-4" />
              {searchQ && (() => {
                const qTerms = searchQ.toLowerCase().split(/\s+/).filter(Boolean);
                const scored: Array<{ item: any; type: string; score: number }> = [];
                memCache.semantic.forEach((s) => { const text = (s.content + ' ' + s.type).toLowerCase(); let score = 0; qTerms.forEach((t) => { if (text.indexOf(t) >= 0) score += 3; }); if (score) scored.push({ item: s, type: 'semantic', score }); });
                memCache.episodic.forEach((e) => { const text = (e.summary + ' ' + (e.topics || []).join(' ')).toLowerCase(); let score = 0; qTerms.forEach((t) => { if (text.indexOf(t) >= 0) score += 3; }); if (score) scored.push({ item: e, type: 'episodic', score }); });
                diaryCache.forEach((d) => { const text = (d.text + ' ' + d.date).toLowerCase(); let score = 0; qTerms.forEach((t) => { if (text.indexOf(t) >= 0) score += 2; }); if (score) scored.push({ item: d, type: 'diary', score }); });
                scored.sort((a, b) => b.score - a.score);
                return (
                  <div className="space-y-2">
                    {scored.slice(0, 25).map((r, i) => {
                      if (r.type === 'semantic') return <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between"><span className="text-xs text-white/50"><span className="text-blue-400 mr-2">[{r.item.type}]</span>{r.item.content}</span><span className="text-[11px] text-white/20">{r.score}</span></div>;
                      if (r.type === 'episodic') return <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-yellow-500/15"><span className="text-yellow-400 text-[11px]">[EVENT]</span> <span className="text-xs text-white/50">{r.item.date}: {r.item.summary}</span></div>;
                      return <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]"><span className="text-[10px] text-blue-400/60">{r.item.date}</span><p className="text-sm text-white/50 line-clamp-2">{r.item.text}</p></div>;
                    })}
                    {scored.length === 0 && <p className="text-sm text-white/20 text-center py-8">{t('memory.search.empty')}</p>}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
function makeThumb(file: File, sz = 200): Promise<string> {
  return new Promise((resolve) => {
    const i = document.createElement('img');
    i.onload = () => {
      const w = i.width, h = i.height;
      const ra = Math.min(sz / w, sz / h);
      const nw = Math.round(w * ra), nh = Math.round(h * ra);
      const c = document.createElement('canvas');
      c.width = nw; c.height = nh;
      c.getContext('2d')!.drawImage(i, 0, 0, nw, nh);
      resolve(c.toDataURL('image/jpeg', 0.65).split(',')[1]);
      URL.revokeObjectURL(i.src);
    };
    i.src = URL.createObjectURL(file);
  });
}

function resizeImg(file: File, max = 1024): Promise<string> {
  return new Promise((resolve) => {
    const i = document.createElement('img');
    i.onload = () => {
      let w = i.width, h = i.height;
      if (w > max || h > max) { const ra = Math.min(max / w, max / h); w = Math.round(w * ra); h = Math.round(h * ra); }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(i, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.8).split(',')[1]);
      URL.revokeObjectURL(i.src);
    };
    i.src = URL.createObjectURL(file);
  });
}

function fileFP(f: File): string {
  return f.name + '__' + f.size + '__' + f.lastModified;
}
