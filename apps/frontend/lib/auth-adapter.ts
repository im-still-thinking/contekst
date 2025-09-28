'use client';

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const response = await fetch(`${API_BASE}/api/nonce`);
    return await response.text();
  },

  createMessage: ({ nonce, address, chainId }) => {
    // Use safe defaults that work in both client and server environments
    let domain = 'https://contekst-frontend.vercel.app';
    let uri = 'https://contekst-frontend.vercel.app';
    
    if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
      domain = (globalThis as any).location.host;
      uri = (globalThis as any).location.origin;
    }
    
    return new SiweMessage({
      domain,
      address,
      statement: 'Sign in to Contekst',
      uri,
      version: '1',
      chainId,
      nonce,
      expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year
    }).prepareMessage();
  },

  verify: async ({ message, signature }) => {
    try {
      console.log('🔍 Frontend: Sending verification request');
      console.log('📄 Message:', message);
      console.log('✍️ Signature:', signature);
      
      const requestBody = { message, signature };
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers));
      
      if (response.ok) {
        const data = await response.json() as { success: boolean; accessToken: string; address: string };
        console.log('✅ Response data:', data);
        
        if (data.success) {
          // Store token securely
          localStorage.setItem('contekst_token', data.accessToken);
          localStorage.setItem('contekst_address', data.address);
          return true;
        }
      } else {
        const errorData = await response.text();
        console.log('❌ Error response:', errorData);
      }

      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  },

  signOut: async () => {
    try {
      const token = localStorage.getItem('contekst_token');
      if (token) {
        await fetch(`${API_BASE}/api/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    // Clear local tokens
    localStorage.removeItem('contekst_token');
    localStorage.removeItem('contekst_address');
  },
});