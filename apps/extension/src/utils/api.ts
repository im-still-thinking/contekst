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
  
  // Determine the correct API path based on the endpoint
  const apiPath = endpoint.startsWith('/') ? endpoint : `/api/v1${endpoint}`;
  
  return fetch(`${API_BASE}${apiPath}`, {
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

    if (response.status === 401) {
      // Token expired or invalid, clear stored tokens
      clearAuthTokens();
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

// Enhanced API call with automatic retry on auth failure
export async function authenticatedApiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  // Determine the correct API path based on the endpoint
  const apiPath = endpoint.startsWith('/') ? endpoint : `/api/v1${endpoint}`;
  
  const response = await fetch(`${API_BASE}${apiPath}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // If token is invalid/expired, clear tokens and throw specific error
  if (response.status === 401) {
    clearAuthTokens();
    throw new Error('Authentication expired. Please reconnect your wallet.');
  }

  return response;
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
