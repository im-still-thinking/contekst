'use client';

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { WalletConnect } from './WalletConnect';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'Contekst Wallet',
  projectId: 'YOUR_PROJECT_ID', // Get this from https://cloud.walletconnect.com/
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false,
});

const queryClient = new QueryClient();

export default function WalletPage() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              maxWidth: '400px',
              width: '100%',
              margin: '20px'
            }}>
              <h1 style={{ 
                textAlign: 'center', 
                marginBottom: '30px',
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                Connect Your Wallet
              </h1>
              <p style={{
                textAlign: 'center',
                color: '#666',
                marginBottom: '30px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                Connect your wallet to use Contekst extension features
              </p>
              <WalletConnect />
            </div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
