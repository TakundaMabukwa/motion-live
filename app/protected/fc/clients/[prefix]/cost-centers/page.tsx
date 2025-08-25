'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  new_account_number: string;
  company: string;
}

export default function ClientCostCentersPage() {
  const params = useParams();
  const router = useRouter();
  const prefix = params.prefix as string;
  
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (prefix) {
      fetchCostCenters();
      fetchClientInfo();
    }
  }, [prefix]);

  // Filter cost centers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCostCenters(costCenters);
    } else {
      const filtered = costCenters.filter(center =>
        center.new_account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCostCenters(filtered);
    }
  }, [searchTerm, costCenters]);

  const fetchCostCenters = async () => {
    try {
      setLoading(true);
      console.log('Fetching cost centers for prefix:', prefix);
      
      const response = await fetch(`/api/cost-centers/client?prefix=${prefix}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', errorText);
        throw new Error(`Failed to fetch cost centers: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Cost centers data received:', data);
      
      setCostCenters(data.costCenters || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      toast.error('Failed to load cost centers');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientInfo = async () => {
    try {
      // Get client info from the customers-grouped API
      const response = await fetch(`/api/customers-grouped?search=${prefix}&fetchAll=true`);
      if (response.ok) {
        const data = await response.json();
        const client = data.companyGroups?.find((group: any) => 
          group.all_new_account_numbers?.includes(prefix)
        );
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading cost centers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto py-6 container">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
          <div>
                         <h1 className="font-bold text-gray-900 text-2xl">
               Cost Centers
             </h1>
             {clientInfo && (
               <p className="text-gray-600">
                 {clientInfo.company_group} - {clientInfo.legal_names}
               </p>
             )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Prefix: {prefix}
          </Badge>
                     <Badge variant="secondary" className="text-sm">
             {filteredCostCenters.length} of {costCenters.length} cost centers
           </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                             <input
                 type="text"
                 placeholder="Search cost centers..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
               />
            </div>
            <Button onClick={fetchCostCenters} variant="outline">
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch(`/api/debug/cost-centers?prefix=${prefix}`);
                  const data = await response.json();
                  console.log('Debug data:', data);
                  toast.success(`Debug: Found ${data.debug?.prefixQuery?.count || 0} cost centers`);
                } catch (error) {
                  console.error('Debug error:', error);
                  toast.error('Debug failed');
                }
              }} 
              variant="outline"
            >
              Debug
            </Button>
          </div>
                     {searchTerm && (
             <div className="mt-2 text-gray-600 text-sm">
               Showing {filteredCostCenters.length} of {costCenters.length} cost centers
               {searchTerm && ` matching "${searchTerm}"`}
             </div>
           )}
        </CardContent>
      </Card>

      {/* Cost Centers Table */}
      <Card>
        <CardHeader>
                     <CardTitle className="flex items-center gap-2">
             <Building2 className="w-5 h-5" />
             Cost Centers for {prefix}
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCostCenters.length === 0 ? (
                         <div className="py-12 text-center">
               <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
               <h3 className="mb-2 font-medium text-gray-900 text-lg">
                 {costCenters.length === 0 ? 'No cost centers found' : 'No matching cost centers'}
               </h3>
               <p className="mb-4 text-gray-500">
                 {costCenters.length === 0 
                   ? `No cost centers found for account prefix "${prefix}"`
                   : `No cost centers match your search "${searchTerm}"`
                 }
               </p>
               {costCenters.length === 0 && (
                 <Button onClick={fetchCostCenters} variant="outline">
                   <RefreshCw className="mr-2 w-4 h-4" />
                   Refresh
                 </Button>
               )}
             </div>
          ) : (
                         <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Account Number</TableHead>
                   <TableHead>Company</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredCostCenters.map((costCenter) => (
                   <TableRow key={costCenter.id} className="hover:bg-gray-50">
                     <TableCell className="font-medium">
                       <div className="flex items-center gap-2">
                         <Hash className="w-4 h-4 text-gray-400" />
                         {costCenter.new_account_number}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Building2 className="w-4 h-4 text-gray-400" />
                         {costCenter.company || 'N/A'}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-gray-400" />
                         {formatDate(costCenter.created_at)}
                       </div>
                     </TableCell>
                     <TableCell className="text-right">
                       <Button 
                         size="sm" 
                         variant="outline"
                         onClick={() => {
                           // Navigate to the accounts page using the account number
                           router.push(`/protected/fc/accounts/${costCenter.new_account_number}`);
                         }}
                       >
                         View Details
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          )}
        </CardContent>
      </Card>

                           {/* Summary Stats */}
        {costCenters.length > 0 && (
          <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-600 text-sm">Total Cost Centers</p>
                    <p className="font-bold text-gray-900 text-2xl">{costCenters.length}</p>
                    {searchTerm && filteredCostCenters.length !== costCenters.length && (
                      <p className="text-gray-500 text-xs">
                        {filteredCostCenters.length} matching
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-600 text-sm">Account Prefix</p>
                    <p className="font-bold text-gray-900 text-2xl">{prefix}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-600 text-sm">Latest Created</p>
                    <p className="font-bold text-gray-900 text-2xl">
                      {costCenters.length > 0 ? formatDate(costCenters[0].created_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
