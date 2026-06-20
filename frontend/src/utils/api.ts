export const API_BASE = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getAuthTokens() {
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    userId: localStorage.getItem('userId'),
  };
}

export async function postJSON(path: string, body: any) {
  return requestJSON(path, 'POST', body);
}

export async function getJSON(path: string) {
  return requestJSON(path, 'GET');
}

export async function patchJSON(path: string, body?: any) {
  return requestJSON(path, 'PATCH', body);
}

export async function putJSON(path: string, body?: any) {
  return requestJSON(path, 'PUT', body);
}

export async function deleteJSON(path: string) {
  return requestJSON(path, 'DELETE');
}

async function requestJSON(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: any) {
  // Helper to actually perform the fetch with current access token
  async function doFetch() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  // Try once, if 401 attempt refresh and retry one more time
  let attempt = 0;
  while (attempt < 2) {
    const { res, json } = await doFetch();
    if (res.ok) return json;

    // If unauthorized and we have a refresh token, try to refresh access token and retry once
    if (res.status === 401 && attempt === 0) {
      try {
        await refreshAccessToken();
        attempt++;
        continue; // retry
      } catch (e) {
        // refresh failed - clear tokens and surface original error
        clearAuthTokens();
        throw { status: res.status, ...json };
      }
    }

    // Other errors, or second attempt failed
    throw { status: res.status, ...json };
  }
}

let refreshingPromise: Promise<void> | null = null;

async function refreshAccessToken() {
  // Dedupe concurrent refresh attempts
  if (refreshingPromise) return refreshingPromise;

  const tokens = getAuthTokens();
  if (!tokens.refreshToken) throw new Error('No refresh token');

  refreshingPromise = (async () => {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      refreshingPromise = null;
      throw json || new Error('Failed to refresh token');
    }

    // Save new tokens
    saveAuthTokens({ accessToken: json.accessToken, refreshToken: json.refreshToken });
    refreshingPromise = null;
  })();

  return refreshingPromise;
}

export function clearAuthTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('onboardingComplete');
  localStorage.removeItem('onboarded');
  window.dispatchEvent(new Event('auth-changed'));
}

export function saveAuthTokens(payload: { accessToken?: string; refreshToken?: string; userId?: string }) {
  if (payload.accessToken) localStorage.setItem('accessToken', payload.accessToken);
  if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken);
  if (payload.userId) localStorage.setItem('userId', payload.userId);
  window.dispatchEvent(new Event('auth-changed'));
}

export function setOnboardingCompleteState(complete: boolean) {
  localStorage.setItem('onboardingComplete', complete ? '1' : '0');
  window.dispatchEvent(new Event('auth-changed'));
}

export function isOnboardingCompleteState() {
  return localStorage.getItem('onboardingComplete') === '1';
}
