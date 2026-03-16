import type { User } from '@contracking/shared';
import { useCallback, useEffect, useState } from 'react';
import { AuthenticationError, sendMagicLink as apiSendMagicLink, fetchCurrentUser, logout } from '../api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => {
        if (err instanceof AuthenticationError) return setUser(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const sendMagicLink = useCallback(async ({ email, turnstileToken }: { email: string; turnstileToken: string }) => {
    setError(null);
    try {
      await apiSendMagicLink({ email, turnstileToken });
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = '/login';
  }, []);

  return { user, loading, error, magicLinkSent, sendMagicLink, handleLogout };
}
