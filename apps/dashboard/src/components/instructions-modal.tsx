const INSTRUCTIONS_SEEN_KEY = 'contracking_instructions_seen';

const STEPS = [
  'Toque no botão para iniciar e parar a contração',
  'Marque intensidade e posição (opcional)',
  'Registre eventos como bolsa, refeição e dilatação',
  'Compartilhe o link com a médica',
  'Contrações são paradas automaticamente após 5 minutos',
];

type InstructionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    localStorage.setItem(INSTRUCTIONS_SEEN_KEY, '1');
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
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Como usar o Contracking
        </h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                style={{ width: 24, height: 24, background: 'var(--accent)', fontSize: 11 }}
              >
                {index + 1}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded-xl py-3 text-white font-semibold"
          style={{ background: 'var(--accent)', fontSize: 14 }}
        >
          Entendi
        </button>
      </div>
    </dialog>
  );
}

export { INSTRUCTIONS_SEEN_KEY };
