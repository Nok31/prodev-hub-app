// Capa de autenticación y cliente HTTP de ProDev Hub.

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || 'https://hub.prodev.cl/api/v1'
).replace(/\/$/, '');

const CLIENT_HEADER = 'prodev-mobile-pwa';

export interface SessionUser {
  id: string;
  identityId: string;
  name: string;
  email: string;
  role: string;
}

export interface SessionTenant {
  id: string;
  name: string;
  slug: string;
}

export interface Session {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
  tenant: SessionTenant;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  isCurrent: boolean;
}

export class ApiError extends Error {
  status: number;
  code: string;
  issues?: { path: string; message: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const error = body?.error;

  return new ApiError(
    res.status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Error HTTP: ${res.status}`,
    error?.issues,
  );
}

let accessToken: string | null = null;
let refreshPromise: Promise<Session> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setSessionExpiredHandler(
  handler: (() => void) | null,
) {
  sessionExpiredHandler = handler;
}

function send(
  endpoint: string,
  options: RequestInit,
  token: string | null,
) {
  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  if (isFormData) {
    headers.delete('Content-Type');
  } else if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('X-ProDev-Client', CLIENT_HEADER);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

async function doRefresh(): Promise<Session> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'X-ProDev-Client': CLIENT_HEADER,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    if (res.status === 401) {
      accessToken = null;
    }

    throw await toApiError(res);
  }

  const data: Session = await res.json();

  if (!data?.accessToken) {
    throw new Error('No se recibió un token de renovación válido.');
  }

  accessToken = data.accessToken;

  return data;
}

/**
 * Comparte una única renovación entre las peticiones de esta pestaña.
 */
export function refreshSessionApi(): Promise<Session> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const tokenUsed = accessToken;

  let res = await send(endpoint, options, tokenUsed);

  if (res.status === 401 && !endpoint.startsWith('/auth/')) {
    try {
      // Si otra petición ya renovó el token, reutilizarlo.
      if (!accessToken || accessToken === tokenUsed) {
        await refreshSessionApi();
      }
    } catch (err) {
      // Solo una respuesta 401 de renovación significa sesión expirada.
      if (err instanceof ApiError && err.status === 401) {
        accessToken = null;
        sessionExpiredHandler?.();
      }

      throw err;
    }

    res = await send(endpoint, options, accessToken);

    if (res.status === 401) {
      accessToken = null;
      sessionExpiredHandler?.();
    }
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json();
}

export async function loginApi(
  email: string,
  password: string,
): Promise<Session> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ProDev-Client': CLIENT_HEADER,
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  const data: Session = await res.json();

  if (!data?.accessToken) {
    throw new Error('La respuesta de inicio de sesión no contiene un token.');
  }

  accessToken = data.accessToken;

  return data;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'X-ProDev-Client': CLIENT_HEADER,
      },
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error en logout server-side', error);
  }

  accessToken = null;
}

export function getMeApi() {
  return apiFetch<{
    user: SessionUser;
    tenant: SessionTenant;
  }>('/auth/me');
}

export async function getTenantsApi(): Promise<TenantInfo[]> {
  const res = await apiFetch<{ data: TenantInfo[] }>('/auth/tenants');

  return res.data;
}

export async function switchTenantApi(
  tenantId: string,
): Promise<Session> {
  const data = await apiFetch<Session>('/auth/switch-tenant', {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  });

  accessToken = data.accessToken;

  return data;
}

/**
 * Fetch para respuestas en streaming del SDK de IA.
 * Conserva autenticación, cookies y renovación automática de sesión.
 */
export async function apiStreamFetch(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  const tokenUsed = accessToken;

  const makeRequest = (token: string | null) => {
    const headers = new Headers(options.headers);

    headers.set('X-ProDev-Client', CLIENT_HEADER);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.delete('Authorization');
    }

    return fetch(input, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  let res = await makeRequest(tokenUsed);

  if (res.status === 401) {
    try {
      if (!accessToken || accessToken === tokenUsed) {
        await refreshSessionApi();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        accessToken = null;
        sessionExpiredHandler?.();
      }

      throw err;
    }

    res = await makeRequest(accessToken);

    if (res.status === 401) {
      accessToken = null;
      sessionExpiredHandler?.();
    }
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  return res;
}
