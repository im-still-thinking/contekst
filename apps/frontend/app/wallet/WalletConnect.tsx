'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SiweMessage } from 'siwe';

const API_BASE = 'http://localhost:3000';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'signing' | 'verifying' | 'success' | 'error'>('idle');
  const hasAttemptedAuth = useRef(false);

  const authenticateWithSIWE = useCallback(async () => {
    if (!address || isAuthenticating) return;
    
    setIsAuthenticating(true);
    setAuthStatus('signing');

    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await fetch(`${API_BASE}/api/nonce`);
      const nonce = await nonceResponse.text();

      // Step 2: Create SIWE message
      const message = new SiweMessage({
        domain: 'localhost:3001',
        address,
        statement: 'Sign in to Contekst Extension',
        uri: 'http://localhost:3001',
        version: '1',
        chainId: 1, // mainnet
        nonce,
        expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year
      }).prepareMessage();

      // Step 3: Sign the message
      const signature = await signMessageAsync({ message });
      
      setAuthStatus('verifying');

      // Step 4: Verify with backend
      const verifyResponse = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (verifyResponse.ok) {
        const data = await verifyResponse.json() as { success: boolean; accessToken: string; refreshToken?: string };
        
        if (data.success) {
          setAuthStatus('success');
          
          // Send tokens to extension
          const authMessage = {
            type: 'AUTH_SUCCESS',
            address: address,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || null,
            timestamp: Date.now()
          };

          try {
            if (typeof globalThis !== 'undefined' && (globalThis as any).window?.opener) {
              (globalThis as any).window.opener.postMessage(authMessage, '*');
              console.log('Authentication successful, sending tokens to extension:', { type: authMessage.type, address });
              
              // Close window after successful auth
              setTimeout(() => {
                (globalThis as any).window.close();
              }, 1000);
            }
          } catch (e) {
            console.error('Could not send postMessage to extension:', e);
          }
        } else {
          throw new Error('Verification failed');
        }
      } else {
        throw new Error('Verification request failed');
      }
    } catch (error) {
      console.error('SIWE authentication failed:', error);
      setAuthStatus('error');
      
      // Send error to extension
      if (typeof globalThis !== 'undefined' && (globalThis as any).window?.opener) {
        (globalThis as any).window.opener.postMessage({
          type: 'AUTH_ERROR',
          error: (error as Error).message || 'Authentication failed'
        }, '*');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isAuthenticating, signMessageAsync]);

  useEffect(() => {
    if (isConnected && address && !hasAttemptedAuth.current && !isAuthenticating) {
      hasAttemptedAuth.current = true;
      authenticateWithSIWE();
    }
  }, [isConnected, address, authenticateWithSIWE]);

  // Reset auth attempt when address changes (user switches wallets)
  useEffect(() => {
    hasAttemptedAuth.current = false;
    setAuthStatus('idle');
    setIsAuthenticating(false);
  }, [address]);

  return (
    <div style={{ textAlign: 'center' }}>
      <ConnectButton />
      
      {isConnected && address && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: authStatus === 'success' ? '#f0fdf4' : authStatus === 'error' ? '#fef2f2' : '#f0f9ff',
          borderRadius: '8px',
          border: `1px solid ${authStatus === 'success' ? '#16a34a' : authStatus === 'error' ? '#dc2626' : '#0ea5e9'}`
        }}>
          {authStatus === 'signing' && (
            <>
              <p style={{ color: '#0369a1', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500' }}>
                🔐 Please sign the message in your wallet...
              </p>
            </>
          )}
          
          {authStatus === 'verifying' && (
            <>
              <p style={{ color: '#0369a1', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500' }}>
                ⏳ Verifying signature...
              </p>
            </>
          )}
          
          {authStatus === 'success' && (
            <>
              <p style={{ color: '#16a34a', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500' }}>
                ✅ Authentication Successful!
              </p>
              <p style={{ color: '#666', margin: '0', fontSize: '12px', wordBreak: 'break-all' }}>
                {address}
              </p>
              <p style={{ color: '#666', margin: '10px 0 0 0', fontSize: '12px' }}>
                Tokens sent to extension. This window will close...
              </p>
            </>
          )}
          
          {authStatus === 'error' && (
            <>
              <p style={{ color: '#dc2626', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500' }}>
                ❌ Authentication Failed
              </p>
              <p style={{ color: '#666', margin: '10px 0 0 0', fontSize: '12px' }}>
                Please try again or check your wallet connection.
              </p>
            </>
          )}
          
          {authStatus === 'idle' && (
            <>
              <p style={{ color: '#0369a1', margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500' }}>
                🔗 Wallet Connected!
              </p>
              <p style={{ color: '#666', margin: '0', fontSize: '12px', wordBreak: 'break-all' }}>
                {address}
              </p>
              <p style={{ color: '#666', margin: '10px 0 0 0', fontSize: '12px' }}>
                Starting authentication...
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
