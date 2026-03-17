import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const VERSION_CHECK_INTERVAL_MILLISECONDS = 60000;
const BUILD_VERSION = process.env.BUILD_VERSION ?? 'dev';
const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP ?? null;

export function getBuildVersion(): string {
  return BUILD_VERSION;
}

export function getBuildTimestamp(): string | null {
  return BUILD_TIMESTAMP;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const check = async () => {
      const latest = await fetchLatestVersion();
      if (!latest) return;
      if (latest !== BUILD_VERSION && BUILD_VERSION !== 'dev') setHasUpdate(true);
    };

    check();
    const intervalId = setInterval(check, VERSION_CHECK_INTERVAL_MILLISECONDS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state !== 'installed') return;
          if (!navigator.serviceWorker.controller) return;
          setHasUpdate(true);
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  if (!hasUpdate) return null;

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage('SKIP_WAITING');
          return;
        }
        window.location.reload();
      });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50">
      <button
        type="button"
        onClick={handleUpdate}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        <RefreshCw size={14} />
        Atualizar app
      </button>
    </div>
  );
}
