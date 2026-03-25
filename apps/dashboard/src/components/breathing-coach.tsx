import { useEffect, useState } from 'react';

const CYCLE_INTERVAL_MILLISECONDS = 8000;
const FADE_DURATION_MILLISECONDS = 800;

const BREATHING_MESSAGES = [
  'Inspira devagar… sente o ar preenchendo',
  'Solta suave… como uma onda que vai embora',
  'Você está fazendo algo lindo',
  'Cada respiração embala o seu bebê',
  'Inspira… todo o amor que já existe',
  'Expira… entrega o que não precisa mais',
  'Seu corpo sabe exatamente o que fazer',
  'Inspira… calma como o mar antes do amanhecer',
  'Solta… leve como uma pétala ao vento',
  'Essa força toda é sua, sempre foi',
  'Inspira… presente, inteira, poderosa',
  'Expira… abre espaço para o encontro',
  'Logo logo ele vai estar nos seus braços',
  'Respira fundo… você nunca esteve sozinha',
  'Cada onda te aproxima desse momento',
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
      }, FADE_DURATION_MILLISECONDS);
    }, CYCLE_INTERVAL_MILLISECONDS);

    return () => clearInterval(intervalId);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex justify-center px-6 py-4" style={{ minHeight: 48 }}>
      <span
        style={{
          fontSize: 16,
          color: 'var(--accent)',
          opacity: isVisible ? 0.9 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition: `opacity ${FADE_DURATION_MILLISECONDS}ms ease, transform ${FADE_DURATION_MILLISECONDS}ms ease`,
          textAlign: 'center',
          fontWeight: 300,
          letterSpacing: 0.5,
          fontStyle: 'italic',
          textShadow: '0 0 20px rgba(217,77,115,0.3)',
        }}
      >
        {BREATHING_MESSAGES[messageIndex]}
      </span>
    </div>
  );
}
