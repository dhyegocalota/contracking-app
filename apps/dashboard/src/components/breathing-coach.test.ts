import { describe, expect, test } from 'bun:test';

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

function getNextMessageIndex(current: number): number {
  return (current + 1) % BREATHING_MESSAGES.length;
}

describe('breathing coach messages', () => {
  test('has at least 12 messages for variety', () => {
    expect(BREATHING_MESSAGES.length).toBeGreaterThanOrEqual(12);
  });

  test('all messages are non-empty strings', () => {
    for (const message of BREATHING_MESSAGES) {
      expect(message.length).toBeGreaterThan(0);
    }
  });

  test('cycles back to first message after last', () => {
    const lastIndex = BREATHING_MESSAGES.length - 1;
    expect(getNextMessageIndex(lastIndex)).toBe(0);
  });

  test('increments index normally', () => {
    expect(getNextMessageIndex(0)).toBe(1);
    expect(getNextMessageIndex(5)).toBe(6);
  });

  test('messages include breathing instructions', () => {
    const breathingMessages = BREATHING_MESSAGES.filter(
      (message) =>
        message.includes('Inspira') ||
        message.includes('Expira') ||
        message.includes('Solta') ||
        message.includes('Respira'),
    );
    expect(breathingMessages.length).toBeGreaterThanOrEqual(6);
  });

  test('messages include encouragement', () => {
    const encouragementMessages = BREATHING_MESSAGES.filter(
      (message) =>
        message.includes('lindo') ||
        message.includes('força') ||
        message.includes('braços') ||
        message.includes('poderosa'),
    );
    expect(encouragementMessages.length).toBeGreaterThanOrEqual(3);
  });
});
