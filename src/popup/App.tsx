import { useState, useEffect } from 'react';
import { sendMessage } from '@shared/messages';
import { useTheme } from '@hooks/useTheme';
import { Spinner } from '@shared/ui';
import LockScreen from './components/LockScreen';
import TOTPList from './components/TOTPList';

type AppState = 'loading' | 'uninitialized' | 'locked' | 'unlocked';

export default function App() {
  const [state, setState] = useState<AppState>('loading');
  useTheme();

  useEffect(() => {
    async function checkStatus() {
      try {
        const [lockResult, initResult] = await Promise.all([
          sendMessage<{ locked: boolean }>({ type: 'GET_LOCK_STATUS' }),
          sendMessage<{ initialized: boolean }>({ type: 'IS_VAULT_INITIALIZED' }),
        ]);

        if (!initResult.initialized) {
          setState('uninitialized');
        } else if (lockResult.locked) {
          setState('locked');
        } else {
          setState('unlocked');
        }
      } catch {
        setState('locked');
      }
    }

    checkStatus();
  }, []);

  return (
    <div className="w-[400px] h-[550px] bg-bg text-text overflow-hidden">
      {state === 'loading' && (
        <div className="flex items-center justify-center h-full">
          <Spinner size={24} />
        </div>
      )}

      {state === 'uninitialized' && (
        <LockScreen mode="create" onUnlocked={() => setState('unlocked')} />
      )}

      {state === 'locked' && (
        <LockScreen mode="unlock" onUnlocked={() => setState('unlocked')} />
      )}

      {state === 'unlocked' && <TOTPList />}
    </div>
  );
}
