import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSetting, setSetting } from '@/lib/db';
import Welcome from '@/sections/Welcome';
import ApiKeySetup from '@/sections/ApiKeySetup';
import Chat from '@/sections/Chat';
import SettingsPanel from '@/sections/SettingsPanel';
import MemoryPanel from '@/sections/MemoryPanel';
import AnniversaryReport from '@/sections/AnniversaryReport';
import './App.css';

function App() {
  const {
    screen, setScreen,
    setLang, setOrKey, setR2Url, setActiveModel,
    initialized, setInitialized, setMode,
  } = useAppStore();

  // Restore state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const [savedKey, savedR2, savedModel, savedLang] = await Promise.all([
          getSetting<string>('orKey', ''),
          getSetting<string>('r2Url', ''),
          getSetting<number>('activeModel', 0),
          getSetting<string>('lang', 'en'),
        ]);

        if (savedLang) setLang(savedLang as 'en' | 'es' | 'ja' | 'ko' | 'de');
        if (savedKey) {
          setOrKey(savedKey);
          setMode('starter');
          setScreen('app');
        }
        if (savedR2) setR2Url(savedR2);
        if (savedModel !== undefined) setActiveModel(savedModel);
      } catch (e) {
        console.error('Restore error:', e);
      }
      setInitialized(true);
    };
    restore();
  }, []);

  // Persist screen changes
  useEffect(() => {
    if (screen === 'app') {
      setSetting('lastScreen', 'app');
    }
  }, [screen]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-400 text-2xl font-bold tracking-[8px] animate-pulse" style={{ fontFamily: "'Space Mono', monospace" }}>
          JARVIS
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {screen === 'welcome' && <Welcome />}
      {screen === 'apikey' && <ApiKeySetup />}
      {(screen === 'firebase' || screen === 'auth' || screen === 'r2') && <ApiKeySetup />}
      {screen === 'app' && <Chat />}

      <SettingsPanel />
      <MemoryPanel />
      <AnniversaryReport />
    </div>
  );
}

export default App;
