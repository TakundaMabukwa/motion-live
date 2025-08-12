"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  FileText,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Search,
  Download,
  RefreshCw,
  User,
  Building2,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { toast } from "sonner";

export default function QuotesDashboard() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(null);

  // Fetch quotes from the API
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer-quotes');
      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }
      const result = await response.json();
      setQuotes(result.data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to fetch quotes', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const filteredQuotes = useMemo(() => {
    let filtered = quotes;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(quote =>
        quote.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (selectedFilter !== "all") {
      filtered = filtered.filter(quote => quote.job_status === selectedFilter);
    }
    
    return filtered;
  }, [quotes, searchTerm, selectedFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
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
      
      // First, update the quote status to approved
      const updateResponse = await fetch(`/api/customer-quotes/${quote.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_status: 'approved'
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to approve quote');
      }

      // Then, move the quote to job_cards table
      const moveResponse = await fetch('/api/job-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Map customer_quotes fields to job_cards fields
          jobType: quote.job_type,
          jobDescription: quote.job_description,
          priority: quote.priority || 'medium',
          customerName: quote.customer_name,
          customerEmail: quote.customer_email,
          customerPhone: quote.customer_phone,
          customerAddress: quote.customer_address,
          vehicleRegistration: quote.vehicle_registration,
          vehicleMake: quote.vehicle_make,
          vehicleModel: quote.vehicle_model,
          vehicleYear: quote.vehicle_year,
          quoteDate: quote.quote_date,
          quoteExpiryDate: quote.quote_expiry_date,
          quoteStatus: 'approved',
          purchaseType: quote.purchase_type || 'purchase',
          quotationJobType: quote.job_type,
          quotationProducts: quote.quotation_products,
          quotationSubtotal: quote.quotation_subtotal,
          quotationVatAmount: quote.quotation_vat_amount,
          quotationTotalAmount: quote.quotation_total_amount,
          quoteEmailSubject: `Approved: ${quote.job_number}`,
          quoteEmailBody: quote.quote_email_body,
          quoteEmailFooter: quote.quote_email_footer,
          quoteEmailNotes: quote.quote_notes,
          quoteType: 'external',
          specialInstructions: quote.special_instructions || quote.quote_notes,
          accessRequirements: '',
          siteContactPerson: '',
          siteContactPhone: ''
        }),
      });

      if (!moveResponse.ok) {
        const errorData = await moveResponse.json();
        throw new Error(errorData.error || 'Failed to move quote to job cards');
      }

      toast.success('Quote approved successfully!', {
        description: `Quote ${quote.job_number} has been approved and moved to job cards.`
      });

      // Refresh the quotes list
      fetchQuotes();

    } catch (error) {
      console.error('Error approving quote:', error);
      toast.error('Failed to approve quote', {
        description: error.message
      });
    } finally {
      setApprovingQuote(null);
    }
  };

  const handleNewQuote = useCallback(() => {
    // Navigate to external quotation page
    window.location.href = '/protected/fc/external-quotation';
  }, []);

  // Calculate statistics
  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter(q => q.job_status === 'pending').length;
  const approvedQuotes = quotes.filter(q => q.job_status === 'approved').length;
  const totalValue = quotes.reduce((sum, q) => sum + (parseFloat(q.quotation_total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Quotes"
          subtitle="Manage your sales quotes and proposals"
          icon={FileText}
          actionButton={{
            label: "Create Quote",
            onClick: handleNewQuote,
            icon: Plus
          }}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading quotes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Quotes"
        subtitle="Manage your sales quotes and proposals"
        icon={FileText}
        actionButton={{
          label: "Create Quote",
          onClick: handleNewQuote,
          icon: Plus
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="font-medium text-sm">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{approvedQuotes}</div>
            <p className="text-muted-foreground text-xs">Moved to job cards</p>
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
            placeholder="Search quotes by job number, customer, or email..."
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
        <Button onClick={fetchQuotes} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Quote Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.job_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.customer_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{quote.customer_email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{quote.job_type || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(quote.quotation_total_amount)}</TableCell>
                    <TableCell>{formatDate(quote.quote_date)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.job_status || 'draft')}>
                        {getStatusText(quote.job_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/protected/fc/external-quotation?id=${quote.id}`, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {quote.job_status !== 'approved' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveQuote(quote)}
                            disabled={approvingQuote === quote.id}
                          >
                            {approvingQuote === quote.id ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            {approvingQuote === quote.id ? 'Approving...' : 'Approve'}
                          </Button>
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
      {filteredQuotes.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first quote."
                }
              </p>
              {!searchTerm && selectedFilter === "all" && (
                <Button onClick={handleNewQuote} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Quote
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}