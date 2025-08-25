'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface CompanyGroup {
  id: string;
  company_group: string;
  legal_names: string;
  all_account_numbers: string;
  all_new_account_numbers: string;
  created_at: string;
  account_count: number;
  legal_names_list: string[];
  prefix: string;
  totalMonthlyAmount: number;
  totalAmountDue: number;
  vehicleCount: number;
  uniqueClientCount: number;
}

interface VehicleAmounts {
  totalMonthlyAmount: number;
  totalAmountDue: number;
  vehicleCount: number;
  vehicleInvoices: any[];
}

interface AccountsContextType {
  companyGroups: CompanyGroup[];
  vehicleAmounts: Record<string, VehicleAmounts>;
  loading: boolean;
  loadingAmounts: boolean;
  totalCount: number;
  fetchCompanyGroups: (search?: string) => Promise<void>;
  fetchVehicleAmounts: (prefix: string) => Promise<VehicleAmounts | null>;
  clearData: () => void;
  isDataLoaded: boolean;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
};

interface AccountsProviderProps {
  children: ReactNode;
}

export const AccountsProvider: React.FC<AccountsProviderProps> = ({ children }) => {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [vehicleAmounts, setVehicleAmounts] = useState<Record<string, VehicleAmounts>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAmounts, setLoadingAmounts] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch company groups data from customers-grouped table
  const fetchCompanyGroups = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounts/customers-grouped?search=${encodeURIComponent(search)}&fetchAll=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch company groups');
      }
      const data = await response.json();
      
      console.log('Company groups data received:', data);
      
      const newCompanyGroups = data.companyGroups || [];
      
      setCompanyGroups(newCompanyGroups);
      setTotalCount(data.count || newCompanyGroups.length);
      setIsDataLoaded(true);
      
    } catch (error) {
      console.error('Error fetching company groups:', error);
      toast.error('Failed to load company groups');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch vehicle amounts for a specific prefix
  const fetchVehicleAmounts = useCallback(async (prefix: string): Promise<VehicleAmounts | null> => {
    // Check if we already have this data cached
    if (vehicleAmounts[prefix]) {
      console.log('Using cached vehicle amounts for prefix:', prefix);
      return vehicleAmounts[prefix];
    }

    try {
      setLoadingAmounts(true);
      console.log('Fetching vehicle amounts for prefix:', prefix);
      
      const response = await fetch(`/api/accounts/vehicle-amounts?prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle amounts');
      }
      
      const data = await response.json();
      console.log('Vehicle amounts data received:', data);
      
      if (data.success) {
        const amounts: VehicleAmounts = {
          totalMonthlyAmount: data.totalMonthlyAmount || 0,
          totalAmountDue: data.totalAmountDue || 0,
          vehicleCount: data.vehicleCount || 0,
          vehicleInvoices: data.vehicleInvoices || []
        };
        
        // Cache the data
        setVehicleAmounts(prev => ({
          ...prev,
          [prefix]: amounts
        }));
        
        return amounts;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching vehicle amounts:', error);
      toast.error('Failed to load vehicle amounts');
      return null;
    } finally {
      setLoadingAmounts(false);
    }
  }, [vehicleAmounts]);

  // Clear all data
  const clearData = useCallback(() => {
    setCompanyGroups([]);
    setVehicleAmounts({});
    setTotalCount(0);
    setIsDataLoaded(false);
  }, []);

  // Load data from localStorage on mount if available
  useEffect(() => {
    try {
      const savedCompanyGroups = localStorage.getItem('accounts_company_groups');
      const savedVehicleAmounts = localStorage.getItem('accounts_vehicle_amounts');
      const savedTotalCount = localStorage.getItem('accounts_total_count');
      
      if (savedCompanyGroups && savedVehicleAmounts && savedTotalCount) {
        setCompanyGroups(JSON.parse(savedCompanyGroups));
        setVehicleAmounts(JSON.parse(savedVehicleAmounts));
        setTotalCount(JSON.parse(savedTotalCount));
        setIsDataLoaded(true);
        console.log('Loaded accounts data from localStorage');
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem('accounts_company_groups', JSON.stringify(companyGroups));
        localStorage.setItem('accounts_vehicle_amounts', JSON.stringify(vehicleAmounts));
        localStorage.setItem('accounts_total_count', JSON.stringify(totalCount));
        console.log('Saved accounts data to localStorage');
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
      }
    }
  }, [companyGroups, vehicleAmounts, totalCount, isDataLoaded]);

  const value: AccountsContextType = {
    companyGroups,
    vehicleAmounts,
    loading,
    loadingAmounts,
    totalCount,
    fetchCompanyGroups,
    fetchVehicleAmounts,
    clearData,
    isDataLoaded,
  };

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
};
