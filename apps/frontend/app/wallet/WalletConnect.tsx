'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect } from 'react';


export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      // Send message to the extension window that opened this tab
      const message = {
        type: 'WALLET_CONNECTED',
        address: address,
        timestamp: Date.now()
      };

      try {
        if (typeof globalThis !== 'undefined' && (globalThis as any).window?.opener) {
          // Send message to the extension popup that opened this window
          (globalThis as any).window.opener.postMessage(message, '*');
          console.log('Wallet connected, sending message to extension:', message);
          
          // Close this window to return focus to extension
          setTimeout(() => {
            (globalThis as any).window.close();
          }, 100);
        } else {
          console.log('No window.opener found - cannot send message to extension');
        }
      } catch (e) {
        console.log('Could not send postMessage to extension:', e);
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
