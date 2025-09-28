"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAccount } from 'wagmi';
import { logoutUser, api } from '../../lib/api';
import { useRouter } from 'next/navigation';

interface LeaseDisplay {
  id: string;
  entity: string;
  status: "active" | "pending" | "expired";
  permissions: string[];
  expiresAt: string;
  createdAt: string;
  memoryCount: number;
  lastAccessed: string;
}

const availableGranters = [
  { name: "chatgpt", icon: "/assets/openai.svg" },
  { name: "claude", icon: "/assets/claudeDark.svg" }
];

const availableGrantees = [
  { name: "chatgpt", icon: "/assets/openai.svg" },
  { name: "claude", icon: "/assets/claudeDark.svg" },
  { name: "global", icon: "/assets/brain.svg" }
];

function LeasePageContent() {
  const { address } = useAccount();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedAccessSpecifier, setSelectedAccessSpecifier] = useState("global");
  const [durationDays, setDurationDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isContractLoading, setIsContractLoading] = useState(false);
  const [leases, setLeases] = useState<LeaseDisplay[]>([]);
  const [error, setError] = useState("");

  // Fetch leases on component mount and when wallet/auth changes
  useEffect(() => {
    if (address) {
      console.log('Fetching leases for address:', address);
      fetchLeases();
    } else {
      console.log('No address available, clearing leases');
      setLeases([]);
    }
  }, [address]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateLease = async () => {
    if (!selectedEntity || !selectedAccessSpecifier || !durationDays) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // Create lease via backend API
      const response = await api.post('/lease/create', {
        entity: selectedEntity,
        accessSpecifier: selectedAccessSpecifier,
        durationDays: durationDays
      });
      
      const result = await response.json() as { success: boolean; leaseId?: string; error?: string };
      
      if (response.ok && result.success) {
        alert(`Lease created successfully! Lease ID: ${result.leaseId}`);
        
        // Refresh leases list
        await fetchLeases();
        
        // Reset form
        setShowCreateForm(false);
        setSelectedEntity("");
        setSelectedAccessSpecifier("global");
        setDurationDays(30);
      } else {
        setError(result.error || 'Failed to create lease');
      }
      
      // TODO: Smart contract integration (commented for later)
      /*
      setIsContractLoading(true);
      const leaseParams: LeaseCreationParams = {
        granter: selectedEntity,
        grantee: selectedAccessSpecifier,
        durationDays: durationDays
      };

      const txHash = await contractService.createLease(leaseParams);
      console.log("Lease created successfully with transaction:", txHash);
      setIsContractLoading(false);
      */
    } catch (error: any) {
      console.error("Error creating lease:", error);
      setError(`Failed to create lease: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeLease = async (leaseId: string) => {
    if (!confirm("Are you sure you want to revoke this lease?")) {
      return;
    }

    try {
      const response = await api.post('/lease/revoke', { leaseId });
      const result = await response.json() as { success: boolean; error?: string };

      if (response.ok && result.success) {
        alert("Lease revoked successfully!");
        await fetchLeases();
      } else {
        alert(`Failed to revoke lease: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("Error revoking lease:", error);
      alert(`Failed to revoke lease: ${error.message || 'Unknown error'}`);
    }
  };

  const fetchLeases = async () => {
    try {
      console.log('Fetching leases...');
      setError(""); // Clear previous errors
      
      const response = await api.get('/lease/list');
      console.log('Lease API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json() as { success: boolean; leases: any[]; error?: string };
        console.log('Lease API result:', result);
        
        if (result.success && result.leases) {
          // Transform API data to match UI format
          const transformedLeases = result.leases.map((lease: any): LeaseDisplay => {
            const now = new Date();
            const expiresAt = new Date(lease.expiresAt);
            let status: "active" | "pending" | "expired" = "active";
            
            if (expiresAt < now) {
              status = "expired";
            } else if (!lease.isActive) {
              status = "pending";
            }

            return {
              id: lease.id,
              entity: lease.entity,
              status,
              permissions: lease.accessSpecifier === "global" ? ["read", "write"] : ["read"],
              expiresAt: expiresAt.toLocaleDateString(),
              createdAt: lease.createdAt ? new Date(lease.createdAt).toLocaleDateString() : "Unknown",
              memoryCount: 0, // This would need to be fetched separately
              lastAccessed: "Unknown"
            };
          });
          
          console.log('Transformed leases:', transformedLeases);
          setLeases(transformedLeases);
        } else {
          console.log('API returned success=false or no leases:', result);
          setError(result.error || "Failed to fetch leases");
          setLeases([]);
        }
      } else {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        setError(`Failed to fetch leases: ${response.status} ${errorText}`);
        setLeases([]);
      }
    } catch (error: any) {
      console.error("Error fetching leases:", error);
      setError(`Failed to fetch leases: ${error.message || 'Network error'}`);
      setLeases([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEntityIcon = (entity: string) => {
    if (entity.includes("chatgpt")) return "/assets/openai.svg";
    if (entity.includes("claude")) return "/assets/claudeDark.svg";
    return "/assets/brain.svg";
  };

  return (
    <div className="min-h-screen bg-custom-primary-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-custom-primary-500">Lease Management</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-6 py-2 bg-white text-custom-primary-500 border border-custom-primary-300 rounded-lg hover:bg-custom-primary-50 transition-colors duration-200 font-medium"
              >
                Dashboard
              </Link>
              {/* <Link
                href="/dashboard"
                className="px-6 py-2 bg-white text-custom-primary-500 border border-custom-primary-300 rounded-lg hover:bg-custom-primary-50 transition-colors duration-200 font-medium"
              >
                Protected Dashboard
              </Link> */}
              <button
                onClick={fetchLeases}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Refresh Leases
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 bg-custom-primary-500 text-white rounded-lg hover:bg-custom-primary-600 transition-colors duration-200 font-medium"
              >
                Create New Lease
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
        <div className="grid grid-cols-4 gap-5 mb-8">
          {/* Active Leases */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">
                  {leases.filter(l => l.status === "active").length}
                </div>
                <div className="text-custom-primary-400 font-semibold">Active Leases</div>
              </div>
            </div>
            <Image src="/assets/lock.svg" alt="Lock" width={120} height={120} className="absolute -top-6 -right-6" />
          </div>

          {/* Pending Leases */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">
                  {leases.filter(l => l.status === "pending").length}
                </div>
                <div className="text-custom-primary-400 font-semibold">Pending Leases</div>
              </div>
            </div>
            <Image src="/assets/arrow.svg" alt="Pending" width={120} height={120} className="absolute -top-6 -right-6" />
          </div>

          {/* Total Memory Access */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">
                  {leases.reduce((sum, l) => sum + l.memoryCount, 0)}
                </div>
                <div className="text-custom-primary-400 font-semibold">Total Memory Access</div>
              </div>
            </div>
            <Image src="/assets/brain.svg" alt="Brain" width={120} height={120} className="absolute -top-6 -right-6" />
          </div>

          {/* Expired Leases */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">
                  {leases.filter(l => l.status === "expired").length}
                </div>
                <div className="text-custom-primary-400 font-semibold">Expired Leases</div>
              </div>
            </div>
            <Image src="/assets/arrow.svg" alt="Expired" width={120} height={120} className="absolute -top-6 -right-6 rotate-180" />
          </div>
        </div>

        {/* Create Lease Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-custom-primary-500 mb-6">Create New Lease</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Entity Selection */}
              <div className="mb-6">
                <label className="block text-custom-primary-600 font-medium mb-2">Select Entity</label>
                <select
                  value={selectedEntity}
                  onChange={(e:any) => setSelectedEntity(e.target.value)}
                  className="w-full p-3 border border-custom-primary-300 rounded-lg focus:ring-2 focus:ring-custom-primary-500 focus:border-transparent"
                >
                  <option value="">Choose an entity...</option>
                  {availableGranters.map((entity) => (
                    <option key={entity.name} value={entity.name}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Access Specifier Selection */}
              <div className="mb-6">
                <label className="block text-custom-primary-600 font-medium mb-2">Select Access Level</label>
                <select
                  value={selectedAccessSpecifier}
                  onChange={(e:any) => setSelectedAccessSpecifier(e.target.value)}
                  className="w-full p-3 border border-custom-primary-300 rounded-lg focus:ring-2 focus:ring-custom-primary-500 focus:border-transparent"
                >
                  <option value="global">Global Access</option>
                  <option value="vscode-extension">VSCode Extension Only</option>
                  <option value="web-extension">Web Extension Only</option>
                </select>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-custom-primary-600 font-medium mb-2">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e:any) => setDurationDays(parseInt(e.target.value) || 30)}
                  className="w-full p-3 border border-custom-primary-300 rounded-lg focus:ring-2 focus:ring-custom-primary-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLease}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-custom-primary-500 text-white rounded-lg hover:bg-custom-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Lease..." : "Create Lease"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leases Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-custom-primary-400 text-white px-6 py-4">
            <div className="grid grid-cols-7 gap-4 font-medium">
              <div>Entity</div>
              <div>Status</div>
              <div>Permissions</div>
              <div>Memory Count</div>
              <div>Created</div>
              <div>Expires</div>
              <div>Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {leases.map((lease) => (
              <div key={lease.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-7 gap-4 items-center">
                  {/* Entity Column */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Image src={getEntityIcon(lease.entity)} alt={lease.entity} width={20} height={20} />
                    </div>
                    <span className="text-custom-primary-600 font-medium">{lease.entity}</span>
                  </div>

                  {/* Status Column */}
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lease.status)}`}>
                      {lease.status}
                    </span>
                  </div>

                  {/* Permissions Column */}
                  <div className="flex flex-wrap gap-1">
                    {lease.permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="bg-custom-primary-200 text-custom-primary-500 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>

                  {/* Memory Count Column */}
                  <div className="text-custom-primary-600 font-medium">
                    {lease.memoryCount}
                  </div>

                  {/* Created Column */}
                  <div className="text-custom-primary-400 text-sm">
                    {lease.createdAt}
                  </div>

                  {/* Expires Column */}
                  <div className="text-custom-primary-400 text-sm">
                    {lease.expiresAt}
                  </div>

                  {/* Actions Column */}
                  <div className="flex gap-2">
                    {/* <button className="px-3 py-1 bg-custom-primary-500 text-white rounded-lg text-xs hover:bg-custom-primary-600 transition-colors duration-200">
                      Edit
                    </button> */}
                    <button 
                      onClick={() => handleRevokeLease(lease.id)}
                      disabled={lease.status !== "active"}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeasePage() {
  return (
    <ProtectedRoute>
      <LeasePageContent />
    </ProtectedRoute>
  );
}