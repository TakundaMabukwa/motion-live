'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Download, 
  AlertTriangle, 
  RefreshCw,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/contexts/AccountsContext';

export default function AccountsClientsSection() {
  const { 
    companyGroups, 
    vehicleAmounts,
    loading, 
    loadingAmounts,
    totalCount, 
    fetchCompanyGroups, 
    fetchVehicleAmounts,
    isDataLoaded 
  } = useAccounts();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Initial load
  useEffect(() => {
    if (!isDataLoaded) {
      fetchCompanyGroups('');
    }
  }, [fetchCompanyGroups, isDataLoaded]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(searchTerm);
        fetchCompanyGroups(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchCompanyGroups, debouncedSearchTerm]);

  const filteredCompanyGroups = useMemo(() => {
    return companyGroups;
  }, [companyGroups]);

  const handleRefresh = async () => {
    try {
      await fetchCompanyGroups(searchTerm);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleViewClients = async (group: any) => {
    if (!group.all_new_account_numbers) {
      toast.error('No account numbers found for this client');
      return;
    }

    try {
      // Fetch payment data for this client's account numbers
      const response = await fetch(`/api/payments/by-client-accounts?all_new_account_numbers=${encodeURIComponent(group.all_new_account_numbers)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment data');
      }

      const data = await response.json();
      
      // Store payment data in sessionStorage for the next page
      sessionStorage.setItem('clientPaymentData', JSON.stringify({
        clientInfo: {
          companyGroup: group.company_group,
          legalNames: group.legal_names_list,
          accountNumbers: group.all_new_account_numbers
        },
        payments: data.payments,
        summary: data.summary
      }));

      // Navigate to the client cost centers page
      const url = `/protected/client-cost-centers/${group.prefix}`;
      window.location.href = url;
      
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data. Please try again.');
    }
  };



  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || amount === 0) {
      return 'R 0.00';
    }
    
    return `R ${amount.toFixed(2)}`;
  };

  const getOverdueStatus = (totalAmountDue: number) => {
    if (totalAmountDue === 0) return 'current';
    if (totalAmountDue < 1000) return 'low';
    if (totalAmountDue < 5000) return 'medium';
    return 'high';
  };

  const getOverdueColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading clients...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">View Clients</h1>
          <p className="mt-2 text-gray-600">Manage and view all client information with legal names and vehicle amounts</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

             {/* Summary Stats */}
       <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Clients</CardTitle>
             <Users className="w-4 h-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-blue-600 text-2xl">{filteredCompanyGroups.length}</div>
             <p className="text-muted-foreground text-xs">Active company groups</p>
           </CardContent>
         </Card>

         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Amount Due Now</CardTitle>
             <AlertTriangle className="w-4 h-4 text-red-500" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-red-600 text-2xl">
               {formatCurrency(filteredCompanyGroups.reduce((sum, group) => sum + (group.totalAmountDue || 0), 0))}
             </div>
             <p className="text-muted-foreground text-xs">Overdue amounts after 21st of month</p>
           </CardContent>
         </Card>
       </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Clients</CardTitle>
          <p className="text-gray-600 text-sm">Search by company group, legal names, or account numbers</p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="Search by company group or legal names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Client Company Groups</CardTitle>
          <p className="text-gray-600 text-sm">All clients with their legal names, account information, and vehicle amounts</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                             <TableHeader>
                                           <TableRow>
                            <TableHead>Company Group</TableHead>
                            <TableHead>Legal Names</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
               </TableHeader>
              <TableBody>
                {filteredCompanyGroups.map((group, index) => (
                  <TableRow key={group.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell>
                      <div className="font-medium text-gray-900 text-sm">
                        {group.company_group || 'N/A'}
                      </div>
                    </TableCell>
                                         <TableCell>
                       <div className="text-gray-900 text-sm">
                         {group.legal_names_list?.slice(0, 2).join(', ') || 'N/A'}
                         {group.legal_names_list?.length > 2 && (
                           <span className="text-gray-500 text-xs"> +{group.legal_names_list.length - 2} more</span>
                         )}
                       </div>
                     </TableCell>

                    <TableCell className="text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => handleViewClients(group)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="mr-1 w-4 h-4" />
                          View Clients
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredCompanyGroups.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                {loading ? 'Loading clients...' : 'No clients found'}
              </h3>
              <p className="text-gray-500">
                {loading 
                  ? 'Please wait while we load the client data...'
                  : searchTerm 
                    ? `No clients match your search "${searchTerm}"`
                    : 'No client data available at the moment.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
