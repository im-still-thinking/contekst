'use client';

import { useState } from 'react';

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    address: string;
    id: string;
  };
  error?: string;
}

interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async (address: string, signature: string, nonce: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify', {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getNonce = async (address: string): Promise<NonceResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get nonce');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get nonce';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignature = async (address: string, signature: string, nonce: string): Promise<AuthResponse> => {
    return authenticate(address, signature, nonce);
  };

  return {
    authenticate,
    getNonce,
    verifySignature,
    isLoading,
    error,
  };
}
