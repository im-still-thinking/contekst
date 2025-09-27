'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuthContext } from '../providers/AuthProvider';

function DashboardContent() {
  const { user, signOut } = useAuthContext();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Contekst Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user?.address && (
                  <span className="font-mono">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </span>
                )}
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Contekst!
              </h2>
              <p className="text-gray-600 mb-6">
                You are successfully authenticated and can now access all features.
              </p>
              
              {user && (
                <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Address:</span>
                      <p className="font-mono text-gray-600 break-all">{user.address}</p>
                    </div>
                    {user.signature && (
                      <div>
                        <span className="font-medium text-gray-700">Signature:</span>
                        <p className="font-mono text-gray-600 break-all text-xs">
                          {user.signature.slice(0, 20)}...{user.signature.slice(-20)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
