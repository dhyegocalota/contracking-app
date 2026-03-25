import { SyncStatus } from '@contracking/shared';
import { Cloud, CloudOff, Loader, LogOut, Settings, Share2, User } from 'lucide-react';

type HeaderProps = {
  patientName: string | null;
  gestationalWeek: number | null;
  timezone: string | null;
  syncStatus: SyncStatus;
  userEmail: string | null;
  onShareClick: () => void;
  onAccountClick: () => void;
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
};

const ICON_SIZE = 14;

function formatTimezoneAbbreviation(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZoneName: 'short', timeZone: timezone }).formatToParts(
      new Date(),
    );
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

function SyncIcon({ syncStatus }: { syncStatus: SyncStatus }) {
  if (syncStatus === SyncStatus.SYNCING)
    return <Loader size={ICON_SIZE} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />;
  if (syncStatus === SyncStatus.OFFLINE) return <CloudOff size={ICON_SIZE} style={{ color: 'var(--text-faint)' }} />;
  if (syncStatus === SyncStatus.SYNCED) return <Cloud size={ICON_SIZE} style={{ color: 'rgba(76,175,80,0.7)' }} />;
  return <Cloud size={ICON_SIZE} style={{ color: 'var(--text-muted)' }} />;
}

const SYNC_CLICKABLE_STATUSES = new Set([SyncStatus.SYNCED, SyncStatus.UNSYNCED]);

export function Header({
  patientName,
  gestationalWeek,
  timezone,
  syncStatus,
  userEmail,
  onShareClick,
  onAccountClick,
  onSettingsClick,
  onSyncClick,
}: HeaderProps) {
  const timezoneAbbreviation = timezone ? formatTimezoneAbbreviation(timezone) : null;
  const isAuthenticated = syncStatus !== SyncStatus.NOT_AUTHENTICATED;
  const showSync = isAuthenticated && syncStatus !== SyncStatus.OFFLINE;
  const isSyncClickable = SYNC_CLICKABLE_STATUSES.has(syncStatus) && !!onSyncClick;

  const subtitleParts = [gestationalWeek && `Semana ${gestationalWeek}`, patientName, timezoneAbbreviation, userEmail]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Contracking
          </h1>
          {subtitleParts && (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {subtitleParts}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="flex items-center justify-center w-8 h-8 rounded-[10px]"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <Settings size={ICON_SIZE} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
          {showSync &&
            (isSyncClickable ? (
              <button
                type="button"
                onClick={onSyncClick}
                className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <SyncIcon syncStatus={syncStatus} />
              </button>
            ) : (
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <SyncIcon syncStatus={syncStatus} />
              </div>
            ))}
          <button
            type="button"
            onClick={onShareClick}
            className="flex items-center justify-center w-8 h-8 rounded-[10px]"
            style={{ background: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            <Share2 size={ICON_SIZE} className="text-white" />
          </button>
          <button
            type="button"
            onClick={onAccountClick}
            className="flex items-center justify-center w-8 h-8 rounded-[10px]"
            style={{
              background: isAuthenticated ? 'var(--card-bg)' : 'transparent',
              border: isAuthenticated ? '1px solid var(--card-border)' : '1px solid var(--text-faint)',
            }}
          >
            {isAuthenticated ? (
              <LogOut size={ICON_SIZE} style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <User size={ICON_SIZE} style={{ color: 'var(--text-faint)' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
