"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Eye, MoreHorizontal, Building2, Phone, Bug, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Account {
  id: string;
  name: string;
  landline_no?: string;
  new_account_number?: string;
  company_trading_name?: string;
  company?: string;
}

interface PaginationInfo {
  offset: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
  totalCount: number; // Added for search results info
}

// Memoized Search Bar Component
const SearchBar = React.memo(({ searchTerm, onSearch, onClearSearch }) => (
  <tr>
    <td colSpan={5} className="p-4">
      <div className="relative max-w-md">
        <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
        <Input
          placeholder="Search by company name..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="pr-10 pl-10 h-10"
        />
        {searchTerm && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSearch}
            className="top-1/2 right-2 absolute p-0 w-6 h-6 -translate-y-1/2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </td>
  </tr>
));

SearchBar.displayName = 'SearchBar';

// Memoized Search Results Info Component
const SearchResultsInfo = React.memo(({ searchTerm, accounts, totalCount }) => {
  if (!searchTerm) return null;
  
  return (
    <tr>
      <td colSpan={5} className="p-4 text-gray-600 text-sm">
        <p>
          Found {accounts.length} company{accounts.length !== 1 ? 's' : ''} matching "{searchTerm}"
          {totalCount > 0 && (
            <span className="text-gray-400"> (of {totalCount} total)</span>
          )}
        </p>
      </td>
    </tr>
  );
});

SearchResultsInfo.displayName = 'SearchResultsInfo';

// Memoized Loading Skeletons Component
const LoadingSkeletons = React.memo(() => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-gray-100 border-b">
        <td className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="rounded-lg w-10 h-10" />
            <div className="space-y-2">
              <Skeleton className="w-[120px] h-4" />
              <Skeleton className="w-[80px] h-3" />
            </div>
          </div>
        </td>
        <td className="p-4">
          <Skeleton className="w-[100px] h-4" />
        </td>
        <td className="p-4">
          <Skeleton className="w-[80px] h-4" />
        </td>
        <td className="p-4">
          <Skeleton className="w-[150px] h-4" />
        </td>
        <td className="p-4">
          <div className="flex gap-2">
            <Skeleton className="rounded-md w-8 h-8" />
            <Skeleton className="rounded-md w-8 h-8" />
          </div>
        </td>
      </tr>
    ))}
  </>
));

LoadingSkeletons.displayName = 'LoadingSkeletons';

// Memoized Error Message Component
const ErrorMessage = React.memo(({ error, onRetry, onDebug, debugInfo }) => (
  <tr>
    <td colSpan={5} className="p-4 text-red-500 text-center">
      <div className="space-y-2">
        <p className="font-medium">Error loading accounts</p>
        <p className="text-sm">{error}</p>
        <div className="flex justify-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRetry}
          >
            Retry
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onDebug}
          >
            <Bug className="mr-1 w-4 h-4" />
            Debug
          </Button>
        </div>
        {debugInfo && (
          <div className="mt-4 text-left">
            <details className="text-xs">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="bg-gray-100 mt-2 p-2 rounded overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </td>
  </tr>
));

ErrorMessage.displayName = 'ErrorMessage';

// Memoized No Results Component
const NoResults = React.memo(({ searchTerm, onClearSearch, onDebug, debugInfo }) => (
  <tr>
    <td colSpan={5} className="p-4 text-gray-500 text-center">
      <div className="space-y-2">
        <p>{searchTerm ? `No companies found matching "${searchTerm}"` : "No accounts found"}</p>
        {searchTerm && (
          <div className="flex justify-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onClearSearch}
            >
              Clear Search
            </Button>
            <p className="text-gray-400 text-xs">Try a different company name</p>
          </div>
        )}
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onDebug}
        >
          <Bug className="mr-1 w-4 h-4" />
          Debug Database
        </Button>
        {debugInfo && (
          <div className="mt-4 text-left">
            <details className="text-xs">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="bg-gray-100 mt-2 p-2 rounded overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </td>
  </tr>
));

NoResults.displayName = 'NoResults';

// Memoized Account Row Component
const AccountRow = React.memo(({ account, index, onViewDetails }) => (
  <tr
    key={account.id}
    className="hover:bg-gray-50 border-gray-100 border-b transition-colors animate-fade-in-up cursor-pointer"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <td className="p-4">
      <div className="flex items-center space-x-3">
        <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{account.name}</p>
          <p className="text-gray-500 text-sm">
            ID: ACC-{account.id.toString().padStart(4, "0")}
          </p>
        </div>
      </div>
    </td>
    <td className="p-4">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">{account.landline_no || "N/A"}</span>
      </div>
    </td>
    <td className="p-4 text-gray-600">
      {account.new_account_number || "N/A"}
    </td>
    <td className="p-4 text-gray-600">
      {account.company_trading_name || account.company || "N/A"}
    </td>
    <td className="p-4">
      <div className="flex justify-center items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          className="hover:bg-blue-50 p-0 hover:border-blue-200 w-8 h-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Eye button clicked for account:", account.id);
            onViewDetails(account.id);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" className="p-0 w-8 h-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </td>
  </tr>
));

AccountRow.displayName = 'AccountRow';

// Memoized Load More Button Component
const LoadMoreButton = React.memo(({ hasMore, loadingMore, onLoadMore }) => {
  if (!hasMore) return null;
  
  return (
    <tr>
      <td colSpan={5} className="p-4 text-center">
        <Button
          onClick={onLoadMore}
          disabled={loadingMore}
          variant="outline"
          className="space-x-2"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <span>Load More Accounts</span>
          )}
        </Button>
      </td>
    </tr>
  );
});

