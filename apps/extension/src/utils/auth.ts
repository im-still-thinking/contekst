// Authentication helper for content scripts

// Check if user is authenticated by checking storage
export async function isAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(!!result.accessToken);
    });
  });
}

// Get access token from storage
export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken'], (result) => {
      resolve(result.accessToken || null);
    });
  });
}

// Show authentication required notification
export function showAuthRequiredNotification(): void {
  // Create a simple notification overlay
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">Authentication Required</div>
    <div style="font-size: 12px;">Please authenticate in the extension popup to use Contekst features.</div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Make authenticated API call
export async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('No access token available');
  }
  
  const API_BASE = 'http://localhost:3000';
  
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}