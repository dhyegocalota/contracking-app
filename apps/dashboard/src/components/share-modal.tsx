import { LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BottomSheet } from './bottom-sheet';

const COPIED_REVERT_MILLISECONDS = 2000;

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  publicId: string;
  onSync: () => Promise<unknown>;
  isAuthenticated: boolean;
};

export function ShareModal({ isOpen, onClose, publicId, onSync, isAuthenticated }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!isAuthenticated) return;
    if (publicId) return;
    setSyncing(true);
    onSync().finally(() => setSyncing(false));
  }, [isOpen, publicId, onSync, isAuthenticated]);

  const publicUrl = publicId ? `${window.location.origin}/s/${publicId}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_REVERT_MILLISECONDS);
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Compartilhar">
      <div className="flex flex-col gap-3">
        {!isAuthenticated && (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Faça login para sincronizar e gerar um link público
            </p>
            <button
              type="button"
              onClick={handleLogin}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              <LogIn size={14} />
              Fazer login
            </button>
          </div>
        )}
        {isAuthenticated && syncing && (
          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            Sincronizando dados...
          </p>
        )}
        {isAuthenticated && !syncing && !publicId && (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Não foi possível sincronizar. Verifique sua conexão.
            </p>
            <button
              type="button"
              onClick={() => {
                setSyncing(true);
                onSync().finally(() => setSyncing(false));
              }}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {isAuthenticated && !syncing && publicId && (
          <>
            <p
              className="rounded-lg p-3 break-all"
              style={{
                background: 'var(--card-bg)',
                fontSize: 13,
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
              }}
            >
              {publicUrl}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full rounded-xl py-3 text-white font-semibold"
              style={{ background: 'var(--accent)', fontSize: 14 }}
            >
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
