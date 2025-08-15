"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

export default function ClientJobCards({ onQuoteCreated, accountNumber }) {
  const [clientQuotes, setClientQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(null);
  const [deletingQuote, setDeletingQuote] = useState(null);

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

  const filteredClientQuotes = clientQuotes.filter(quote => {
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        quote.job_number?.toLowerCase().includes(searchLower) ||
        quote.customer_name?.toLowerCase().includes(searchLower) ||
        quote.job_type?.toLowerCase().includes(searchLower) ||
        quote.quotation_number?.toLowerCase().includes(searchLower) ||
        quote.new_account_number?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (selectedFilter !== "all") {
      return quote.status === selectedFilter;
    }
    
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
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
        description: `Quote ${quote.job_number} has been approved and moved to job cards.`
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

  const handleDeleteQuote = async (quote) => {
    // Confirm before deleting
    if (!confirm(`Are you sure you want to delete quote ${quote.job_number}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDeletingQuote(quote.id);
      
      // Delete the client quote
      const response = await fetch(`/api/client-quotes/${quote.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete quote');
      }

      toast.success('Quote deleted successfully!', {
        description: `Quote ${quote.job_number} has been removed.`
      });

      // Refresh the client quotes list
      fetchClientQuotes();

    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Failed to delete quote', {
        description: error.message
      });
    } finally {
      setDeletingQuote(null);
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
                            placeholder={accountNumber ? `Search quotes for account ${accountNumber} by quote number, customer, or type...` : "Search quotes by quote number, customer, account, or type..."}
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
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "all" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  All Quotes
                </button>
                <button
                  onClick={() => setSelectedFilter("draft")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "draft" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setSelectedFilter("pending")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "pending" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setSelectedFilter("approved")}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFilter === "approved" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  Approved
                </button>
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
                  <TableHead>Total Amount</TableHead>
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
                    <TableCell className="font-medium">{formatCurrency(quote.quotation_total_amount)}</TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusText(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {quote.status !== 'approved' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
                              onClick={() => handleDeleteQuote(quote)}
                              disabled={deletingQuote === quote.id}
                            >
                              {deletingQuote === quote.id ? (
                                <RefreshCw className="mr-1 w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1 w-4 h-4" />
                              )}
                              {deletingQuote === quote.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
}
