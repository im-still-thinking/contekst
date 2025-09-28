'use client';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAccount } from 'wagmi';
import { logoutUser, api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuditTrail {
  id: string;
  walletId: string;
  leaseId?: string;
  entity: string;
  action: 'access_granted' | 'access_denied' | 'lease_created' | 'lease_revoked';
  reason: string;
  userPrompt?: string;
  source?: string;
  accessedMemories: string[];
  timestamp: string;
}

interface AuditStats {
  totalAccess: number;
  accessGranted: number;
  accessDenied: number;
  uniqueEntities: number;
  totalMemoriesAccessed: number;
}

function DashboardContent() {
  const { address } = useAccount();
  const router = useRouter();
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'granted' | 'denied'>('all');

  useEffect(() => {
    if (address) {
      fetchAuditData();
    }
  }, [address]);

  const fetchAuditData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch audit trails and stats in parallel
      const [trailsResponse, statsResponse] = await Promise.all([
        api.get('/audit/trail'),
        api.get('/audit/stats')
      ]);

      if (trailsResponse.ok && statsResponse.ok) {
        const trailsData = await trailsResponse.json() as { success: boolean; trails?: AuditTrail[]; error?: string };
        const statsData = await statsResponse.json() as { success: boolean; stats?: AuditStats; error?: string };
        
        if (trailsData.success) {
          setAuditTrails(trailsData.trails || []);
        } else {
          setError(trailsData.error || 'Failed to fetch audit trails');
        }
        
        if (statsData.success) {
          setAuditStats(statsData.stats || null);
        } else {
          console.warn('Failed to fetch audit stats:', statsData.error);
        }
      } else {
        setError('Failed to fetch audit data');
      }
    } catch (error: any) {
      console.error('Error fetching audit data:', error);
      setError(`Failed to fetch audit data: ${error.message || 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'access_granted':
        return <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>;
      case 'access_denied':
        return <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>;
      case 'lease_created':
        return <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>;
      case 'lease_revoked':
        return <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>;
      default:
        return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>;
    }
  };

  const getEntityIcon = (entity: string) => {
    if (entity.includes('chatgpt')) return '/assets/openai.svg';
    if (entity.includes('claude')) return '/assets/claudeDark.svg';
    return '/assets/brain.svg';
  };

  const filteredTrails = auditTrails.filter(trail => {
    if (filter === 'all') return true;
    if (filter === 'granted') return trail.action === 'access_granted';
    if (filter === 'denied') return trail.action === 'access_denied';
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-custom-primary-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-custom-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-custom-primary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-custom-primary-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-custom-primary-500">Security Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-6 py-2 bg-white text-custom-primary-500 border border-custom-primary-300 rounded-lg hover:bg-custom-primary-50 transition-colors duration-200 font-medium"
              >
                Home
              </Link>
              <Link
                href="/lease"
                className="px-6 py-2 bg-white text-custom-primary-500 border border-custom-primary-300 rounded-lg hover:bg-custom-primary-50 transition-colors duration-200 font-medium"
              >
                Manage Leases
              </Link>
              <button
                onClick={fetchAuditData}
                className="px-6 py-2 bg-custom-primary-500 text-white rounded-lg hover:bg-custom-primary-600 transition-colors duration-200 font-medium"
              >
                Refresh Data
              </button>
            </div>
            <div className="flex items-center gap-4">
              {address && (
                <div className="text-sm text-custom-primary-600">
                  <span className="font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-custom-primary-600 bg-white border border-custom-primary-300 rounded-lg hover:bg-custom-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
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

        {/* Stats Cards */}
        {auditStats && (
          <div className="grid grid-cols-5 gap-5 mb-8">
            {/* Total Access Attempts */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-custom-primary-500">
                    {auditStats.totalAccess}
                  </div>
                  <div className="text-custom-primary-400 font-semibold">Total Access</div>
                </div>
              </div>
              <Image src="/assets/brain.svg" alt="Total" width={120} height={120} className="absolute -top-6 -right-6" />
            </div>

            {/* Access Granted */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-green-600">
                    {auditStats.accessGranted}
                  </div>
                  <div className="text-custom-primary-400 font-semibold">Granted</div>
                </div>
              </div>
              <svg className="absolute -top-2 -right-2 w-24 h-24 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Access Denied */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-red-600">
                    {auditStats.accessDenied}
                  </div>
                  <div className="text-custom-primary-400 font-semibold">Denied</div>
                </div>
              </div>
              <svg className="absolute -top-2 -right-2 w-24 h-24 text-red-100" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Unique Entities */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-custom-primary-500">
                    {auditStats.uniqueEntities}
                  </div>
                  <div className="text-custom-primary-400 font-semibold">Unique Apps</div>
                </div>
              </div>
              <Image src="/assets/arrow.svg" alt="Apps" width={120} height={120} className="absolute -top-6 -right-6" />
            </div>

            {/* Memories Accessed */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-custom-primary-500">
                    {auditStats.totalMemoriesAccessed}
                  </div>
                  <div className="text-custom-primary-400 font-semibold">Memories Used</div>
                </div>
              </div>
              <Image src="/assets/lock.svg" alt="Memories" width={120} height={120} className="absolute -top-6 -right-6" />
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <span className="text-custom-primary-600 font-medium">Filter by action:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === 'all' 
                    ? 'bg-custom-primary-500 text-white' 
                    : 'bg-custom-primary-100 text-custom-primary-600 hover:bg-custom-primary-200'
                }`}
              >
                All ({auditTrails.length})
              </button>
              <button
                onClick={() => setFilter('granted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === 'granted' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                Granted ({auditTrails.filter(t => t.action === 'access_granted').length})
              </button>
              <button
                onClick={() => setFilter('denied')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === 'denied' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                Denied ({auditTrails.filter(t => t.action === 'access_denied').length})
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-custom-primary-400 text-white px-6 py-4">
            <div className="grid grid-cols-7 gap-4 font-medium">
              <div>Action</div>
              <div>Entity/App</div>
              <div>Source</div>
              <div>Reason</div>
              <div>Memories</div>
              <div>User Prompt</div>
              <div>Timestamp</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {filteredTrails.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1" />
                </svg>
                <p>No audit trails found</p>
              </div>
            ) : (
              filteredTrails.map((trail) => (
                <div key={trail.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-7 gap-4 items-center">
                    {/* Action Column */}
                    <div className="flex items-center gap-3">
                      {getActionIcon(trail.action)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {trail.action.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Entity Column */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <Image src={getEntityIcon(trail.entity)} alt={trail.entity} width={16} height={16} />
                      </div>
                      <span className="text-sm text-gray-900">{trail.entity}</span>
                    </div>

                    {/* Source Column */}
                    <div className="text-sm text-gray-600">
                      {trail.source || 'N/A'}
                    </div>

                    {/* Reason Column */}
                    <div className="text-sm text-gray-600">
                      <div className="max-w-xs truncate" title={trail.reason}>
                        {trail.reason}
                      </div>
                    </div>

                    {/* Memories Column */}
                    <div className="text-sm text-gray-600">
                      {trail.accessedMemories.length > 0 ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {trail.accessedMemories.length} memories
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>

                    {/* User Prompt Column */}
                    <div className="text-sm text-gray-600">
                      {trail.userPrompt ? (
                        <div className="max-w-xs truncate" title={trail.userPrompt}>
                          "{trail.userPrompt}"
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>

                    {/* Timestamp Column */}
                    <div className="text-sm text-gray-500">
                      {new Date(trail.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
