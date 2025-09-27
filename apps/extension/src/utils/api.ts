const API_BASE = 'http://localhost:3000';

// Token management for extension
export function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(result.accessToken || null);
    });
  });
}

export function setAuthToken(accessToken: string, refreshToken?: string): void {
  const data: any = { accessToken };
  if (refreshToken) {
    data.refreshToken = refreshToken;
  }
  chrome.storage.local.set(data);
}

export function clearAuthTokens(): void {
  chrome.storage.local.remove(['accessToken', 'refreshToken', 'walletAddress', 'walletConnected']);
}

// API call wrapper with token
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  return fetch(`${API_BASE}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Check if user is authenticated
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    const response = await fetch(`${API_BASE}/api/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

// Convenience methods
export const api = {
  get: (endpoint: string) => apiCall(endpoint),
  post: (endpoint: string, data: any) => 
    apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint: string, data: any) => 
    apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint: string) => 
    apiCall(endpoint, { method: 'DELETE' }),
};
