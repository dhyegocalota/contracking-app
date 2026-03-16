import type { ReactNode } from 'react';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 w-full h-full p-0 m-0 max-w-none max-h-none"
      style={{ background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <div
        role="document"
        className="fixed bottom-0 w-full max-w-md mx-auto p-5 rounded-t-2xl"
        style={{
          background: 'var(--bg)',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {title && (
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
