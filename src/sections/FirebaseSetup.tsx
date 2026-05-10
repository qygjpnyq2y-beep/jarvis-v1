import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ArrowRight, SkipForward } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db';

export default function FirebaseSetup() {
  const { t } = useTranslation();
  const { setScreen, setFbConfig } = useAppStore();
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');

  const connect = async () => {
    const raw = configJson.trim();
    setError('');
    if (!raw) {
      setError(t('onboarding.firebase.error'));
      return;
    }
    try {
      let cfg: Record<string, string>;
      if (raw.startsWith('{')) {
        cfg = JSON.parse(raw);
      } else {
        cfg = JSON.parse(raw.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"'));
      }
      if (!cfg.apiKey || !cfg.projectId) {
        setError('Missing apiKey or projectId');
        return;
      }
      setFbConfig(cfg);
      await setSetting('fbConfig', cfg);
      // Go to app (or R2 setup if in advanced mode)
      setScreen('app');
    } catch {
      setError(t('onboarding.firebase.error'));
    }
  };

  const skip = () => {
    setScreen('app');
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
        <textarea
          value={configJson}
          onChange={(e) => { setConfigJson(e.target.value); setError(''); }}
          placeholder={t('onboarding.firebase.placeholder')}
          className="w-full h-36 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 focus:bg-blue-500/[0.03] resize-none font-mono leading-relaxed"
          autoFocus
        />

        {error && (
          <p className="text-red-400 text-xs pl-1">{error}</p>
        )}

        <button
          onClick={connect}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {t('onboarding.firebase.connect')}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={skip}
          className="w-full flex items-center justify-center gap-2 py-3 text-white/30 text-xs hover:text-blue-400 transition-colors"
        >
          <SkipForward className="w-3 h-3" />
          {t('onboarding.firebase.skip')}
        </button>
      </div>

      <p className="mt-6 text-white/20 text-[11px] text-center max-w-xs leading-relaxed">
        {t('onboarding.firebase.hint')}
      </p>
    </div>
  );
}
