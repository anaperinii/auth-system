const BASE_URL = '/api';

const TOKEN_STORAGE_KEY = 'accessToken';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthData {
  user: PublicUser;
  accessToken: string;
  tokenType: 'Bearer';
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    memberSince: string;
  };
  serverTime: string;
}

export interface DashboardResult {
  message: string;
  data: DashboardData;
}

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, code: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const token = {
  get: (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (value: string): void => localStorage.setItem(TOKEN_STORAGE_KEY, value),
  clear: (): void => localStorage.removeItem(TOKEN_STORAGE_KEY),
};

export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const payloadPart = jwt.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  withAuth?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: { code: string; message: string; details?: FieldErrors };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, withAuth = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (withAuth) {
    const accessToken = token.get();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !envelope.success) {
    throw new ApiError(
      envelope.error?.message ?? 'Erro inesperado.',
      response.status,
      envelope.error?.code ?? 'UNKNOWN',
      envelope.error?.details,
    );
  }

  return envelope;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export const api = {
  async register(input: RegisterInput): Promise<AuthData> {
    const { data } = await request<AuthData>('/auth/register', { method: 'POST', body: input });
    return data!;
  },

  async login(email: string, password: string): Promise<AuthData> {
    const { data } = await request<AuthData>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return data!;
  },

  async dashboard(): Promise<DashboardResult> {
    const envelope = await request<DashboardData>('/dashboard', { withAuth: true });

    if (!envelope.data) {
      throw new ApiError('Sessão inválida.', 401, 'UNAUTHORIZED');
    }

    return { message: envelope.message ?? '', data: envelope.data };
  },
};
