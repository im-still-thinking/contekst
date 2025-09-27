'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect } from 'react';


export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      // Send wallet info back to extension
      const message = {
        type: 'WALLET_CONNECTED',
        address: address,
        timestamp: Date.now()
      };

      // Store in localStorage as primary method
      try {
        if (typeof (globalThis as any).window !== 'undefined') {
          (globalThis as any).window.localStorage.setItem('walletAddress', address);
          (globalThis as any).window.localStorage.setItem('walletConnected', 'true');
          (globalThis as any).window.localStorage.setItem('walletMessage', JSON.stringify(message));
        }
      } catch (e) {
        console.log('Could not store in localStorage:', e);
      }

      // Try to send via chrome.runtime if available
      try {
        if (typeof chrome !== 'undefined' && (chrome as any).runtime) {
          (chrome as any).runtime.sendMessage(message);
        }
      } catch (e) {
        console.log('Could not send chrome message:', e);
      }

      // Redirect to success URL with address for extension background to capture
      try {
        if (typeof (globalThis as any).window !== 'undefined') {
          const target = new URL('/wallet-success', (globalThis as any).window.location.origin);
          target.searchParams.set('address', address);
          (globalThis as any).window.location.replace(target.toString());
        }
      } catch (e) {
        console.log('Could not redirect to success URL:', e);
      }
    }
  }, [isConnected, address]);

  return (
    <div style={{ textAlign: 'center' }}>
      <ConnectButton />
      
      {isConnected && address && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #0ea5e9'
        }}>
          <p style={{ 
            color: '#0369a1', 
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✅ Wallet Connected!
          </p>
          <p style={{ 
            color: '#666', 
            margin: '0',
            fontSize: '12px',
            wordBreak: 'break-all'
          }}>
            {address}
          </p>
          <p style={{ 
            color: '#666', 
            margin: '10px 0 0 0',
            fontSize: '12px'
          }}>
            This window will close automatically...
          </p>
        </div>
      )}
    </div>
  );
}
