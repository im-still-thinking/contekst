'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuthContext } from '../providers/AuthProvider';

interface SignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SignInButton({ onSuccess, onError, className }: SignInButtonProps) {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading, signIn } = useAuthContext();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignIn = async () => {
    if (!isConnected || !address) {
      onError?.('Please connect your wallet first');
      return;
    }

    setIsSigning(true);
    try {
      await signIn();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      onError?.(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  // If wallet is not connected, show connect button
  if (!isConnected) {
    return (
      <div className={className}>
        <ConnectButton />
      </div>
    );
  }

  // If wallet is connected but not authenticated, show sign in button
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <button
          onClick={handleSignIn}
          disabled={isLoading || isSigning}
          className={`
            px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
            hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors duration-200 flex items-center justify-center gap-2
            ${className || ''}
          `}
        >
          {(isLoading || isSigning) ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isSigning ? 'Signing...' : 'Loading...'}
            </>
          ) : (
            'Sign In with Wallet'
          )}
        </button>
      </div>
    );
  }

  // If authenticated, show success state
  return (
    <div className={className}>
      <div className="px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Authenticated
      </div>
    </div>
  );
}
