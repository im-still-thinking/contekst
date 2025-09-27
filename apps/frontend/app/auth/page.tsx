'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { SignInButton } from '../components/SignInButton';
import { checkAuthStatus, logoutUser } from '../../lib/api';

function AuthContent() {
  const { address, isConnected } = useAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isConnected) {
        setIsAuthenticated(false);
        return;
      }

      setIsLoading(true);
      try {
        const authStatus = await checkAuthStatus();
        setIsAuthenticated(authStatus);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isConnected, address]);

  const handleSignInSuccess = () => {
    setError(null);
    setIsAuthenticated(true);
    console.log('Authentication successful!');
  };

  const handleSignInError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setError(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Contekst
          </h1>
          <p className="text-gray-600">
            Connect and authenticate your wallet to get started
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <SignInButton
            onSuccess={handleSignInSuccess}
            onError={handleSignInError}
            className="w-full"
          />

          {isAuthenticated && address && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="text-green-800 font-medium">Authentication Successful!</h3>
              </div>
              <div className="text-sm text-green-700 mb-3">
                <p className="font-medium">Connected Address:</p>
                <p className="font-mono text-xs break-all">{address}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <AuthContent />;
}
