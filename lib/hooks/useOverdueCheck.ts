import { useState, useEffect, useCallback } from 'react';

interface OverdueAccount {
  accountNumber: string;
  company: string;
  totalMonthlyAmount: number;
  totalOverdue: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdue91_plus: number;
  vehicleCount: number;
}

interface OverdueSummary {
  totalAccountsWithOverdue: number;
  totalOverdueAmount: number;
  monthsLate: number;
  paymentDueDay: number;
}

interface OverdueCheckResponse {
  success: boolean;
  timestamp: string;
  summary: OverdueSummary;
  topOverdueAccounts: OverdueAccount[];
  allOverdueAccounts: OverdueAccount[];
}

interface UseOverdueCheckReturn {
  data: OverdueCheckResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useOverdueCheck(autoRefresh: boolean = false, refreshInterval: number = 300000): UseOverdueCheckReturn {
  const [data, setData] = useState<OverdueCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverdueData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/overdue-check', {
        method: forceRefresh ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: forceRefresh ? JSON.stringify({ forceRefresh: true }) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch overdue data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching overdue data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchOverdueData(false), [fetchOverdueData]);
  const forceRefresh = useCallback(() => fetchOverdueData(true), [fetchOverdueData]);

  // Initial fetch
  useEffect(() => {
    fetchOverdueData();
  }, [fetchOverdueData]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOverdueData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOverdueData]);

  return {
    data,
    loading,
    error,
    refresh,
    forceRefresh,
    lastUpdated,
  };
}

// Hook for getting just the summary data
export function useOverdueSummary(autoRefresh: boolean = false): {
  summary: OverdueSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useOverdueCheck(autoRefresh);
  
  return {
    summary: data?.summary || null,
    loading,
    error,
    refresh,
  };
}

// Hook for getting top overdue accounts
export function useTopOverdueAccounts(autoRefresh: boolean = false): {
  topAccounts: OverdueAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useOverdueCheck(autoRefresh);
  
  return {
    topAccounts: data?.topOverdueAccounts || [],
    loading,
    error,
    refresh,
  };
}
