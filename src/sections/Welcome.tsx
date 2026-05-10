import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Cloud, ArrowRight, Shield, Globe } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supportedLangs } from '@/i18n';
import type { Lang } from '@/types';

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const { setScreen, setMode, setLang } = useAppStore();
  const [showLang, setShowLang] = useState(false);

  const selectLang = (code: Lang) => {
    i18n.changeLanguage(code);
    setLang(code);
    setShowLang(false);
  };

  const selectMode = (mode: 'starter' | 'advanced') => {
    setMode(mode);
    if (mode === 'starter') {
      setScreen('apikey');
    } else {
      setScreen('apikey');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      {/* Language selector */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setShowLang(!showLang)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-sm text-white/70 hover:text-white hover:border-blue-500/30 transition-all"
        >
          <Globe className="w-4 h-4" />
          {i18n.language.toUpperCase()}
        </button>
        {showLang && (
          <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#0c1018]/95 backdrop-blur-md overflow-hidden shadow-2xl">
            {supportedLangs.map((l) => (
              <button
                key={l.code}
                onClick={() => selectLang(l.code as Lang)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i18n.language === l.code
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="mb-4">
        <h1
          className="text-5xl font-bold tracking-[8px] text-blue-400"
          style={{
            fontFamily: "'Space Mono', monospace",
            filter: 'drop-shadow(0 0 40px rgba(92,157,255,0.3))',
          }}
        >
          JARVIS
        </h1>
      </div>

      <p className="text-white/40 text-sm mb-12 text-center max-w-xs leading-relaxed">
        {t('onboarding.welcome')}
      </p>

      <p className="text-white/30 text-xs mb-8 tracking-widest uppercase">
        {t('onboarding.chooseMode')}
      </p>

      {/* Mode cards */}
      <div className="w-full max-w-md space-y-4">
        {/* Starter */}
        <button
          onClick={() => selectMode('starter')}
          className="w-full group relative p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.05] hover:shadow-lg hover:shadow-blue-500/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-semibold text-base">{t('onboarding.starter.title')}</h3>
                <span className="text-[10px] tracking-wider text-blue-400/60 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {t('onboarding.starter.subtitle')}
                </span>
              </div>
              <p className="text-white/40 text-xs leading-relaxed mb-3">
                {t('onboarding.starter.desc')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(t('onboarding.starter.features', { returnObjects: true }) as string[]).map((f: string, i: number) => (
                  <span key={i} className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-md">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
          </div>
        </button>

        {/* Advanced */}
        <button
          onClick={() => selectMode('advanced')}
          className="w-full group relative p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md text-left transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.05] hover:shadow-lg hover:shadow-purple-500/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
              <Cloud className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-semibold text-base">{t('onboarding.advanced.title')}</h3>
                <span className="text-[10px] tracking-wider text-purple-400/60 uppercase bg-purple-500/10 px-2 py-0.5 rounded-full">
                  {t('onboarding.advanced.subtitle')}
                </span>
              </div>
              <p className="text-white/40 text-xs leading-relaxed mb-3">
                {t('onboarding.advanced.desc')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(t('onboarding.advanced.features', { returnObjects: true }) as string[]).map((f: string, i: number) => (
                  <span key={i} className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-md">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
          </div>
        </button>
      </div>

      {/* Security note */}
      <div className="mt-8 flex items-center gap-2 text-white/20 text-[11px]">
        <Shield className="w-3 h-3" />
        <span>{t('onboarding.securityNotice.title')}</span>
      </div>
    </div>
  );
}
