import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Shield, Check,
} from 'lucide-react';
import { useAppStore, PRESETS, MODELS } from '@/store/useAppStore';
import { supportedLangs } from '@/i18n';
import { setSetting } from '@/lib/db';
import type { Lang } from '@/types';

export default function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const {
    showSettings, setShowSettings,
    orKey, setOrKey,
    r2Url, setR2Url,
    activePreset, setActivePreset,
    isCustom, setIsCustom,
    customPrompt, setCustomPrompt,
    activeModel, setActiveModel,
    lang, setLang,
    currentUser,
    notifSettings, setNotifSettings,
    setMode, setScreen,
  } = useAppStore();

  const [customText, setCustomText] = useState(customPrompt);
  const [newKey, setNewKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showR2Input, setShowR2Input] = useState(false);
  const [newR2, setNewR2] = useState('');

  if (!showSettings) return null;

  const maskKey = (k: string) => {
    if (k.length <= 12) return '--------';
    return k.substring(0, 6) + '****' + k.substring(k.length - 4);
  };

  const changeKey = async () => {
    if (newKey.trim().length >= 10) {
      setOrKey(newKey.trim());
      await setSetting('orKey', newKey.trim());
      setNewKey('');
      setShowKeyInput(false);
    }
  };

  const changeR2 = async () => {
    const url = newR2.trim().replace(/\/+$/, '');
    if (url && !url.startsWith('https://')) return;
    setR2Url(url);
    await setSetting('r2Url', url);
    setNewR2('');
    setShowR2Input(false);
  };

  const removeR2 = async () => {
    setR2Url('');
    await setSetting('r2Url', '');
  };

  const changeLang = async (code: Lang) => {
    i18n.changeLanguage(code);
    setLang(code);
    await setSetting('lang', code);
  };

  const signOut = async () => {
    setShowSettings(false);
    setMode(null);
    setScreen('welcome');
  };

  const toggleNotif = (key: keyof typeof notifSettings) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-[#080c14]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[28px] overflow-y-auto"
        style={{ animation: 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 sticky top-0 bg-transparent z-10">
          <div className="w-10 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
              {t('settings.title')}
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Language */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.language.title')}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {supportedLangs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code as Lang)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    lang === l.code
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
                >
                  {t(`settings.language.${l.code}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Model */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.model.title')}
            </h3>
            <div className="space-y-2">
              {MODELS.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => { setActiveModel(i); setSetting('activeModel', i); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    activeModel === i
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-white/30 mt-0.5">{m.desc}</div>
                  </div>
                  {activeModel === i && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Persona */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.persona.title')}
            </h3>
            <div className="space-y-2">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setActivePreset(i); setIsCustom(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    !isCustom && activePreset === i
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-white/30 mt-0.5">{p.desc}</div>
                  </div>
                  {!isCustom && activePreset === i && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>

            {/* Custom */}
            <div className="mt-3">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('settings.persona.placeholder')}
                className="w-full h-28 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/30 resize-none"
              />
              <button
                onClick={() => {
                  setCustomPrompt(customText);
                  setIsCustom(true);
                }}
                className={`mt-2 w-full py-3 rounded-xl border text-sm font-medium transition-all ${
                  isCustom
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60'
                }`}
              >
                {t('settings.persona.useCustom')}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Notifications */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.notifications.title')}
            </h3>
            {Object.entries(notifSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                <span className="text-sm text-white/50">
                  {t(`settings.notifications.${key}`)}
                </span>
                <button
                  onClick={() => toggleNotif(key as keyof typeof notifSettings)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    value ? 'bg-blue-500/20' : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                      value
                        ? 'left-[26px] bg-blue-400 shadow-[0_0_12px_rgba(92,157,255,0.4)]'
                        : 'left-0.5 bg-white/30'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* API Key */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.apiKey.title')}
            </h3>
            <div className="px-4 py-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-xs text-white/30 mb-3 break-all">
                {orKey ? maskKey(orKey) : t('settings.apiKey.masked')}
              </div>
              {!showKeyInput ? (
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-all"
                >
                  {t('settings.apiKey.change')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
                  />
                  <button
                    onClick={changeKey}
                    className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* R2 */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.r2.title')}
            </h3>
            <div className="px-4 py-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-xs text-white/30 mb-3">
                {r2Url ? `${t('settings.r2.connected')}: ${r2Url}` : t('settings.r2.notConfigured')}
              </div>
              {!showR2Input ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowR2Input(true)}
                    className="px-4 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-all"
                  >
                    {t('settings.r2.change')}
                  </button>
                  {r2Url && (
                    <button
                      onClick={removeR2}
                      className="px-4 py-2 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      {t('settings.r2.remove')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={newR2}
                    onChange={(e) => setNewR2(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-500/30"
                  />
                  <button
                    onClick={changeR2}
                    className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Security */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.security.title')}
            </h3>
            <div className="px-4 py-4 rounded-xl bg-yellow-500/[0.03] border border-yellow-500/10">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-yellow-400/60 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {t('settings.security.warning')}
                  </p>
                  <a
                    href="https://firebase.google.com/docs/functions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400/60 hover:text-blue-400 mt-2 inline-block"
                  >
                    {t('settings.security.learnMore')} →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Account */}
          <div>
            <h3 className="text-[11px] text-blue-400 tracking-[3px] font-bold mb-3 uppercase opacity-80">
              {t('settings.account.title')}
            </h3>
            <div className="px-4 py-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-xs text-white/30 mb-3">
                {currentUser?.email || t('settings.account.title')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('advanced'); setShowSettings(false); setScreen('firebase'); }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-all"
                >
                  {t('settings.account.changeFirebase')}
                </button>
                <button
                  onClick={signOut}
                  className="px-4 py-2 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 transition-all"
                >
                  {t('settings.account.signOut')}
                </button>
              </div>
            </div>
          </div>

          {/* Done */}
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-black font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all"
          >
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
