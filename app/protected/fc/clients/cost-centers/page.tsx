'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Building2, 
  Calendar,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CostCenter {
  id: string;
  created_at: string;
  cost_code: string;
  company: string;
}

function ClientCostCentersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountsParam = searchParams.get('accounts');
  
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 50;

  useEffect(() => {
    if (accountsParam) {
      const decodedAccounts = decodeURIComponent(accountsParam);
      const accounts = decodedAccounts.split(',').map(acc => acc.trim()).filter(acc => acc);
      console.log('🔍 [COST CENTERS] URL accounts param:', accountsParam);
      console.log('🔍 [COST CENTERS] Decoded accounts:', decodedAccounts);
      console.log('🔍 [COST CENTERS] Parsed accounts array:', accounts);
      setAccountNumbers(accounts);
      fetchClientInfo(accounts);
    }
  }, [accountsParam]);

  // Fetch cost centers after client info is loaded
  useEffect(() => {
    if (accountsParam && clientInfo) {
      console.log('🔄 [COST CENTERS] Client info loaded, fetching cost centers');
      console.log('🔄 [COST CENTERS] Client info:', clientInfo);
      fetchCostCenters(accountsParam);
    }
  }, [accountsParam, clientInfo]);

  // Filter cost centers based on search term (company only)
  useEffect(() => {
    console.log('🔍 [COST CENTERS] Filtering cost centers. Search term:', searchTerm);
    console.log('🔍 [COST CENTERS] Total cost centers:', costCenters.length);
    console.log('🔍 [COST CENTERS] Cost centers data:', costCenters);
    
    if (searchTerm.trim() === '') {
      console.log('✅ [COST CENTERS] No search term, showing all cost centers');
      setFilteredCostCenters(costCenters);
    } else {
      const filtered = costCenters.filter(center =>
        center.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('🔍 [COST CENTERS] Filtered results:', filtered.length);
      console.log('🔍 [COST CENTERS] Filtered data:', filtered);
      setFilteredCostCenters(filtered);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, costCenters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCostCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCostCenters = filteredCostCenters.slice(startIndex, endIndex);

  const fetchCostCenters = async (allNewAccountNumbers: string) => {
    try {
      setLoading(true);
      console.log('🔍 [COST CENTERS] Fetching cost centers from database for account numbers:', allNewAccountNumbers);
      
      // Parse account numbers
      const accounts = allNewAccountNumbers.split(',').map(acc => acc.trim()).filter(acc => acc);
      console.log('🔢 [COST CENTERS] Parsed account numbers:', accounts);
      
      if (accounts.length === 0) {
        console.log('⚠️ [COST CENTERS] No account numbers provided');
        setCostCenters([]);
        return;
      }
      
      // Fetch cost centers from the database where cost_code matches account numbers
      const apiUrl = `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(allNewAccountNumbers)}`;
      console.log('🌐 [COST CENTERS] API call:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      console.log('📡 [COST CENTERS] Response status:', response.status);
      console.log('📡 [COST CENTERS] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [COST CENTERS] Response not ok:', errorText);
        throw new Error(`Failed to fetch cost centers: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ [COST CENTERS] Data received from database:', data);
      console.log('📊 [COST CENTERS] Cost centers count:', data.costCenters?.length || 0);
      console.log('📋 [COST CENTERS] Cost centers data:', data.costCenters);
      
      setCostCenters(data.costCenters || []);
    } catch (error) {
      console.error('💥 [COST CENTERS] Error fetching cost centers from database:', error);
      toast.error('Failed to load cost centers from database');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientInfo = async (accounts: string[]) => {
    try {
      // Get client info from the customers-grouped API
      const response = await fetch(`/api/customers-grouped?fetchAll=true`);
      if (response.ok) {
        const data = await response.json();
        const client = data.companyGroups?.find((group: any) => {
          const groupAccounts = group.all_new_account_numbers?.split(',').map((acc: string) => acc.trim()) || [];
          return accounts.some(acc => groupAccounts.includes(acc));
        });
        if (client) {
          setClientInfo(client);
        }
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
    }
  };

  const handleBack = () => {
    router.push('/protected/fc');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
          {/* Table Header Skeleton */}
          <div className="gap-4 grid grid-cols-3 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex items-center">
              <div className="bg-gray-200 rounded w-20 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-end">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
          </div>

      {/* Table Body Skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="gap-4 grid grid-cols-3 bg-white px-6 py-2">
            {/* Cost Center Column Skeleton */}
            <div className="flex items-center">
              <div className="bg-gray-200 rounded-full w-24 h-6 animate-pulse"></div>
            </div>

            {/* Cost Code Column Skeleton */}
            <div className="flex justify-center items-center">
              <div>
                <div className="bg-gray-200 rounded w-20 h-4 animate-pulse"></div>
              </div>
            </div>


            {/* Actions Column Skeleton */}
            <div className="flex justify-end items-center">
              <div className="bg-gray-200 rounded w-12 h-8 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        {/* Top Navigation */}
        <div className="bg-white border-gray-200 border-b">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="p-0">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  FC Dashboard
                </Button>
                <span className="text-gray-400">›</span>
                <span className="text-gray-600">Cost Centers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                  <span className="font-medium text-blue-600 text-sm">FC</span>
                </div>
                <span className="font-medium text-gray-900 text-sm">Field Coordinator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-gray-900 text-3xl">Cost Centers</h1>
            <p className="text-gray-600">
              Manage cost centers and their account permissions for {clientInfo?.company_group || 'this client'}.
            </p>
          </div>

          {/* Controls Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 rounded w-32 h-4 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
                  <div className="bg-gray-200 rounded-lg w-64 h-10 animate-pulse"></div>
                  <div className="bg-gray-200 rounded w-24 h-10 animate-pulse"></div>
              <div className="bg-gray-200 rounded w-16 h-10 animate-pulse"></div>
            </div>
          </div>

          {/* Loading Skeleton */}
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!accountsParam) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="mb-4 font-semibold text-xl">No Account Numbers Provided</h2>
          <p className="mb-4 text-gray-600">Please select a client from the main dashboard.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-gray-200 border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="p-0">
                <ArrowLeft className="mr-2 w-4 h-4" />
                FC Dashboard
              </Button>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">Cost Centers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                <span className="font-medium text-blue-600 text-sm">FC</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">Field Coordinator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">Cost Centers</h1>
          <p className="text-gray-600">
            Manage cost centers and their account permissions for {clientInfo?.company_group || 'this client'}.
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">
              All cost centers {filteredCostCenters.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <input
                type="text"
                placeholder="Search by company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <Button 
              onClick={() => {
                if (accountsParam) {
                  const decodedAccounts = decodeURIComponent(accountsParam);
                  fetchCostCenters(decodedAccounts);
                }
              }}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
              className="ml-2"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
          {(() => {
            console.log('🎨 [COST CENTERS] Rendering table. Filtered count:', filteredCostCenters.length);
            console.log('🎨 [COST CENTERS] Total cost centers:', costCenters.length);
            console.log('🎨 [COST CENTERS] Paginated cost centers:', paginatedCostCenters.length);
            console.log('🎨 [COST CENTERS] Paginated data:', paginatedCostCenters);
            
            return filteredCostCenters.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">
                  {costCenters.length === 0 ? 'No cost centers found' : 'No matching cost centers'}
                </h3>
                <p className="mb-4 text-gray-500">
                  {costCenters.length === 0 
                    ? `No cost centers found for the provided account numbers`
                    : `No cost centers match your search "${searchTerm}"`
                  }
                </p>
              </div>
            ) : (
            <>
              {/* Table Header */}
              <div className="gap-4 grid grid-cols-3 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 text-sm">Cost Center</span>
                </div>
                <div className="text-center">
                  <span className="font-medium text-gray-700 text-sm">Cost Code</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-700 text-sm">Actions</span>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {paginatedCostCenters.map((costCenter) => (
                  <div key={costCenter.id} className="gap-4 grid grid-cols-3 bg-white hover:bg-gray-50 px-6 py-2 transition-colors">
                    {/* Cost Center Column */}
                    <div className="flex items-center">
                      <span className="inline-flex items-center bg-green-100 px-2 py-1 rounded-full font-medium text-green-800 text-xs">
                        {costCenter.company || 'N/A'}
                      </span>
                    </div>

                    {/* Cost Code Column */}
                    <div className="flex justify-center items-center">
                      <div>
                        <div className="font-medium text-gray-900">{costCenter.cost_code}</div>
                      </div>
                    </div>


                    {/* Actions Column */}
                    <div className="flex justify-end items-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/protected/fc/accounts/${costCenter.cost_code}`)}
                        className="hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
            );
          })()}
        </div>

        {/* Pagination */}
        {filteredCostCenters.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-gray-700 text-sm">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCostCenters.length)} of {filteredCostCenters.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  
                  // Show first 3 pages, current page, and last 3 pages
                  const shouldShow = 
                    pageNum <= 3 || 
                    pageNum >= totalPages - 2 || 
                    Math.abs(pageNum - currentPage) <= 1;
                  
                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (pageNum === 4 && currentPage > 5) {
                      return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                    }
                    if (pageNum === totalPages - 3 && currentPage < totalPages - 4) {
                      return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="p-0 w-8 h-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function CostCentersLoading() {
  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-gray-200 border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 rounded w-20 h-8 animate-pulse"></div>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">Cost Centers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                <span className="font-medium text-blue-600 text-sm">FC</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">Field Coordinator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="mb-8">
          <div className="bg-gray-200 mb-2 rounded w-48 h-8 animate-pulse"></div>
          <div className="bg-gray-200 rounded w-96 h-4 animate-pulse"></div>
        </div>
        <div className="bg-gray-200 rounded-lg w-full h-96 animate-pulse"></div>
      </div>
    </div>
  );
}

export default function ClientCostCentersPage() {
  return (
    <Suspense fallback={<CostCentersLoading />}>
      <ClientCostCentersContent />
    </Suspense>
  );
}
