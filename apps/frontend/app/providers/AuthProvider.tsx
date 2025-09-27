'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    address: string;
    signature?: string;
  } | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ address: string; signature?: string } | null>(null);

  const { authenticate, verifySignature } = useAuth();

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const storedAuth = localStorage.getItem('contekst_auth');
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (authData.address && authData.signature) {
            setUser(authData);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error parsing stored auth data:', error);
          localStorage.removeItem('contekst_auth');
        }
      }
    };

    checkAuthStatus();
  }, []);

  // Handle wallet disconnection
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      signOut();
    }
  }, [isConnected, isAuthenticated]);

  const signIn = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json() as { nonce: string };

      // Step 2: Sign the message
      const message = `Sign this message to authenticate with Contekst:\n\nNonce: ${nonce}\nAddress: ${address}`;
      const signature = await signMessageAsync({ message });

      // Step 3: Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          nonce,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Signature verification failed');
      }

      const authData = await verifyResponse.json() as Record<string, any>;

      // Step 4: Store authentication data
      const userData = {
        address,
        signature,
        ...authData,
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('contekst_auth', JSON.stringify(userData));

    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('contekst_auth');
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
