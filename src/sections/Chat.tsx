import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Paperclip, Loader2, User, Bot,
  RefreshCw, Settings, Brain, BarChart3,
  Image as ImageIcon, FileText, Music, Video,
  X, ChevronDown,
} from 'lucide-react';
import { useAppStore, PRESETS, MODELS } from '@/store/useAppStore';
import { streamChat } from '@/lib/openrouter';
import {
  loadAllCaches, buildMemCtx, saveChatSession,
  isMealRequest, recommendMeal, saveMeal,
  extractMemoriesAsync, searchPaintFor, searchMediaFor,
  fetchUrlAsB64, hasR2, getR2Url,
} from '@/lib/memory';
import type { Message, Attachment } from '@/types';

export default function Chat() {
  const { t } = useTranslation();
  const {
    orKey, activeModel, activePreset, isCustom, customPrompt,
    setShowSettings, setShowMemory, setShowReport,
  } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionId] = useState(() => `ses_${Date.now()}`);
  const [streamingText, setStreamingText] = useState('');

  const scrollToBottom = () => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages, streamingText]);

  const handleScroll = () => {
    if (!msgContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = msgContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const getSystemPrompt = useCallback(() => {
    const persona = isCustom ? customPrompt : PRESETS[activePreset]?.prompt || PRESETS[0].prompt;
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const timeStr = kstNow.getUTCFullYear() + '-' + String(kstNow.getUTCMonth() + 1).padStart(2, '0') + '-' + String(kstNow.getUTCDate()).padStart(2, '0') + ' ' + String(kstNow.getUTCHours()).padStart(2, '0') + ':' + String(kstNow.getUTCMinutes()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[kstNow.getUTCDay()];
    const timeCtx = '\n[CURRENT TIME] ' + timeStr + ' (' + dayName + '요일) KST\n';
    const memCtx = buildMemCtx();
    return persona + timeCtx + memCtx;
  }, [isCustom, customPrompt, activePreset, activeModel]);

  const fileToB64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAtts: Attachment[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToB64(file);
      const cat: Attachment['category'] = file.type.startsWith('image/')
        ? 'image' : file.type.startsWith('video/')
        ? 'video' : file.type.startsWith('audio/')
        ? 'audio' : 'file';
      newAtts.push({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        category: cat,
        mime: file.type,
        preview: cat === 'image' || cat === 'video' || cat === 'audio' ? URL.createObjectURL(file) : undefined,
        b64,
        size: file.size,
      });
    }
    setAttachments((prev) => [...prev, ...newAtts]);
  };

  const removeAtt = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  // ─── Meal recommendation (from original jarvis.html) ───
  const handleMealRequest = useCallback(async (text: string): Promise<boolean> => {
    if (!isMealRequest(text)) return false;
    const lower = text.toLowerCase();
    const r: string[] = [];
    if (/아침|breakfast|morning/.test(lower)) r.push('breakfast');
    if (/점심|lunch/.test(lower)) r.push('lunch');
    if (/저녁|dinner|evening|밤/.test(lower)) r.push('dinner');
    if (!r.length) r.push('auto');
    const mType = r[0] === 'auto'
      ? (() => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : 'dinner'; })()
      : r[0];
    const typeKor: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' };

    setLoading(true);
    try {
      const res = await recommendMeal(mType, orKey, activeModel);
      const reply = '[' + typeKor[mType] + ' 추천] ' + res.menu + '\n' + res.reason + ' (' + res.cuisine + ')';
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_bot`, role: 'assistant', content: reply, ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await saveMeal(mType, res.menu, res.reason);
    } catch (e) {
      const errMsg: Message = {
        id: `msg_${Date.now()}_bot`, role: 'assistant', content: '추천 생성 중 문제가 생겼어. 다시 시도해 줄래?', ts: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
    return true;
  }, [orKey, activeModel]);

  // ─── Main send message (from original jarvis.html) ───
  const sendMessage = async () => {
    const text = input.trim();
    const hasAtt = attachments.length > 0;

    // Meal request check (from original)
    if ((!hasAtt || text.length < 60) && isMealRequest(text)) {
      const handled = await handleMealRequest(text);
      if (handled) { setInput(''); setAttachments([]); return; }
    }

    if ((!text && !hasAtt) || loading || !orKey) return;

    // Wait for attachments to be ready
    const notReady = attachments.some((a) => !a.b64);
    if (notReady) return;

    const curAtt = [...attachments];

    // Build user message
    const userContent: any[] = [];
    const relevant = searchPaintFor(text);
    const relevantMedia = searchMediaFor(text);

    // Add attachments to user content
    curAtt.forEach((a) => {
      if (a.category === 'image') {
        userContent.push({ type: 'image_url', image_url: { url: 'data:' + a.mime + ';base64,' + a.b64 } });
      } else if (a.category === 'audio') {
        let normMime = a.mime;
        if (normMime === 'audio/vnd.wave' || normMime === 'audio/wave' || normMime === 'audio/x-wav') normMime = 'audio/wav';
        userContent.push({ type: 'image_url', image_url: { url: 'data:' + normMime + ';base64,' + a.b64 } });
      } else if (a.category === 'video') {
        userContent.push({ type: 'text', text: '[Attached video: ' + a.name + ']' });
      } else {
        userContent.push({ type: 'text', text: '[Attached file: ' + a.name + ']' });
      }
    });

    // Add relevant paintings to context
    if (relevant.length) {
      userContent.push({ type: 'text', text: '[Relevant paintings from your collection:]' });
      relevant.slice(0, 3).forEach((rp) => {
        userContent.push({ type: 'text', text: '"' + rp.title + '" (' + rp.date + ')' + (rp.description ? ' - ' + rp.description : '') });
        if (rp.full) userContent.push({ type: 'image_url', image_url: { url: rp.full.startsWith('data:') ? rp.full : 'data:image/jpeg;base64,' + rp.full } });
      });
    }

    // Add user text
    userContent.push({ type: 'text', text: text || 'Describe this file.' });

    // Add relevant media
    let mediaFetchPromise: Promise<any> = Promise.resolve();
    const r2Url = getR2Url();
    if (relevantMedia.length && hasR2()) {
      userContent.push({ type: 'text', text: '[Relevant audio/video from your library:]' });
      const mediaPromises = relevantMedia.map((rm) => {
        userContent.push({ type: 'text', text: '"' + rm.title + '" (' + rm.type + ', ' + rm.fileName + ')' });
        if ((rm.r2Key || rm.storageUrl) && rm.type === 'music') {
          const getUrl = rm.r2Key
            ? fetch(r2Url + '/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: rm.r2Key }) }).then((r) => r.json()).then((d) => d.downloadUrl)
            : Promise.resolve(rm.storageUrl);
          return getUrl.then((url: string) => fetchUrlAsB64(url)).then((b64) => {
            let mime = rm.mimeType || 'audio/mpeg';
            if (mime === 'audio/vnd.wave' || mime === 'audio/wave' || mime === 'audio/x-wav') mime = 'audio/wav';
            userContent.push({ type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } });
          }).catch((e) => console.error('[JARVIS] Media fetch error:', rm.title, e));
        }
        return Promise.resolve();
      });
      mediaFetchPromise = Promise.all(mediaPromises);
    }

    // Clear input
    setInput('');
    setAttachments([]);

    // Show user message
    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text || (curAtt.length === 1 ? curAtt[0].name : curAtt.length + ' files'),
      attachments: curAtt.length > 0 ? curAtt : undefined,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    await mediaFetchPromise;

    // Build API messages
    const apiContent = userContent.length === 1 && userContent[0].type === 'text'
      ? userContent[0].text
      : userContent;

    const newMessages = [...messages, { ...userMsg, content: apiContent }];

    const systemPrompt = getSystemPrompt();

    try {
      let fullReply = '';
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));

      for await (const chunk of streamChat(apiMessages, orKey, activeModel, systemPrompt)) {
        fullReply += chunk;
        setStreamingText(fullReply);
      }

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_bot`, role: 'assistant', content: fullReply, ts: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingText('');

      // Save chat session to Firestore (from original)
      const plainMessages = finalMessages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }));
      await saveChatSession(sessionId, plainMessages);

      // Extract memories every 3 user messages (from original)
      const userCount = finalMessages.filter((m) => m.role === 'user').length;
      if (userCount > 0 && userCount % 3 === 0) {
        setTimeout(() => {
          extractMemoriesAsync(plainMessages.slice(-6), orKey, activeModel);
        }, 600);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t('chat.error');
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_bot`, role: 'assistant', content: 'Error: ' + errorMsg, ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const refreshMemory = async () => {
    try {
      await loadAllCaches();
    } catch (e) {
      console.error('Memory refresh error:', e);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatContent = (content: string) => {
    return content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const attIcon = (cat: Attachment['category']) => {
    switch (cat) { case 'image': return <ImageIcon className="w-4 h-4" />; case 'audio': return <Music className="w-4 h-4" />; case 'video': return <Video className="w-4 h-4" />; default: return <FileText className="w-4 h-4" />; }
  };

  const personaName = isCustom ? 'Custom' : PRESETS[activePreset]?.name || 'Jarvis';

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-500/[0.03] blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-2xl border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-blue-500/40 bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm"
            style={{ fontFamily: "'Space Mono', monospace", boxShadow: '0 0 20px rgba(92,157,255,0.1)' }}>
            J
          </div>
          <div>
            <div className="text-sm font-bold text-blue-400 tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>JARVIS</div>
            <div className="text-[10px] text-white/30">{personaName} · {MODELS[activeModel]?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={clearChat} className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/30 hover:text-blue-400 hover:border-blue-500/30 transition-all" title="Clear Chat">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={refreshMemory} className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/30 hover:text-blue-400 hover:border-blue-500/30 transition-all" title="Refresh Memory">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowMemory(true)} className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/30 hover:text-blue-400 hover:border-blue-500/30 transition-all" title="Memory">
            <Brain className="w-4 h-4" />
          </button>
          <button onClick={() => setShowReport(true)} className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/30 hover:text-blue-400 hover:border-blue-500/30 transition-all" title="Report">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/30 hover:text-blue-400 hover:border-blue-500/30 transition-all" title={t('settings.title')}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={msgContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[50vh] gap-5">
            <div className="text-5xl font-bold text-blue-400 tracking-widest" style={{ fontFamily: "'Space Mono', monospace", filter: 'drop-shadow(0 0 30px rgba(92,157,255,0.2))', animation: 'pulse 3s infinite' }}>
              JARVIS
            </div>
            <div className="text-center text-white/30 text-sm leading-relaxed">
              <span className="text-blue-400">{personaName}</span> {t('app.online')}.<br />
              <span className="text-xs">{t('app.saySomething')}</span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-white/10 text-white/60' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'assistant' && (
                <div className="text-[9px] text-blue-400/50 tracking-[3px] font-semibold mb-1 ml-1 uppercase">{personaName}</div>
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att) => (
                    <div key={att.id} className="group relative">
                      {att.category === 'image' && att.preview ? (
                        <img src={att.preview} alt={att.name} className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => window.open(att.preview, '_blank')} />
                      ) : att.category === 'video' && att.preview ? (
                        <video src={att.preview} className="w-32 rounded-xl border border-white/10" controls />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 text-xs">
                          {attIcon(att.category)}<span className="truncate max-w-[120px]">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className={`px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-black font-medium rounded-[20px] rounded-br-md shadow-lg shadow-blue-500/20' : 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] text-white/70 rounded-[20px] rounded-bl-md'}`}
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[82%]">
              <div className="text-[9px] text-blue-400/50 tracking-[3px] font-semibold mb-1 ml-1 uppercase">{personaName}</div>
              <div className="px-4 py-3 text-sm leading-relaxed bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] text-white/70 rounded-[20px] rounded-bl-md"
                dangerouslySetInnerHTML={{ __html: formatContent(streamingText) }} />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0"><Bot className="w-3.5 h-3.5" /></div>
            <div className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-[20px] rounded-bl-md"><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /></div>
          </div>
        )}
        <div ref={msgEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button onClick={scrollToBottom} className="absolute bottom-24 right-6 z-20 w-8 h-8 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/30 transition-all">
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input bar */}
      <div className="relative z-10 px-4 py-3 bg-black/60 backdrop-blur-2xl border-t border-white/[0.08] flex-shrink-0">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {attachments.map((att) => (
              <div key={att.id} className="relative flex-shrink-0">
                {att.category === 'image' && att.preview ? (
                  <img src={att.preview} className="w-14 h-14 rounded-lg object-cover border border-white/10" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center gap-0.5">
                    {attIcon(att.category)}<span className="text-[8px] text-blue-400 uppercase font-semibold">{att.name.split('.').pop()}</span>
                  </div>
                )}
                <button onClick={() => removeAtt(att.id)} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${attachments.length > 0 ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-white/10 text-white/30 bg-white/[0.03] hover:text-blue-400 hover:border-blue-500/30'}`}>
            <Paperclip className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.csv,.json,.md" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t('chat.placeholder')} disabled={loading}
            className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 focus:bg-blue-500/[0.02] focus:ring-3 focus:ring-blue-500/5 transition-all disabled:opacity-50" />
          <button onClick={sendMessage} disabled={(!input.trim() && attachments.length === 0) || loading || !orKey}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${input.trim() || attachments.length > 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95' : 'bg-white/[0.04] text-white/20 cursor-not-allowed'}`}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
