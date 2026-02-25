'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Car, 
  Building2, 
  Users,
  Eye,
  Loader2,
  FileText,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PrefixAccountsPage() {
  const params = useParams();
  const pathname = usePathname();
  const prefix = params.prefix as string;
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefixInfo, setPrefixInfo] = useState(null);

  useEffect(() => {
    if (prefix) {
      fetchAccountsForPrefix();
    }
  }, [prefix]);

  const fetchAccountsForPrefix = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers?prefix=${prefix}`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data.accounts || []);
      setPrefixInfo(data.prefixInfo);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/protected/fc">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Clients
            </Button>
          </Link>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></Loader2>
            <p className="text-gray-600">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/protected/fc">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Clients
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-2xl">{prefix} Accounts</h1>
            <p className="text-gray-600">
              {prefixInfo?.company_name || `${prefix} Client`} - {accounts.length} accounts
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
            { id: 'completed-jobs', label: 'Job Card Review', icon: CheckCircle, href: '/protected/fc/completed-jobs' }
          ].map((navItem) => {
            const Icon = navItem.icon;
            const isActive = pathname === navItem.href;
            
            return (
              <Link
                key={navItem.id}
                href={navItem.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{navItem.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Accounts</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{accounts.length}</div>
            <p className="text-muted-foreground text-xs">
              Individual accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Vehicles</CardTitle>
            <Car className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {accounts.reduce((sum, account) => sum + (account.vehicle_count || 0), 0)}
            </div>
            <p className="text-muted-foreground text-xs">
              Across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Client</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">
              {prefixInfo?.company_name || `${prefix} Client`}
            </div>
            <p className="text-muted-foreground text-xs">
              Prefix: {prefix}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Sample Vehicles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <div className="flex flex-col items-center">
                      <Building2 className="mb-2 w-8 h-8 text-gray-400" />
                      <p className="text-gray-500">No accounts found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.new_account_number} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {account.new_account_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {account.vehicle_count} vehicles
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      <div className="space-y-1">
                        {account.vehicles?.slice(0, 2).map((vehicle, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Car className="w-3 h-3 text-gray-400" />
                            <span>
                              {vehicle.group_name || vehicle.new_registration || 'Unknown Plate'}
                            </span>
                            {vehicle.beame_1 && (
                              <span className="text-gray-400 text-xs">
                                • {vehicle.beame_1} {vehicle.beame_2}
                              </span>
                            )}
                          </div>
                        ))}
                        {account.vehicle_count > 2 && (
                          <div className="text-gray-400 text-xs">
                            +{account.vehicle_count - 2} more
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/protected/fc/accounts/${account.new_account_number}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
