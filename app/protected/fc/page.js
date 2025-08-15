"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import NewAccountDialog from "@/components/ui-personal/new-account-dialog";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Building2,
  Eye,
} from "lucide-react";

export default function AccountsDashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);

  // Fetch customers data
  const fetchCustomers = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await response.json();
      
      console.log('Customers data received:', data);
      
      const newCustomers = data.customers || [];
      
      setCustomers(newCustomers);
      setTotalCount(newCustomers.length);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers("");
  }, [fetchCustomers]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(searchTerm);
        fetchCustomers(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  const handleNewAccount = () => {
    setShowNewAccountDialog(true);
  };

  const handleNewAccountCreated = (newAccount) => {
    console.log('New account created:', newAccount);
    fetchCustomers(); // Refresh the list
    toast.success('New account created successfully!');
    setShowNewAccountDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Clients"
          subtitle="Browse individual clients"
          icon={Users}
          actionButton={{
            label: "New Account",
            onClick: handleNewAccount,
            icon: Plus
          }}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></Loader2>
            <p className="text-gray-600">Loading companies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Companies"
        subtitle="Browse individual companies"
        icon={Users}
        actionButton={{
          label: "New Account",
          onClick: handleNewAccount,
          icon: Plus
        }}
      />

      {/* Search and Filter */}
      <div className="flex sm:flex-row flex-col gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        {/* Filter is removed as per the simplified component */}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Showing {filteredCustomers.length} of {totalCount} clients
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Cost Centers</TableHead>
                <TableHead>Total Vehicles</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Building2 className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No companies found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.prefix} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{customer.company_name}</div>
                        <div className="text-sm text-gray-500">Prefix: {customer.prefix}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {customer.total_accounts} cost centers
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {customer.total_vehicles} vehicles
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="space-y-1">
                        {customer.accounts?.slice(0, 3).map((account, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">
                              {account}
                            </span>
                          </div>
                        ))}
                        {customer.total_accounts > 3 && (
                          <div className="text-xs text-gray-400">
                            +{customer.total_accounts - 3} more accounts
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/protected/fc/companies/${customer.prefix}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          View All Accounts
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

      {/* Empty State */}
      {customers.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No companies found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : `Get started by creating your first company.`
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Company
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <NewAccountDialog
        open={showNewAccountDialog}
        onOpenChange={setShowNewAccountDialog}
        onAccountCreated={handleNewAccountCreated}
      />
    </div>
  );
}
