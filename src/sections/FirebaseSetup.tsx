import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ArrowRight, SkipForward, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db';
import { initFirebase, isFirebaseReady, ensureAuth, getFirebaseDb } from '@/lib/firebase';
import { initMemorySystem, loadAllCaches } from '@/lib/memory';

export default function FirebaseSetup() {
  const { t } = useTranslation();
  const { setScreen, setFbConfig, setFbInitialized, setCurrentUser, orKey } = useAppStore();
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success'>('idle');

  const connect = async () => {
    const raw = configJson.trim();
    setError('');
    if (!raw) {
      setError(t('onboarding.firebase.error'));
      return;
    }
    setStatus('connecting');
    try {
      let cfg: Record<string, string>;
      if (raw.startsWith('{')) {
        cfg = JSON.parse(raw);
      } else {
        cfg = JSON.parse(raw.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"'));
      }
      if (!cfg.apiKey || !cfg.projectId) {
        setError('Missing apiKey or projectId');
        setStatus('idle');
        return;
      }

      // Actually initialize Firebase SDK
      const ok = initFirebase(cfg);
      if (!ok) {
        setError('Failed to initialize Firebase. Check your config.');
        setStatus('idle');
        return;
      }

      if (!isFirebaseReady()) {
        setError('Firebase SDK init failed silently.');
        setStatus('idle');
        return;
      }

      // Authenticate to get REAL Firebase UID (critical for correct Firestore path)
      const uid = await ensureAuth();
      if (!uid) {
        setError('Firebase auth failed. Cannot access Firestore data.');
        setStatus('idle');
        return;
      }

      // Save to IndexedDB
      setFbConfig(cfg);
      await setSetting('fbConfig', cfg);
      setFbInitialized(true);
      setCurrentUser({ uid, email: null });

      // Init memory system and load all caches
      const fdb = getFirebaseDb();
      if (fdb && uid) {
        initMemorySystem(fdb, uid);
        await loadAllCaches();
      }

      setStatus('success');

      // Small delay then go to app
      setTimeout(() => {
        if (orKey) {
          setScreen('app');
        } else {
          // Need API key first
          setScreen('apikey');
        }
      }, 800);
    } catch {
      setError(t('onboarding.firebase.error'));
      setStatus('idle');
    }
  };

  const skip = () => {
    setFbInitialized(false);
    setScreen(orKey ? 'app' : 'apikey');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <div
        className="text-3xl font-bold tracking-[6px] text-blue-400 mb-6"
        style={{
          fontFamily: "'Space Mono', monospace",
          filter: 'drop-shadow(0 0 30px rgba(92,157,255,0.3))',
        }}
      >
        JARVIS
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-blue-400" />
        <p className="text-white/40 text-sm">{t('onboarding.firebase.title')}</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-green-500/[0.05] border border-green-500/20">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-green-400 text-sm font-medium">Firebase Connected!</p>
            <p className="text-white/30 text-xs">Redirecting...</p>
          </div>
        ) : (
          <>
            <textarea
              value={configJson}
              onChange={(e) => { setConfigJson(e.target.value); setError(''); }}
              placeholder={t('onboarding.firebase.placeholder')}
              className="w-full h-36 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 focus:bg-blue-500/[0.03] resize-none font-mono leading-relaxed"
              autoFocus
              disabled={status === 'connecting'}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/[0.05] border border-red-500/10">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={connect}
              disabled={status === 'connecting'}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'connecting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {t('onboarding.firebase.connect')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={skip}
              className="w-full flex items-center justify-center gap-2 py-3 text-white/30 text-xs hover:text-blue-400 transition-colors"
            >
              <SkipForward className="w-3 h-3" />
              {t('onboarding.firebase.skip')}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-white/20 text-[11px] text-center max-w-xs leading-relaxed">
        {t('onboarding.firebase.hint')}
      </p>
    </div>
  );
}
