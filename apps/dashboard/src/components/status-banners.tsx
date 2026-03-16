import { SyncStatus } from '@contracking/shared';
import { CloudOff, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'contracking_local_banner_dismissed';

type StatusBannersProps = {
  syncStatus: SyncStatus;
};

export function StatusBanners({ syncStatus }: StatusBannersProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [localDismissed, setLocalDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDismissLocal = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setLocalDismissed(true);
  };

  const showLocalBanner = syncStatus === SyncStatus.NOT_AUTHENTICATED && !localDismissed && !isOffline;

  return (
    <>
      {isOffline && (
        <div
          className="mx-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <WifiOff size={14} style={{ color: 'rgba(239,68,68,0.8)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(239,68,68,0.8)' }}>
            Sem conexão. Seus dados estão sendo salvos localmente.
          </span>
        </div>
      )}
      {showLocalBanner && (
        <div
          className="mx-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,167,38,0.08)', border: '1px solid rgba(255,167,38,0.15)' }}
        >
          <CloudOff size={14} style={{ color: 'rgba(255,167,38,0.8)', flexShrink: 0 }} />
          <span className="flex-1" style={{ fontSize: 12, color: 'rgba(255,167,38,0.8)' }}>
            Dados salvos apenas neste dispositivo. Faça login para sincronizar.
          </span>
          <button type="button" onClick={handleDismissLocal} style={{ color: 'rgba(255,167,38,0.5)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
