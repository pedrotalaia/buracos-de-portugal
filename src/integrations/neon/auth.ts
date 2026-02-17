import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

export const authProvider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'neon').toLowerCase();
export const isNeonAuthEnabled = authProvider === 'neon';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
const isValidNeonAuthUrl = typeof neonAuthUrl === 'string' && /^https?:\/\//i.test(neonAuthUrl);

if (neonAuthUrl && !isValidNeonAuthUrl) {
  console.error('VITE_NEON_AUTH_URL inválida: deve começar com http:// ou https://');
}

export const neonAuthClient = isValidNeonAuthUrl
  ? createAuthClient(neonAuthUrl, {
      adapter: BetterAuthReactAdapter(),
    })
  : null;
