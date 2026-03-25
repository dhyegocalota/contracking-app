import { Moon, Smartphone } from 'lucide-react';
import { useState } from 'react';

export const PERMISSIONS_SEEN_KEY = 'contracking_permissions_seen';

type ToggleRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  supported: boolean;
  onToggle: () => void;
};

function ToggleRow({ icon, title, description, enabled, supported, onToggle }: ToggleRowProps) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 w-full p-3 rounded-xl text-left"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <div style={{ color: enabled ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>{icon}</div>
      <div className="flex flex-col gap-0.5 flex-1">
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{description}</span>
      </div>
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: enabled ? 'var(--accent)' : 'var(--text-faint)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2px',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            transform: enabled ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.2s',
          }}
        />
      </div>
    </button>
  );
}

type PermissionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wakeLock: {
    isSupported: boolean;
    isEnabled: boolean;
    enable: () => Promise<void>;
    disable: () => void;
  };
  shake: {
    isSupported: boolean;
    isEnabled: boolean;
    enable: () => Promise<boolean>;
    disable: () => void;
  };
};

export function PermissionsModal({ isOpen, onClose, wakeLock, shake }: PermissionsModalProps) {
  const [wakeLockEnabled, setWakeLockEnabled] = useState(wakeLock.isEnabled);
  const [shakeEnabled, setShakeEnabled] = useState(shake.isEnabled);

  if (!isOpen) return null;

  const hasAnySupported = wakeLock.isSupported || shake.isSupported;
  if (!hasAnySupported) {
    localStorage.setItem(PERMISSIONS_SEEN_KEY, '1');
    onClose();
    return null;
  }

  const handleWakeLockToggle = async () => {
    if (wakeLockEnabled) {
      wakeLock.disable();
      setWakeLockEnabled(false);
      return;
    }
    await wakeLock.enable();
    setWakeLockEnabled(true);
  };

  const handleShakeToggle = async () => {
    if (shakeEnabled) {
      shake.disable();
      setShakeEnabled(false);
      return;
    }
    const granted = await shake.enable();
    setShakeEnabled(granted);
  };

  const handleClose = () => {
    localStorage.setItem(PERMISSIONS_SEEN_KEY, '1');
    onClose();
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 w-full h-full p-0 m-0 max-w-none max-h-none flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
      onKeyDown={(event) => event.key === 'Escape' && handleClose()}
    >
      <div
        role="document"
        className="w-full max-w-sm mx-4 p-5 rounded-2xl flex flex-col gap-4"
        style={{ background: 'var(--bg)' }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Permissões
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Ative para uma melhor experiência durante o trabalho de parto
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <ToggleRow
            icon={<Moon size={18} />}
            title="Manter tela acesa"
            description="A tela não apaga enquanto o app estiver aberto"
            enabled={wakeLockEnabled}
            supported={wakeLock.isSupported}
            onToggle={handleWakeLockToggle}
          />
          <ToggleRow
            icon={<Smartphone size={18} />}
            title="Chacoalhar para iniciar/parar"
            description="Chacoalhe o celular para controlar a contração"
            enabled={shakeEnabled}
            supported={shake.isSupported}
            onToggle={handleShakeToggle}
          />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded-xl py-3 text-white font-semibold"
          style={{ background: 'var(--accent)', fontSize: 14 }}
        >
          Continuar
        </button>

        <p className="text-center" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
          Você pode alterar essas opções depois nas configurações
        </p>
      </div>
    </dialog>
  );
}
