import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, BookOpen, Image, Music, MessageSquare,
  Network, Search, Trash2,
  FileImage, FileAudio, FileVideo,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/lib/db';
import type { DiaryEntry, Painting, MediaFile, ChatSession } from '@/types';

export default function MemoryPanel() {
  const { t } = useTranslation();
  const { showMemory, setShowMemory } = useAppStore();
  const [tab, setTab] = useState('diary');
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [diaryText, setDiaryText] = useState('');
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    if (!showMemory) return;
    loadData();
  }, [showMemory, tab]);

  const loadData = async () => {
    const [d, p, m, s] = await Promise.all([
      db.diary.orderBy('ts').reverse().toArray(),
      db.paintings.orderBy('ts').reverse().limit(30).toArray(),
      db.media.orderBy('ts').reverse().limit(30).toArray(),
      db.sessions.orderBy('ts').reverse().limit(20).toArray(),
    ]);
    setDiary(d);
    setPaintings(p);
    setMedia(m);
    setSessions(s);
  };

  const addDiary = async () => {
    if (!diaryText.trim()) return;
    const entry: DiaryEntry = {
      id: `diary_${Date.now()}`,
      date: diaryDate,
      text: diaryText.trim(),
      ts: Date.now(),
    };
    await db.diary.put(entry);
    setDiary((prev) => [entry, ...prev]);
    setDiaryText('');
  };

  const delDiary = async (id: string) => {
    await db.diary.delete(id);
    setDiary((prev) => prev.filter((d) => d.id !== id));
  };

  const filteredDiary = diary.filter((d) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return d.text.toLowerCase().includes(q) || d.date.includes(q);
  });

  const delSession = async (id: string) => {
    await db.sessions.delete(id);
    await db.messages.where('sessionId').equals(id).delete();
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

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
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-[#080c14]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{ animation: 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="px-6 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
            {t('memory.title')}
          </h2>
          <button onClick={() => setShowMemory(false)} className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4 flex-shrink-0">
          <div className="flex border border-white/10 rounded-xl overflow-hidden bg-white/[0.03]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                  tab === t.key
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {/* Diary Tab */}
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

              <p className="text-xs text-white/30">{t('memory.diary.count', { count: filteredDiary.length })}</p>

              <div className="space-y-2">
                {filteredDiary.map((entry) => (
                  <div key={entry.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-blue-400/60 font-medium">{entry.date}</span>
                      <button
                        onClick={() => delDiary(entry.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed line-clamp-3">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paintings Tab */}
          {tab === 'paintings' && (
            <div>
              <p className="text-xs text-white/30 mb-3">{t('memory.paintings.count', { count: paintings.length })}</p>
              <div className="grid grid-cols-3 gap-2">
                {paintings.map((p) => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] relative group">
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
                  </div>
                ))}
              </div>
              {paintings.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  {t('memory.paintings.upload')}
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {tab === 'media' && (
            <div>
              <p className="text-xs text-white/30 mb-3">{t('memory.media.count', { count: media.length })}</p>
              <div className="space-y-2">
                {media.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      {m.type === 'music' ? <FileAudio className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 truncate">{m.title}</p>
                      <p className="text-[11px] text-white/30">{m.type} · {(m.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
              {media.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  {t('memory.media.drop')}
                </div>
              )}
            </div>
          )}

          {/* Chats Tab */}
          {tab === 'chats' && (
            <div>
              <p className="text-xs text-white/30 mb-3">{t('memory.chats.count', { count: sessions.length })}</p>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/30">{new Date(s.ts).toLocaleDateString()}</span>
                      <button
                        onClick={() => delSession(s.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">{s.preview || 'New chat'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graph Tab */}
          {tab === 'graph' && (
            <div>
              <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-2 uppercase opacity-80">
                {t('memory.graph.title')}
              </h3>
              <p className="text-xs text-white/30 mb-4">{t('memory.graph.subtitle')}</p>
              <div className="text-center py-12 text-white/20 text-sm">
                {t('memory.graph.empty')}
              </div>
            </div>
          )}

          {/* Search Tab */}
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
