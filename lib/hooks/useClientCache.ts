import { useState, useCallback, useEffect } from 'react';
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
  prefix: string;
  totalMonthlyAmount: number;
  totalAmountDue: number;
  vehicleCount: number;
  uniqueClientCount: number;
}

interface UseClientCacheReturn {
  companyGroups: CompanyGroup[];
  contactInfo: Record<string, ContactInfo>;
  loading: boolean;
  loadingContacts: boolean;
  totalCount: number;
  fetchCompanyGroups: (search?: string) => Promise<void>;
  fetchContactInfo: (groups: CompanyGroup[]) => Promise<void>;
  clearCache: () => void;
  isDataLoaded: boolean;
  getContactForGroup: (groupId: string) => ContactInfo | null;
  getCompanyGroupById: (id: string) => CompanyGroup | null;
}

export const useClientCache = (cacheKey: string = 'default'): UseClientCacheReturn => {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [contactInfo, setContactInfo] = useState<Record<string, ContactInfo>>({});
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedCompanyGroups = localStorage.getItem(`${cacheKey}_company_groups`);
      const savedContactInfo = localStorage.getItem(`${cacheKey}_contact_info`);
      const savedTotalCount = localStorage.getItem(`${cacheKey}_total_count`);
      
      if (savedCompanyGroups && savedContactInfo && savedTotalCount) {
        setCompanyGroups(JSON.parse(savedCompanyGroups));
        setContactInfo(JSON.parse(savedContactInfo));
        setTotalCount(JSON.parse(savedTotalCount));
        setIsDataLoaded(true);
        console.log(`Loaded client data from localStorage for key: ${cacheKey}`);
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, [cacheKey]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem(`${cacheKey}_company_groups`, JSON.stringify(companyGroups));
        localStorage.setItem(`${cacheKey}_contact_info`, JSON.stringify(contactInfo));
        localStorage.setItem(`${cacheKey}_total_count`, JSON.stringify(totalCount));
        console.log(`Saved client data to localStorage for key: ${cacheKey}`);
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
      }
    }
  }, [companyGroups, contactInfo, totalCount, isDataLoaded, cacheKey]);

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

  const fetchContactInfo = useCallback(async (groups: CompanyGroup[]) => {
    try {
      setLoadingContacts(true);
      const contactPromises = groups.map(async (group) => {
        if (group.all_new_account_numbers) {
          // Get the first account number and extract prefix
          const firstAccount = group.all_new_account_numbers.split(',')[0].trim();
          const prefix = firstAccount.split('-')[0];
          
          // Fetch contact info from customers table using the prefix
          try {
            const response = await fetch(`/api/customers/contact-info?prefix=${prefix}`);
            if (response.ok) {
              const data = await response.json();
              if (data.customer) {
                return {
                  groupId: group.id,
                  contact: data.customer
                };
              }
            }
          } catch (fetchError) {
            console.error(`Error fetching contact for prefix ${prefix}:`, fetchError);
          }
        }
        return { groupId: group.id, contact: null };
      });

      const contactResults = await Promise.all(contactPromises);
      const contactMap: Record<string, ContactInfo> = {};
      contactResults.forEach(result => {
        if (result.contact) {
          contactMap[result.groupId] = result.contact;
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

  const clearCache = useCallback(() => {
    setCompanyGroups([]);
    setContactInfo({});
    setTotalCount(0);
    setIsDataLoaded(false);
    
    // Clear from localStorage
    try {
      localStorage.removeItem(`${cacheKey}_company_groups`);
      localStorage.removeItem(`${cacheKey}_contact_info`);
      localStorage.removeItem(`${cacheKey}_total_count`);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, [cacheKey]);

  const getContactForGroup = useCallback((groupId: string): ContactInfo | null => {
    return contactInfo[groupId] || null;
  }, [contactInfo]);

  const getCompanyGroupById = useCallback((id: string): CompanyGroup | null => {
    return companyGroups.find(group => group.id === id) || null;
  }, [companyGroups]);

  return {
    companyGroups,
    contactInfo,
    loading,
    loadingContacts,
    totalCount,
    fetchCompanyGroups,
    fetchContactInfo,
    clearCache,
    isDataLoaded,
    getContactForGroup,
    getCompanyGroupById,
  };
};
