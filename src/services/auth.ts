let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const API_BASE = 'https://hub.prodev.cl/api/v1';

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Vital para enviar y recibir la cookie de renovación httpOnly
  };

  let response = await fetch(`${API_BASE}${endpoint}`, config);

  // Si da 401 y no es un endpoint de auth, intentamos refrescar el token (Sección 3.3 del manual técnico)
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ProDev-Client': 'prodev-mobile-pwa',
          },
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.accessToken;
          isRefreshing = false;
          onRefreshed(accessToken!);
        } else {
          isRefreshing = false;
          accessToken = null;
          throw new Error('Sesión expirada');
        }
      } catch (err) {
        isRefreshing = false;
        accessToken = null;
        throw err;
      }
    }

    // Esperar a que el nuevo token esté listo y reintentar la petición original
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((token: string) => {
        headers['Authorization'] = `Bearer ${token}`;
        fetch(`${API_BASE}${endpoint}`, { ...config, headers })
          .then(res => res.json())
          .then(resolve)
          .catch(reject);
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error HTTP: ${response.status}`);
  }

  return response.json();
}

export async function loginApi(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Credenciales inválidas');
  }
  const data = await res.json();
  accessToken = data.accessToken;
  return data;
}

export async function refreshSessionApi() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ProDev-Client': 'prodev-mobile-pwa',
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('No hay sesión activa');
  const data = await res.json();
  accessToken = data.accessToken;
  return data;
}

export async function logoutApi() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ProDev-Client': 'prodev-mobile-pwa',
      },
      credentials: 'include',
    });
  } catch (e) {
    console.error('Error en logout server-side', e);
  }
  accessToken = null;
}

export async function getMeApi() {
  return apiFetch('/auth/me');
}
