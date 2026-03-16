import { OTP_LENGTH } from '@contracking/shared';
import { useEffect, useRef } from 'react';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  disabled: boolean;
};

const OTP_POSITIONS = Array.from({ length: OTP_LENGTH }, (_, index) => index);

export function OtpInput({ value, onChange, onComplete, disabled }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const digits = OTP_POSITIONS.map((position) => value[position] ?? '');

  const handleChange = (position: number, inputValue: string) => {
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[position] = digit;
    const nextValue = nextDigits.join('');
    onChange(nextValue);
    if (digit && position < OTP_LENGTH - 1) {
      inputRefs.current[position + 1]?.focus();
      return;
    }
    if (nextValue.length === OTP_LENGTH) onComplete(nextValue);
  };

  const handleKeyDown = (position: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return;
    if (digits[position]) return;
    if (position === 0) return;
    inputRefs.current[position - 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(pasted);
    if (pasted.length === OTP_LENGTH) {
      onComplete(pasted);
      return;
    }
    const focusPosition = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusPosition]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {OTP_POSITIONS.map((position) => (
        <input
          key={`position-${position}`}
          ref={(element) => {
            inputRefs.current[position] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digits[position]}
          disabled={disabled}
          onChange={(event) => handleChange(position, event.target.value)}
          onKeyDown={(event) => handleKeyDown(position, event)}
          onPaste={handlePaste}
          className="w-12 h-14 rounded-xl text-center font-bold outline-none disabled:opacity-50"
          style={{
            fontSize: '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)',
          }}
        />
      ))}
    </div>
  );
}
