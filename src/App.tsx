import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSetting, setSetting } from '@/lib/db';
import { initFirebase, isFirebaseReady, ensureAuth, getFirebaseDb } from '@/lib/firebase';
import { initMemorySystem, loadAllCaches } from '@/lib/memory';
import Welcome from '@/sections/Welcome';
import ApiKeySetup from '@/sections/ApiKeySetup';
import FirebaseSetup from '@/sections/FirebaseSetup';
import Chat from '@/sections/Chat';
import SettingsPanel from '@/sections/SettingsPanel';
import MemoryPanel from '@/sections/MemoryPanel';
import AnniversaryReport from '@/sections/AnniversaryReport';
import './App.css';

function App() {
  const {
    screen, setScreen,
    setLang, setOrKey, setR2Url, setActiveModel,
    setUserBirthday, setFbConfig, setFbInitialized, setCurrentUser,
    initialized, setInitialized, setMode,
  } = useAppStore();

  // Restore state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const [savedKey, savedR2, savedModel, savedLang, savedBirthday, savedFb] = await Promise.all([
          getSetting<string>('orKey', ''),
          getSetting<string>('r2Url', ''),
          getSetting<number>('activeModel', 0),
          getSetting<string>('lang', 'en'),
          getSetting<string>('userBirthday', ''),
          getSetting<Record<string, string> | null>('fbConfig', null),
        ]);

        if (savedLang) setLang(savedLang as 'en' | 'es' | 'ja' | 'ko' | 'de');
        if (savedBirthday) setUserBirthday(savedBirthday);
        if (savedFb) {
          setFbConfig(savedFb);
          // Auto-init Firebase on app start if config exists
          const ok = initFirebase(savedFb);
          if (ok && isFirebaseReady()) {
            // Must authenticate FIRST to get the real UID before loading data
            const uid = await ensureAuth();
            if (uid) {
              setCurrentUser({ uid, email: null });
              setFbInitialized(true);
              setMode('advanced');
              // Init memory system with real UID
              const fdb = getFirebaseDb();
              if (fdb) {
                initMemorySystem(fdb, uid);
                // Now load data with the correct UID (exactly like original initApp -> loadAllCaches)
                await loadAllCaches();
              }
            }
          }
        }
        if (savedKey) {
          setOrKey(savedKey);
          setMode((savedFb && isFirebaseReady()) ? 'advanced' : 'starter');
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
      {screen === 'firebase' && <FirebaseSetup />}
      {screen === 'app' && <Chat />}

      <SettingsPanel />
      <MemoryPanel />
      <AnniversaryReport />
    </div>
  );
}

export default App;
