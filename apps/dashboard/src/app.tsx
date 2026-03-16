import { AUTH_TOKEN_STORAGE_KEY } from '@contracking/shared';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginPage } from './components/login-page';
import { PublicPage } from './components/public-page';
import { TrackingPage } from './components/tracking-page';
import { UpdateBanner } from './components/update-banner';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8788';
const AUTH_CHECKED_KEY = 'contracking_auth_checked';
const AUTH_TOKEN_PARAM = 'auth_token';

type VerifyError = 'token_used' | 'token_expired' | 'invalid_token';

const VERIFY_ERROR_TITLE: Record<VerifyError, string> = {
  token_used: 'Link já utilizado',
  token_expired: 'Link expirado',
  invalid_token: 'Link inválido',
};

const VERIFY_ERROR_MESSAGE: Record<VerifyError, string> = {
  token_used: 'Este link de acesso já foi utilizado. Solicite um novo link para entrar.',
  token_expired: 'Este link de acesso expirou. Solicite um novo link para entrar.',
  invalid_token: 'Este link de acesso é inválido. Solicite um novo link para entrar.',
};

function VerifyPage() {
  const [error, setError] = useState<VerifyError | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error') as VerifyError | null;
    if (errorParam) {
      setError(errorParam);
      return;
    }
    const token = params.get('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    localStorage.removeItem(AUTH_CHECKED_KEY);
    window.location.href = `${API_BASE_URL}/auth/verify?token=${token}`;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <h1 className="text-2xl font-semibold text-center" style={{ color: 'var(--accent)' }}>
            Contracking
          </h1>
          <p className="text-base font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
            {VERIFY_ERROR_TITLE[error]}
          </p>
          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            {VERIFY_ERROR_MESSAGE[error]}
          </p>
          <a
            href="/login"
            className="w-full rounded-xl py-3 text-sm font-semibold text-white text-center bg-gradient-to-br from-accent-dark to-accent"
          >
            Solicitar novo link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-muted)',
        fontSize: '14px',
      }}
    >
      Verificando...
    </div>
  );
}

function captureAuthToken(): void {
  const params = new URLSearchParams(window.location.search);
  const authToken = params.get(AUTH_TOKEN_PARAM);
  if (!authToken) return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
  params.delete(AUTH_TOKEN_PARAM);
  const nextSearch = params.toString();
  const nextUrl = window.location.pathname + (nextSearch ? `?${nextSearch}` : '');
  history.replaceState(null, '', nextUrl);
}

function App() {
  const { pathname } = window.location;

  if (pathname === '/auth/verify') return <VerifyPage />;
  if (pathname === '/login') return <LoginPage />;
  if (pathname.startsWith('/s/')) return <PublicPage />;

  captureAuthToken();

  return (
    <>
      <TrackingPage />
      <UpdateBanner />
    </>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
