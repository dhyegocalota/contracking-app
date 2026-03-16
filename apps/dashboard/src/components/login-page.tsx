import { AUTH_TOKEN_STORAGE_KEY } from '@contracking/shared';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sendMagicLink, verifyOtp } from '../api';
import { getLocalSession } from '../storage';
import { OtpInput } from './otp-input';

const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA';
const AUTH_CHECKED_KEY = 'contracking_auth_checked';

declare global {
  interface Window {
    turnstile: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; theme: string },
      ) => void;
    };
  }
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [localContractionCount, setLocalContractionCount] = useState(0);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getLocalSession();
    setLocalContractionCount(session?.contractions.length ?? 0);
  }, []);

  useEffect(() => {
    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return;
      window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: setTurnstileToken,
        theme: 'dark',
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.querySelector('script[src*="turnstile"]');
    if (!script) return;
    script.addEventListener('load', renderWidget);
    return () => script.removeEventListener('load', renderWidget);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      await sendMagicLink({ email, turnstileToken });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro desconhecido');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code ?? otp;
    setOtpError(null);
    setVerifying(true);
    try {
      const { sessionId } = await verifyOtp({ email, otp: otpCode });
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, sessionId);
      localStorage.removeItem(AUTH_CHECKED_KEY);
      window.location.href = '/';
    } catch {
      setOtpError('Código inválido ou expirado');
    } finally {
      setVerifying(false);
    }
  };

  const isSubmitDisabled = sending || !turnstileToken;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <a href="/" className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} />
          Voltar
        </a>
        <h1 className="text-2xl font-semibold mb-1 text-center" style={{ color: 'var(--accent)' }}>
          Contracking
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          Acompanhamento de contrações
        </p>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-center text-green-400">Código enviado para {email}</p>
            <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} disabled={verifying} />
            {verifying && (
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Verificando...
              </p>
            )}
            {otpError && <p className="text-sm text-center text-red-400">{otpError}</p>}
            <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
              Ou clique no link enviado por email
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {localContractionCount > 0 && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Você tem {localContractionCount}{' '}
                  {localContractionCount === 1 ? 'contração salva' : 'contrações salvas'} neste dispositivo. Ao fazer
                  login, seus dados serão sincronizados com a nuvem.
                </p>
              </div>
            )}
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
              }}
            />
            <div ref={turnstileRef} />
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-br from-accent-dark to-accent disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
            {error && <p className="text-sm text-center text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
