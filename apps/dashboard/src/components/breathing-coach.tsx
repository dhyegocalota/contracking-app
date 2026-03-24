import { useEffect, useState } from 'react';

const CYCLE_INTERVAL_MILLISECONDS = 4000;

const BREATHING_MESSAGES = [
  'Inspira... devagar pelo nariz',
  'Expira... solta o ar pela boca',
  'Você tá indo muito bem',
  'Foca na respiração',
  'Relaxa os ombros',
  'Inspira... lento e profundo',
  'Expira... deixa o corpo soltar',
  'Cada contração te aproxima do bebê',
  'Você é forte',
  'Inspira... calma e presente',
  'Expira... solta toda a tensão',
  'Confia no seu corpo',
];

type BreathingCoachProps = {
  isActive: boolean;
};

export function BreathingCoach({ isActive }: BreathingCoachProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      setMessageIndex(0);
      return;
    }

    setIsVisible(true);

    const intervalId = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMessageIndex((previous) => (previous + 1) % BREATHING_MESSAGES.length);
        setIsVisible(true);
      }, 300);
    }, CYCLE_INTERVAL_MILLISECONDS);

    return () => clearInterval(intervalId);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex justify-center px-6 py-2" style={{ minHeight: 32 }}>
      <span
        style={{
          fontSize: 13,
          color: 'var(--accent)',
          opacity: isVisible ? 0.8 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          textAlign: 'center',
          fontWeight: 400,
          letterSpacing: 0.3,
        }}
      >
        {BREATHING_MESSAGES[messageIndex]}
      </span>
    </div>
  );
}
