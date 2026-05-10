import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, ArrowRight, Shield } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db';

export default function ApiKeySetup() {
  const { t } = useTranslation();
  const { setScreen, mode, setOrKey } = useAppStore();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [showSecurity, setShowSecurity] = useState(false);

  const activate = async () => {
    const trimmed = key.trim();
    if (trimmed.length < 10) {
      setError(t('onboarding.apiKey.error'));
      return;
    }
    setError('');
    setOrKey(trimmed);
    await setSetting('orKey', trimmed);

    if (mode === 'advanced') {
      setScreen('firebase');
    } else {
      // Starter mode: skip firebase, go straight to app
      setScreen('app');
    }
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

      <p className="text-white/40 text-sm mb-8 text-center max-w-xs">
        {t('onboarding.apiKey.title')}
      </p>

      <div className="w-full max-w-sm space-y-3">
        <div className="relative">
          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/50" />
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && activate()}
            placeholder={t('onboarding.apiKey.placeholder')}
            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 focus:bg-blue-500/[0.03] focus:ring-4 focus:ring-blue-500/5 transition-all"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs pl-1">{error}</p>
        )}

        <button
          onClick={activate}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {t('onboarding.apiKey.activate')}
          <ArrowRight className="w-4 h-4" />
        </button>

        {mode === 'starter' && (
          <button
            onClick={() => setShowSecurity(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-white/30 text-xs hover:text-blue-400 transition-colors"
          >
            <Shield className="w-3 h-3" />
            {t('onboarding.securityNotice.title')}
          </button>
        )}
      </div>

      <p className="mt-6 text-white/20 text-[11px] text-center max-w-xs leading-relaxed">
        {t('onboarding.apiKey.hint')}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400/60 hover:text-blue-400 ml-1"
        >
          openrouter.ai/keys
        </a>
      </p>

      {/* Security Modal */}
      {showSecurity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSecurity(false)} />
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-[#0c1018] border border-white/10 shadow-2xl">
            <Shield className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">{t('onboarding.securityNotice.title')}</h3>
            <p className="text-white/50 text-xs leading-relaxed mb-4">
              {t('onboarding.securityNotice.desc')}
            </p>
            <button
              onClick={() => setShowSecurity(false)}
              className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
            >
              {t('onboarding.securityNotice.dismiss')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
