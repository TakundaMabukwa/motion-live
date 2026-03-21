'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface ContactInfo {
  id: string;
  company: string;
  legal_name: string;
  trading_name: string;
  cell_no: string;
  email: string;
  switchboard: string;
  physical_address_1: string;
  physical_address_2: string;
  physical_area: string;
  physical_province: string;
  physical_code: string;
  postal_address_1: string;
  postal_address_2: string;
  postal_area: string;
  postal_province: string;
  postal_code: string;
  branch_person: string;
  branch_person_number: string;
  branch_person_email: string;
  new_account_number: string;
}

interface CompanyGroup {
  id: string;
  company_group: string;
  legal_names: string;
  all_account_numbers: string;
  all_new_account_numbers: string;
  created_at: string;
  account_count: number;
  legal_names_list: string[];
}

interface ClientsContextType {
  companyGroups: CompanyGroup[];
  contactInfo: Record<string, ContactInfo>;
  paymentData: Record<string, any>;
  loading: boolean;
  loadingContacts: boolean;
  totalCount: number;
  fetchCompanyGroups: (search?: string) => Promise<void>;
  fetchContactInfo: (groups: CompanyGroup[]) => Promise<void>;
  clearData: () => void;
  isDataLoaded: boolean;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider');
  }
  return context;
};

interface ClientsProviderProps {
  children: ReactNode;
}

export const ClientsProvider: React.FC<ClientsProviderProps> = ({ children }) => {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [contactInfo, setContactInfo] = useState<Record<string, ContactInfo>>({});
  const [paymentData, setPaymentData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch company groups data from customers-grouped table
  const fetchCompanyGroups = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers-grouped?search=${encodeURIComponent(search)}&fetchAll=true`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch company groups');
      }
      const data = await response.json();
      
      console.log('Company groups data received:', data);
      
      const newCompanyGroups = data.companyGroups || [];
      const newPaymentData = data.paymentData || {};
      
      setCompanyGroups(newCompanyGroups);
      setPaymentData(newPaymentData);
      setTotalCount(data.count || newCompanyGroups.length);
      setIsDataLoaded(true);
      
      // After loading company groups, fetch contact info for each
      if (newCompanyGroups.length > 0) {
        fetchContactInfo(newCompanyGroups);
      }
      
    } catch (error) {
      console.error('Error fetching company groups:', error);
      toast.error('Failed to load company groups');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch contact info for each company group using batch API
  const fetchContactInfo = useCallback(async (groups: CompanyGroup[]) => {
    try {
      setLoadingContacts(true);
      console.log('🔍 Starting batch contact info fetch for', groups.length, 'company groups');
      
      // Collect all unique account numbers from all groups
      const allAccountNumbers = new Set<string>();
      const groupAccountMap: Record<string, string[]> = {};
      
      groups.forEach(group => {
        if (group.all_new_account_numbers) {
          const accountNumbers = group.all_new_account_numbers
            .split(',')
            .map(account => account.trim())
            .filter(account => account.length > 0);
          
          groupAccountMap[group.id] = accountNumbers;
          accountNumbers.forEach(account => allAccountNumbers.add(account));
        }
      });
      
      const accountNumbersArray = Array.from(allAccountNumbers);
      console.log('📊 Batch fetching contact info for', accountNumbersArray.length, 'unique account numbers');
      
      // Make single batch API call
      const response = await fetch('/api/customers/contact-info/batch', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountNumbers: accountNumbersArray }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch contact info');
      }
      
      const data = await response.json();
      const customerMap = data.customers || {};
      
      console.log('✅ Batch API returned', data.found, 'customers out of', data.requested, 'requested');
      
      // Map customers back to groups
      const contactMap: Record<string, ContactInfo> = {};
      groups.forEach(group => {
        const accountNumbers = groupAccountMap[group.id] || [];
        
        // Find first matching customer for this group
        for (const accountNumber of accountNumbers) {
          if (customerMap[accountNumber]) {
            contactMap[group.id] = customerMap[accountNumber];
            break;
          }
        }
      });
      
      console.log(`📈 Contact info mapping completed. Found contacts for ${Object.keys(contactMap).length} groups`);
      setContactInfo(contactMap);
    } catch (error) {
      console.error('💥 Error fetching contact info:', error);
      toast.error('Failed to load contact information');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setCompanyGroups([]);
    setContactInfo({});
    setPaymentData({});
    setTotalCount(0);
    setIsDataLoaded(false);
  }, []);

  const value: ClientsContextType = {
    companyGroups,
    contactInfo,
    paymentData,
    loading,
    loadingContacts,
    totalCount,
    fetchCompanyGroups,
    fetchContactInfo,
    clearData,
    isDataLoaded,
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};
