'use client';

import React, { useEffect, useState } from 'react';

export default function WalletSuccessPage() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const addr = params.get('address');
      if (addr) {
        setAddress(addr);
        // Also drop in localStorage for visibility/debug
        localStorage.setItem('walletAddress', addr);
        localStorage.setItem('walletConnected', 'true');
      }
    } catch (_) {}
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, marginBottom: '12px' }}>Wallet Connected</h2>
        <p style={{ margin: 0, color: '#555' }}>{address}</p>
        <p style={{ marginTop: '12px', color: '#777', fontSize: '12px' }}>
          You can close this tab now.
        </p>
      </div>
    </div>
  );
}







