'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
  const groupsCacheRef = useRef<
    Map<string, { companyGroups: CompanyGroup[]; totalCount: number; cachedAt: number }>
  >(new Map());
  const contactCacheRef = useRef<Map<string, ContactInfo>>(new Map());

  const fetchContactInfo = useCallback(async (groups: CompanyGroup[]) => {
    try {
      setLoadingContacts(true);

      const allAccountNumbers = new Set<string>();
      const groupAccountMap: Record<string, string[]> = {};

      groups.forEach((group) => {
        if (!group.all_new_account_numbers) return;

        const accountNumbers = group.all_new_account_numbers
          .split(',')
          .map((account) => account.trim())
          .filter((account) => account.length > 0);

        groupAccountMap[group.id] = accountNumbers;
        accountNumbers.forEach((account) => allAccountNumbers.add(account));
      });

      const accountNumbersArray = Array.from(allAccountNumbers);
      const uncachedAccountNumbers = accountNumbersArray.filter(
        (accountNumber) => !contactCacheRef.current.has(accountNumber),
      );

      if (uncachedAccountNumbers.length > 0) {
        const response = await fetch('/api/customers/contact-info/batch', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountNumbers: uncachedAccountNumbers }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch batch contact info');
        }

        const data = await response.json();
        const customerMap = data.customers || {};

        Object.entries(customerMap).forEach(([accountNumber, customer]) => {
          contactCacheRef.current.set(accountNumber, customer as ContactInfo);
        });
      }

      const contactMap: Record<string, ContactInfo> = {};
      groups.forEach((group) => {
        const accountNumbers = groupAccountMap[group.id] || [];

        for (const accountNumber of accountNumbers) {
          const cachedContact = contactCacheRef.current.get(accountNumber);
          if (cachedContact) {
            contactMap[group.id] = cachedContact;
            break;
          }
        }
      });

      setContactInfo(contactMap);
    } catch (error) {
      console.error('Error fetching contact info:', error);
      toast.error('Failed to load contact information');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchCompanyGroups = useCallback(async (search = '') => {
    const normalizedSearch = search.trim().toLowerCase();
    const cachedGroupResult = groupsCacheRef.current.get(normalizedSearch);

    if (cachedGroupResult && Date.now() - cachedGroupResult.cachedAt < 60000) {
      setCompanyGroups(cachedGroupResult.companyGroups);
      setPaymentData({});
      setTotalCount(cachedGroupResult.totalCount);
      setIsDataLoaded(true);

      if (cachedGroupResult.companyGroups.length > 0) {
        await fetchContactInfo(cachedGroupResult.companyGroups);
      }

      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/customers-grouped?search=${encodeURIComponent(search)}&fetchAll=true&includePayments=false`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch company groups');
      }

      const data = await response.json();
      const newCompanyGroups = data.companyGroups || [];
      const nextTotalCount = data.count || newCompanyGroups.length;

      setCompanyGroups(newCompanyGroups);
      setPaymentData({});
      setTotalCount(nextTotalCount);
      setIsDataLoaded(true);
      groupsCacheRef.current.set(normalizedSearch, {
        companyGroups: newCompanyGroups,
        totalCount: nextTotalCount,
        cachedAt: Date.now(),
      });

      if (newCompanyGroups.length > 0) {
        await fetchContactInfo(newCompanyGroups);
      }
    } catch (error) {
      console.error('Error fetching company groups:', error);
      toast.error('Failed to load company groups');
    } finally {
      setLoading(false);
    }
  }, [fetchContactInfo]);

  const clearData = useCallback(() => {
    setCompanyGroups([]);
    setContactInfo({});
    setPaymentData({});
    setTotalCount(0);
    setIsDataLoaded(false);
    groupsCacheRef.current.clear();
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
