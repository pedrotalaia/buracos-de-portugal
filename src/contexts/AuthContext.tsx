import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { neonAuthClient } from '@/integrations/neon/auth';
import { apiRequest } from '@/lib/api';

interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

interface AuthSession {
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<{ error: unknown }>;
  resendVerification: (email: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSessionFromResult(result: unknown): AuthSession | null {
  const payload = (result as { data?: unknown } | null)?.data ?? result;
  if (!payload || typeof payload !== 'object') return null;

  const sessionCandidate = payload as { user?: unknown };
  if (!sessionCandidate.user || typeof sessionCandidate.user !== 'object') return null;

  const userCandidate = sessionCandidate.user as {
    id?: unknown;
    email?: unknown;
    name?: unknown;
  };

  if (typeof userCandidate.id !== 'string') return null;

  return {
    user: {
      id: userCandidate.id,
      email: typeof userCandidate.email === 'string' ? userCandidate.email : null,
      name: typeof userCandidate.name === 'string' ? userCandidate.name : null,
    },
  };
}

function getErrorFromResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return null;
  return (result as { error?: unknown }).error ?? null;
}

function getSignUpCallbackUrl(): string {
  return `${window.location.origin}/auth/verify`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      if (!neonAuthClient) {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await neonAuthClient.getSession();
        const nextSession = mapSessionFromResult(result);
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void syncSession();
    const onFocus = () => {
      void syncSession();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!neonAuthClient) {
      return { error: { message: 'VITE_NEON_AUTH_URL não configurada.' } };
    }

    const result = await neonAuthClient.signUp.email({
      email,
      password,
      name: email.split('@')[0],
      callbackURL: getSignUpCallbackUrl(),
    });

    const error = getErrorFromResult(result);
    if (!error) {
      try {
        await apiRequest('/api/auth/signup-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            appUrl: window.location.origin,
          }),
        });
      } catch (signupEmailError) {
        console.warn('Falha ao enviar email transacional de registo:', signupEmailError);
      }

      const sessionResult = await neonAuthClient.getSession();
      const nextSession = mapSessionFromResult(sessionResult);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!neonAuthClient) {
      return { error: { message: 'VITE_NEON_AUTH_URL não configurada.' } };
    }

    const result = await neonAuthClient.signIn.email({ email, password });
    const error = getErrorFromResult(result);

    if (!error) {
      const sessionResult = await neonAuthClient.getSession();
      const nextSession = mapSessionFromResult(sessionResult);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    }

    return { error };
  };

  const verifyEmailOtp = async (email: string, otp: string) => {
    if (!neonAuthClient) {
      return { error: { message: 'VITE_NEON_AUTH_URL não configurada.' } };
    }

    const result = await neonAuthClient.emailOtp.verifyEmail({ email, otp });
    const error = getErrorFromResult(result);

    if (!error) {
      const sessionResult = await neonAuthClient.getSession();
      const nextSession = mapSessionFromResult(sessionResult);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    }

    return { error };
  };

  const resendVerification = async (email: string) => {
    if (!neonAuthClient) {
      return { error: { message: 'VITE_NEON_AUTH_URL não configurada.' } };
    }

    const result = await neonAuthClient.sendVerificationEmail({
      email,
      callbackURL: getSignUpCallbackUrl(),
    });

    const error = getErrorFromResult(result);
    return { error };
  };

  const signOut = async () => {
    if (neonAuthClient) {
      await neonAuthClient.signOut();
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, verifyEmailOtp, resendVerification, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
