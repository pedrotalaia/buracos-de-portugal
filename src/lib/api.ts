const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const uploadsBaseUrl = normalizeBaseUrl(import.meta.env.VITE_UPLOADS_BASE_URL || apiBaseUrl);

function normalizeBaseUrl(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function withLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

export function resolveApiUrl(input: string): string {
  if (isAbsoluteUrl(input) || !apiBaseUrl) return input;
  return `${apiBaseUrl}${withLeadingSlash(input)}`;
}

export function resolveUploadUrl(path: string | null | undefined): string | null | undefined {
  if (!path || isAbsoluteUrl(path) || !uploadsBaseUrl) return path;

  if (path.startsWith('/uploads/')) {
    return `${uploadsBaseUrl}${path}`;
  }

  return `${uploadsBaseUrl}${withLeadingSlash(path)}`;
}

export async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(input), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
