"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Eye,
  Check,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Car,
  Trash2,
  X,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientJobCards({ onQuoteCreated, accountNumber }) {
  const router = useRouter();
  const [clientQuotes, setClientQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(null);
  const [decliningQuote, setDecliningQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch client quotes from the client_quotes table, filtered by account number
  const fetchClientQuotes = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/client-quotes';
      if (accountNumber) {
        url += `?accountNumber=${encodeURIComponent(accountNumber)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch client quotes');
      }
      const result = await response.json();
      setClientQuotes(result.data || []);
    } catch (error) {
      console.error('Error fetching client quotes:', error);
      toast.error('Failed to fetch client quotes', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    fetchClientQuotes();
  }, [fetchClientQuotes]);

  const getSearchableRegistration = (quote) => {
    if (!quote) return '';

    if (quote.vehicle_registration) {
      return String(quote.vehicle_registration);
    }

    if (quote.job_type === 'deinstall' && Array.isArray(quote.deinstall_vehicles) && quote.deinstall_vehicles.length > 0) {
      return String(quote.deinstall_vehicles[0]?.registration || '');
    }

    if (Array.isArray(quote.quotation_products) && quote.quotation_products.length > 0) {
      const firstProduct = quote.quotation_products[0];
      return String(firstProduct?.vehicle_plate || firstProduct?.registration || '');
    }

    return '';
  };

  const filteredClientQuotes = clientQuotes.filter(quote => {
    const searchLower = searchTerm.trim().toLowerCase();
    const searchableRegistration = getSearchableRegistration(quote).toLowerCase();

    const matchesSearch = !searchLower || (
      quote.job_number?.toLowerCase().includes(searchLower) ||
      quote.customer_name?.toLowerCase().includes(searchLower) ||
      quote.job_type?.toLowerCase().includes(searchLower) ||
      quote.quotation_number?.toLowerCase().includes(searchLower) ||
      quote.new_account_number?.toLowerCase().includes(searchLower) ||
      searchableRegistration.includes(searchLower)
    );

    const matchesStatus = selectedFilter === "all" || quote.status === selectedFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "approved": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "declined": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewQuote = (quote) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedQuote(null);
  };

  const formatVehicleRegistration = (quote) => {
    let registration = null;
    
    // Try deinstall_vehicles array first
    if (quote.job_type === 'deinstall' && quote.deinstall_vehicles && quote.deinstall_vehicles.length > 0) {
      registration = quote.deinstall_vehicles[0]?.registration;
    }
    
    // Fallback: Try to get from quotation_products (vehicle_plate or vehicle_id)
    if (!registration && quote.quotation_products && quote.quotation_products.length > 0) {
      const firstProduct = quote.quotation_products[0];
      registration = firstProduct?.vehicle_plate || firstProduct?.registration;
    }
    
    // Fallback: Try vehicle_registration field (for install jobs)
    if (!registration) {
      registration = quote.vehicle_registration;
    }
    
    return registration ? <div className="font-mono font-medium">{registration}</div> : 'No Registration';
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'R0.00';
    return `R${parseFloat(amount).toFixed(2)}`;
  };

  const handleApproveQuote = async (quote) => {
    // Confirm before approving
    if (!confirm(`Are you sure you want to approve quote ${quote.job_number}? This will move it to job cards.`)) {
      return;
    }
    
    try {
      setApprovingQuote(quote.id);
      
      // Approve the client quote and move it to job_cards
      const response = await fetch(`/api/client-quotes/${quote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve quote');
      }

      toast.success('Quote approved successfully!', {
        description: `Quote ${quote.job_number} has been approved and copied to job cards.`
      });

      // Refresh the client quotes list
      fetchClientQuotes();

    } catch (error) {
      console.error('Error approving quote:', error);
      toast.error('Failed to approve quote', {
        description: error.message
      });
    } finally {
      setApprovingQuote(null);
    }
  };

  const handleDeclineQuote = async (quote) => {
    // Confirm before declining
    if (!confirm(`Are you sure you want to decline quote ${quote.job_number}?`)) {
      return;
    }
    
    try {
      setDecliningQuote(quote.id);
      
      // Decline the client quote (change status instead of deleting)
      const response = await fetch(`/api/client-quotes/${quote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'decline'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decline quote');
      }

      toast.success('Quote declined successfully!', {
        description: `Quote ${quote.job_number} has been declined.`
      });

      // Refresh the client quotes list
      fetchClientQuotes();

    } catch (error) {
      console.error('Error declining quote:', error);
      toast.error('Failed to decline quote', {
        description: error.message
      });
    } finally {
      setDecliningQuote(null);
    }
  };

  // Calculate statistics
  const totalQuotes = clientQuotes.length;
  const pendingQuotes = clientQuotes.filter(q => q.status === 'pending').length;
  const draftQuotes = clientQuotes.filter(q => q.status === 'draft').length;
  const totalValue = clientQuotes.reduce((sum, q) => sum + (parseFloat(q.quotation_total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading client quotes...</p>
        </div>
      </div>
    );
  }

  if (clientQuotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No client quotes yet</h3>
          <p className="text-gray-500">Create a new client quotation to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Quotes</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalQuotes}</div>
            <p className="text-muted-foreground text-xs">All time quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Pending</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-orange-600 text-2xl">{pendingQuotes}</div>
            <p className="text-muted-foreground text-xs">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Draft</CardTitle>
            <FileText className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-600 text-2xl">{draftQuotes}</div>
            <p className="text-muted-foreground text-xs">Draft quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-purple-600 text-2xl">
              {totalValue >= 1000000 ? `R${(totalValue / 1000000).toFixed(1)}M` : `R${(totalValue / 1000).toFixed(1)}K`}
            </div>
            <p className="text-muted-foreground text-xs">Combined value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex sm:flex-row flex-col gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder={accountNumber ? `Search quotes for account ${accountNumber} by quote number, customer, type, or vehicle reg...` : "Search quotes by quote number, customer, account, type, or vehicle reg..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
          {isFilterOpen && (
            <div className="right-0 z-10 absolute bg-white shadow-lg mt-2 border border-gray-200 rounded-lg w-48">
              <div className="p-2">
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <Button onClick={fetchClientQuotes} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4 text-gray-600 text-sm">
        <span>
          Showing {filteredClientQuotes.length} of {clientQuotes.length} client quotes
          {accountNumber && (
            <span className="ml-2">for account {accountNumber}</span>
          )}
          {searchTerm && (
            <span className="ml-2">filtered by "{searchTerm}"</span>
          )}
          {selectedFilter !== "all" && (
            <span className="ml-2">with status "{selectedFilter}"</span>
          )}
        </span>
      </div>

      {/* All Client Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {accountNumber ? `Client Quotes for Account ${accountNumber}` : 'All Client Quotes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Vehicle Registration</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.job_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.customer_name || 'N/A'}</div>
                        <div className="text-gray-500 text-sm">{quote.customer_email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-600 text-sm">
                        {quote.new_account_number || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{quote.job_type || 'N/A'}</TableCell>
                    <TableCell>{formatVehicleRegistration(quote)}</TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusText(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewQuote(quote)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/protected/fc/quotes/${quote.id}/edit`)}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {quote.status !== 'approved' && quote.status !== 'declined' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
                              onClick={() => handleDeclineQuote(quote)}
                              disabled={decliningQuote === quote.id}
                            >
                              {decliningQuote === quote.id ? (
                                <RefreshCw className="mr-1 w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1 w-4 h-4" />
                              )}
                              {decliningQuote === quote.id ? 'Declining...' : 'Decline'}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveQuote(quote)}
                              disabled={approvingQuote === quote.id}
                            >
                              {approvingQuote === quote.id ? (
                                <RefreshCw className="mr-1 w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="mr-1 w-4 h-4" />
                              )}
                              {approvingQuote === quote.id ? 'Approving...' : 'Approve'}
                            </Button>
                          </>
                        )}
                        {quote.status === 'approved' && (
                          <Badge className="bg-green-100 text-green-800">
                            Approved
                          </Badge>
                        )}
                        {quote.status === 'declined' && (
                          <Badge className="bg-red-100 text-red-800">
                            Declined
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredClientQuotes.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No client quotes found</h3>
              <p className="mb-4 text-gray-500">
                {searchTerm || selectedFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : accountNumber 
                    ? `No client quotes have been created for account ${accountNumber} yet.`
                    : "No client quotes have been created yet."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Quote Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={closeViewModal}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden">
          <DialogHeader className="border-b bg-white p-6">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-semibold text-gray-900">Quote Details</span>
                <span className="text-lg text-gray-500">#{selectedQuote?.job_number}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeViewModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="overflow-y-auto max-h-[calc(95vh-100px)] bg-gray-50">
              
              {/* Status Bar */}
              <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <Badge className={`ml-2 ${getStatusColor(selectedQuote.status || 'draft')}`}>
                        {getStatusText(selectedQuote.status)}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Customer:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedQuote.customer_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Vehicle:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedQuote.vehicle_registration || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Amount</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedQuote.quotation_total_amount)}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    
                    {/* Quote Information */}
                    <div className="bg-white rounded border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-base font-medium text-gray-900">Quote Information</h3>
                      </div>
                      <div className="p-4">
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Job Number</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-mono">{selectedQuote.job_number}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Job Type</dt>
                            <dd className="mt-1 text-sm text-gray-900 capitalize">{selectedQuote.job_type || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Quote Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedQuote.created_at)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Purchase Type</dt>
                            <dd className="mt-1 text-sm text-gray-900 capitalize">{selectedQuote.purchase_type || 'Purchase'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-white rounded border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-base font-medium text-gray-900">Customer Details</h3>
                      </div>
                      <div className="p-4">
                        <dl className="grid grid-cols-1 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedQuote.customer_name || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedQuote.customer_email || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedQuote.customer_phone || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedQuote.contact_person || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedQuote.customer_address || 'N/A'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="bg-white rounded border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-base font-medium text-gray-900">Vehicle Details</h3>
                      </div>
                      <div className="p-4">
                        {/* For deinstall jobs, show all vehicles from deinstall_vehicles array */}
                        {selectedQuote.job_type === 'deinstall' && selectedQuote.deinstall_vehicles && selectedQuote.deinstall_vehicles.length > 0 ? (
                          <div className="space-y-4">
                            {selectedQuote.deinstall_vehicles.map((vehicle, idx) => (
                              <div key={idx} className="pb-4 border-b last:border-b-0 last:pb-0">
                                <h4 className="mb-3 font-medium text-sm text-gray-900">Vehicle {idx + 1}</h4>
                                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                                  <div>
                                    <dt className="font-medium text-gray-500">Registration</dt>
                                    <dd className="mt-1 font-mono text-gray-900">{vehicle.registration || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Make</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.make || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Model</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.model || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Year</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.year || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">VIN</dt>
                                    <dd className="mt-1 font-mono text-xs text-gray-900">{vehicle.vin || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Odometer</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.odometer || 'N/A'} km</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Color</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.color || 'N/A'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-500">Fuel Type</dt>
                                    <dd className="mt-1 text-gray-900">{vehicle.fuel_type || 'N/A'}</dd>
                                  </div>
                                  
                                  {/* Parts being deinstalled from this vehicle */}
                                  {vehicle.parts_being_deinstalled && vehicle.parts_being_deinstalled.length > 0 && (
                                    <div className="sm:col-span-2">
                                      <dt className="font-medium text-gray-500 mb-2">Parts Being De-installed</dt>
                                      <dd>
                                        <ul className="space-y-1">
                                          {vehicle.parts_being_deinstalled.map((part, pidx) => (
                                            <li key={pidx} className="text-sm text-gray-900 flex items-center">
                                              <span className="text-gray-400 mr-2">•</span>
                                              <span>{part.name} {part.code ? `(${part.code})` : ''}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Registration</dt>
                              <dd className="mt-1">{formatVehicleRegistration(selectedQuote)}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Make</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedQuote.vehicle_make || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Model</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedQuote.vehicle_model || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Year</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedQuote.vehicle_year || 'N/A'}</dd>
                            </div>
                            {selectedQuote.vin_number && (
                              <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">VIN Number</dt>
                                <dd className="mt-1 text-xs font-mono text-gray-900">{selectedQuote.vin_number}</dd>
                              </div>
                            )}
                            {selectedQuote.odormeter && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Odometer</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedQuote.odormeter} km</dd>
                              </div>
                            )}
                            {selectedQuote.decommission_date && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Decommission Date</dt>
                                <dd className="mt-1 text-sm text-red-600">{formatDate(selectedQuote.decommission_date)}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    
                    {/* Financial Summary */}
                    <div className="bg-white rounded border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-base font-medium text-gray-900">Financial Summary</h3>
                      </div>
                      <div className="p-4">
                        <dl className="space-y-3">
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">Subtotal</dt>
                            <dd className="text-sm text-gray-900">{formatCurrency(selectedQuote.quotation_subtotal)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">VAT</dt>
                            <dd className="text-sm text-gray-900">{formatCurrency(selectedQuote.quotation_vat_amount)}</dd>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex justify-between">
                              <dt className="text-base font-medium text-gray-900">Total Amount</dt>
                              <dd className="text-base font-bold text-gray-900">{formatCurrency(selectedQuote.quotation_total_amount)}</dd>
                            </div>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {(selectedQuote.job_description || selectedQuote.quote_notes || selectedQuote.special_instructions) && (
                      <div className="bg-white rounded border">
                        <div className="border-b px-4 py-3">
                          <h3 className="text-base font-medium text-gray-900">Additional Information</h3>
                        </div>
                        <div className="p-4 space-y-4">
                          {selectedQuote.job_description && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Job Description</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedQuote.job_description}</dd>
                            </div>
                          )}
                          {selectedQuote.quote_notes && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Notes</dt>
                              <dd className="mt-1 text-sm text-gray-900">{selectedQuote.quote_notes}</dd>
                            </div>
                          )}
                          {selectedQuote.special_instructions && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Special Instructions</dt>
                              <dd className="mt-1 text-sm text-gray-900 bg-yellow-50 border border-yellow-200 rounded p-2">{selectedQuote.special_instructions}</dd>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Record Information */}
                    <div className="bg-white rounded border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-base font-medium text-gray-900">Record Information</h3>
                      </div>
                      <div className="p-4">
                        <dl className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <dt className="font-medium text-gray-500">Created</dt>
                            <dd className="text-gray-900">{formatDate(selectedQuote.created_at)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Last Updated</dt>
                            <dd className="text-gray-900">{formatDate(selectedQuote.updated_at)}</dd>
                          </div>
                          {selectedQuote.account_id && (
                            <div>
                              <dt className="font-medium text-gray-500">Account ID</dt>
                              <dd className="font-mono text-gray-900">{selectedQuote.account_id}</dd>
                            </div>
                          )}
                          {selectedQuote.new_account_number && (
                            <div>
                              <dt className="font-medium text-gray-500">Account Number</dt>
                              <dd className="font-mono text-gray-900">{selectedQuote.new_account_number}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                    
                  </div>
                  
                </div>
              
                {/* Products/Services */}
                {selectedQuote.quotation_products && selectedQuote.quotation_products.length > 0 && (
                  <div className="bg-white rounded border mt-6">
                    <div className="border-b px-4 py-3">
                      <h3 className="text-base font-medium text-gray-900">Products & Services</h3>
                    </div>
                    <div className="overflow-x-auto">
                      {selectedQuote.quotation_products.map((product, index) => (
                        <div key={index} className="border-b p-6 last:border-b-0">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{product.name || 'Product'}</div>
                                {product.is_labour && (
                                  <span className="bg-green-100 px-2 py-1 rounded text-green-800 text-xs font-medium">Once Off</span>
                                )}
                              </div>
                              {product.description && (
                                <div className="text-sm text-gray-500 mt-1">{product.description}</div>
                              )}
                              {product.type && (
                                <div className="flex gap-2 mt-2">
                                  <span className="inline-block bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">{product.type}</span>
                                  {product.category && <span className="inline-block bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs">{product.category}</span>}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Quantity</div>
                              <div className="text-lg font-bold text-gray-900">{product.quantity || 1}</div>
                            </div>
                          </div>

                          {/* Pricing Details Grid */}
                          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                            {/* Cash Pricing */}
                            {product.cash_price !== undefined && product.cash_price > 0 && (
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Cash ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.cash_price)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Discount</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.cash_discount || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Gross ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.cash_gross || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Total</div>
                                  <div className="text-sm font-bold text-blue-600 mt-1">{formatCurrency((product.cash_gross || 0) * (product.quantity || 1))}</div>
                                </div>
                              </div>
                            )}

                            {/* Rental Pricing */}
                            {product.rental_price !== undefined && product.rental_price > 0 && (
                              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Rental/Month ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.rental_price)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Discount</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.rental_discount || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Gross/Month ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.rental_gross || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Total Monthly</div>
                                  <div className="text-sm font-bold text-blue-600 mt-1">{formatCurrency((product.rental_gross || 0) * (product.quantity || 1))}</div>
                                </div>
                              </div>
                            )}

                            {/* Installation Pricing */}
                            {product.installation_price !== undefined && product.installation_price > 0 && (
                              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Installation ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.installation_price)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Discount</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.installation_discount || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Gross ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.installation_gross || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Total</div>
                                  <div className="text-sm font-bold text-blue-600 mt-1">{formatCurrency((product.installation_gross || 0) * (product.quantity || 1))}</div>
                                </div>
                              </div>
                            )}

                            {/* De-installation Pricing */}
                            {product.de_installation_price !== undefined && product.de_installation_price > 0 && (
                              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                <div>
                                  <div className="text-xs font-medium text-gray-600">De-installation ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.de_installation_price)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Discount</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.de_installation_discount || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Gross ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.de_installation_gross || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Total</div>
                                  <div className="text-sm font-bold text-blue-600 mt-1">{formatCurrency((product.de_installation_gross || 0) * (product.quantity || 1))}</div>
                                </div>
                              </div>
                            )}

                            {/* Subscription Pricing */}
                            {!product.is_labour && product.subscription_price !== undefined && product.subscription_price > 0 && (
                              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Subscription/Month ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.subscription_price)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Discount</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.subscription_discount || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Gross/Month ex VAT</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(product.subscription_gross || 0)}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-600">Total Monthly</div>
                                  <div className="text-sm font-bold text-blue-600 mt-1">{formatCurrency((product.subscription_gross || 0) * (product.quantity || 1))}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Product Total */}
                          <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Product Total:</span>
                            <span className="text-lg font-bold text-gray-900">{formatCurrency(product.total_price || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
