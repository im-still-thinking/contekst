'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('contekst_token');
  
  return fetch(`${API_BASE}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
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

// Token management
export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('contekst_token');
}

export function setAuthToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('contekst_token', token);
  }
}

export function clearAuthToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('contekst_token');
  }
}

// Check if user is authenticated
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = getAuthToken();
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

// Logout user
export async function logoutUser(): Promise<void> {
  try {
    const token = getAuthToken();
    
    if (token) {
      // Call backend logout endpoint
      await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Clear local storage regardless
    clearAuthToken();
  } catch (error) {
    console.error('Error logging out:', error);
    // Still clear local token even if backend call fails
    clearAuthToken();
  }
}