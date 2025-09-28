'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { RainbowKitProvider, RainbowKitAuthenticationProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { authenticationAdapter } from '../../lib/auth-adapter';
import { checkAuthStatus } from '../../lib/api';
import '@rainbow-me/rainbowkit/styles.css';

// Use a proper project ID or a static fallback that works
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a089e0e8b4e8c8c8c8c8c8c8c8c8c';

const config = getDefaultConfig({
  appName: 'Contekst',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false, // Disable SSR to prevent context issues
});

// Create a stable QueryClient instance to prevent re-initialization
let queryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Always make a new query client on the server
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          retry: 1,
        },
      },
    });
  }
  
  // Make a singleton on the client
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          retry: 1,
        },
      },
    });
  }
  return queryClientSingleton;
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const isAuthenticated = await checkAuthStatus();
        console.log('Auth check result:', isAuthenticated);
        setAuthStatus(isAuthenticated ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthStatus('unauthenticated');
      }
    };

    checkAuth();
  }, [isClient]);

  // Prevent hydration mismatch by not rendering on server
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthenticationProvider
          adapter={authenticationAdapter}
          status={authStatus}
        >
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
