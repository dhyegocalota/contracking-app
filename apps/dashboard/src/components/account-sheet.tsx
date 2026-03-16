import { SyncStatus } from '@contracking/shared';
import { useState } from 'react';
import { BottomSheet } from './bottom-sheet';

type AccountSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  syncStatus: SyncStatus;
  unsyncedCount: number;
  totalContractions: number;
  onLogout: () => void;
  onSync: () => void;
};

function UnauthenticatedContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Você está usando o app sem login. Seus dados estão salvos apenas neste dispositivo.
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Para sincronizar com a nuvem e compartilhar com a médica, faça login.
      </p>
      <button
        type="button"
        onClick={() => {
          onClose();
          window.location.href = '/login';
        }}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-br from-accent-dark to-accent"
      >
        Fazer login
      </button>
    </div>
  );
}

type LogoutConfirmationProps = {
  unsyncedCount: number;
  totalContractions: number;
  onCancel: () => void;
  onConfirm: () => void;
};

function LogoutConfirmation({ unsyncedCount, totalContractions, onCancel, onConfirm }: LogoutConfirmationProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-xl p-3"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(239,68,68,0.9)' }}>
          Atenção
        </p>
        <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
          Ao sair, todos os dados locais deste dispositivo serão apagados ({totalContractions}{' '}
          {totalContractions === 1 ? 'contração' : 'contrações'}).
          {unsyncedCount > 0 &&
            ` ${unsyncedCount} ${unsyncedCount === 1 ? 'item ainda não foi sincronizado' : 'itens ainda não foram sincronizados'} com a nuvem e serão perdidos.`}
          {unsyncedCount === 0 && ' Seus dados sincronizados continuam seguros na nuvem.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-3 text-sm font-semibold"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-secondary)',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
          style={{ background: '#ef4444' }}
        >
          Sair e apagar
        </button>
      </div>
    </div>
  );
}

type AuthenticatedContentProps = {
  userEmail: string;
  syncStatus: SyncStatus;
  unsyncedCount: number;
  totalContractions: number;
  onLogout: () => void;
  onSync: () => void;
};

function AuthenticatedContent({
  userEmail,
  syncStatus,
  unsyncedCount,
  totalContractions,
  onLogout,
  onSync,
}: AuthenticatedContentProps) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  if (confirmingLogout) {
    return (
      <LogoutConfirmation
        unsyncedCount={unsyncedCount}
        totalContractions={totalContractions}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={onLogout}
      />
    );
  }

  const isSyncing = syncStatus === SyncStatus.SYNCING;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Logado como {userEmail}
      </p>
      {unsyncedCount > 0 && (
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-br from-accent-dark to-accent disabled:opacity-50"
        >
          {isSyncing
            ? 'Sincronizando...'
            : `Sincronizar agora · ${unsyncedCount} ${unsyncedCount === 1 ? 'item' : 'itens'}`}
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirmingLogout(true)}
        className="w-full rounded-xl py-3 text-sm font-semibold"
        style={{ color: '#ef4444' }}
      >
        Sair
      </button>
    </div>
  );
}

export function AccountSheet({
  isOpen,
  onClose,
  userEmail,
  syncStatus,
  unsyncedCount,
  totalContractions,
  onLogout,
  onSync,
}: AccountSheetProps) {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Conta">
      {userEmail ? (
        <AuthenticatedContent
          userEmail={userEmail}
          syncStatus={syncStatus}
          unsyncedCount={unsyncedCount}
          totalContractions={totalContractions}
          onLogout={handleLogout}
          onSync={onSync}
        />
      ) : (
        <UnauthenticatedContent onClose={onClose} />
      )}
    </BottomSheet>
  );
}