LoadMoreButton.displayName = 'LoadMoreButton';

const AccountsList = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    offset: 0,
    limit: 20,
    hasMore: false,
    totalPages: 0,
    totalCount: 0
  });
  const router = useRouter();

  const fetchAccounts = useCallback(async (offset: number = 0, append: boolean = false, search: string = "") => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Get the current hostname and port
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      
      // Build URL with search parameters
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: '20'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const url = `${baseUrl}/api/accounts?${params.toString()}`;
      console.log("Fetching from:", url);
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      // Check if response is ok
      if (!response.ok) {
        // Try to parse error as JSON first
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, get the text content
          try {
            const textContent = await response.text();
            console.error("API returned HTML/text instead of JSON:", textContent.substring(0, 200));
            errorMessage = "Server returned invalid response format";
          } catch (textError) {
            errorMessage = "Failed to parse server response";
          }
        }
        
        throw new Error(errorMessage);
      }

      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);
      
      if (!contentType || !contentType.includes("application/json")) {
        const textContent = await response.text();
        console.error("API returned non-JSON response:", textContent.substring(0, 200));
        throw new Error("Server returned invalid response format");
      }

      const data = await response.json();
      console.log("Response data:", data);
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch accounts");
      }

      if (append) {
        setAccounts(prev => [...prev, ...(data.accounts || [])]);
      } else {
        setAccounts(data.accounts || []);
      }

      // Update pagination info
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error fetching accounts:", err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts(0, false, searchTerm);
  }, [searchTerm, fetchAccounts]);

  const handleLoadMore = useCallback(() => {
    const nextOffset = pagination.offset + pagination.limit;
    fetchAccounts(nextOffset, true, searchTerm);
  }, [pagination.offset, pagination.limit, fetchAccounts, searchTerm]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    // Reset pagination when searching
    setPagination(prev => ({ ...prev, offset: 0 }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleDebug = useCallback(async () => {
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      
      const response = await fetch(`${baseUrl}/api/debug`);
      const data = await response.json();
      
      setDebugInfo(data);
      console.log("Debug info:", data);
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Failed to get debug info");
    }
  }, []);

  const handleViewDetails = useCallback((accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    console.log("Navigating to account:", accountId, "with company:", account?.company_trading_name || account?.company);
    
    const url = `/protected/fc/accounts/${accountId}?company=${
      encodeURIComponent(account?.company_trading_name || account?.company || "N/A")
    }`;
    
    console.log("Navigation URL:", url);
    
    try {
      router.push(url);
    } catch (error) {
      console.error("Router navigation failed:", error);
      // Fallback to window.location
      window.location.href = url;
    }
  }, [accounts, router]);

  const handleRetry = useCallback(() => {
    fetchAccounts(0, false, searchTerm);
  }, [fetchAccounts, searchTerm]);

  // Memoized content based on state
  const content = useMemo(() => {
    if (loading) {
      return (
        <>
          <SearchBar 
            searchTerm={searchTerm} 
            onSearch={handleSearch} 
            onClearSearch={handleClearSearch} 
          />
          <LoadingSkeletons />
        </>
      );
    }

    if (error) {
      return (
        <>
          <SearchBar 
            searchTerm={searchTerm} 
            onSearch={handleSearch} 
            onClearSearch={handleClearSearch} 
          />
          <ErrorMessage 
            error={error} 
            onRetry={handleRetry} 
            onDebug={handleDebug} 
            debugInfo={debugInfo} 
          />
        </>
      );
    }

    return (
      <>
        <SearchBar 
          searchTerm={searchTerm} 
          onSearch={handleSearch} 
          onClearSearch={handleClearSearch} 
        />
        <SearchResultsInfo 
          searchTerm={searchTerm} 
          accounts={accounts} 
          totalCount={pagination.totalCount} 
        />
        {accounts.length === 0 && !loading && (
          <NoResults 
            searchTerm={searchTerm} 
            onClearSearch={handleClearSearch} 
            onDebug={handleDebug} 
            debugInfo={debugInfo} 
          />
        )}
        {accounts.map((account, index) => (
          <AccountRow 
            key={account.id} 
            account={account} 
            index={index} 
            onViewDetails={handleViewDetails} 
          />
        ))}
        <LoadMoreButton 
          hasMore={pagination.hasMore} 
          loadingMore={loadingMore} 
          onLoadMore={handleLoadMore} 
        />
      </>
    );
  }, [
    loading, 
    error, 
    searchTerm, 
    accounts, 
    pagination, 
    loadingMore, 
    debugInfo,
    handleSearch,
    handleClearSearch,
    handleRetry,
    handleDebug,
    handleViewDetails,
    handleLoadMore
  ]);

  return content;
};

export default React.memo(AccountsList);