import { describe, expect, test } from 'bun:test';

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

function getNextMessageIndex(current: number): number {
  return (current + 1) % BREATHING_MESSAGES.length;
}

describe('breathing coach messages', () => {
  test('has at least 10 messages for variety', () => {
    expect(BREATHING_MESSAGES.length).toBeGreaterThanOrEqual(10);
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
      (message) => message.includes('Inspira') || message.includes('Expira'),
    );
    expect(breathingMessages.length).toBeGreaterThanOrEqual(4);
  });

  test('messages include encouragement', () => {
    const encouragementMessages = BREATHING_MESSAGES.filter(
      (message) => message.includes('bem') || message.includes('forte') || message.includes('Confia'),
    );
    expect(encouragementMessages.length).toBeGreaterThanOrEqual(2);
  });
});
