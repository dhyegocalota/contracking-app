import type { SyncStatus } from '@contracking/shared';
import { useState } from 'react';
import { getLocalSession } from '../storage';
import { getBuildVersion } from './update-banner';

type DebugPanelProps = {
  syncStatus: SyncStatus;
  userEmail: string | null;
  publicId: string | null;
};

export function DebugPanel({ syncStatus, userEmail, publicId }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const session = getLocalSession();
  const buildVersion = getBuildVersion();

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-50 px-2 py-1 rounded-lg"
        style={{ background: 'rgba(255,0,0,0.15)', color: 'rgba(255,0,0,0.5)', fontSize: 8 }}
      >
        {buildVersion.slice(0, 7)}
      </button>
    );
  }

  const debugData = JSON.stringify(
    {
      version: buildVersion,
      syncStatus,
      userEmail,
      publicId: publicId ? `${publicId.slice(0, 8)}...` : null,
      contractions: session?.contractions.length ?? 0,
      unsynced: session?.contractions.filter((c) => c.syncedAt === null).length ?? 0,
      tombstones: session?.tombstones.length ?? 0,
      online: navigator.onLine,
      lastSync: JSON.parse(localStorage.getItem('contracking_debug_sync') ?? 'null'),
    },
    null,
    2,
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(debugData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 overflow-auto"
      style={{
        background: 'rgba(0,0,0,0.95)',
        color: '#0f0',
        fontSize: 10,
        maxHeight: '50vh',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ float: 'right', display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleCopy} style={{ color: copied ? '#0f0' : '#888' }}>
          {copied ? 'COPIED' : 'COPY'}
        </button>
        <button type="button" onClick={() => setExpanded(false)} style={{ color: 'red' }}>
          CLOSE
        </button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debugData}</pre>
    </div>
  );
}
