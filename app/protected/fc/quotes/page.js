"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  FileText,
  Filter,
  ChevronDown,
  Trash2,
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
  AlertCircle,
  ExternalLink
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
  const [decliningQuote, setDecliningQuote] = useState(null);

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

      // Then, create a copy in job_cards table (don't move the original)
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
          siteContactPhone: '',
          // Include account information if available
          accountId: quote.account_id || null,
          newAccountNumber: quote.new_account_number || quote.account_number || null
        }),
      });

      if (!moveResponse.ok) {
        const errorData = await moveResponse.json();
        throw new Error(errorData.error || 'Failed to create job card copy');
      }

      toast.success('Quote approved successfully!', {
        description: `Quote ${quote.job_number} has been approved and copied to job cards.`
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

  const handleDeclineQuote = async (quote) => {
    // Confirm before declining
    if (!confirm(`Are you sure you want to decline and delete quote ${quote.job_number}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDecliningQuote(quote.id);
      
      // Delete the quote
      const response = await fetch(`/api/customer-quotes/${quote.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete quote');
      }

      toast.success('Quote declined and deleted successfully!', {
        description: `Quote ${quote.job_number} has been removed.`
      });

      // Refresh the quotes list
      fetchQuotes();

    } catch (error) {
      console.error('Error declining quote:', error);
      toast.error('Failed to decline quote', {
        description: error.message
      });
    } finally {
      setDecliningQuote(null);
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
  const declinedQuotes = quotes.filter(q => q.job_status === 'rejected').length;
  const totalValue = quotes.reduce((sum, q) => sum + (parseFloat(q.quotation_total_amount) || 0), 0);
  const approvedValue = quotes
    .filter(q => q.job_status === 'approved')
    .reduce((sum, q) => sum + (parseFloat(q.quotation_total_amount) || 0), 0);
  const declinedValue = quotes
    .filter(q => q.job_status === 'rejected')
    .reduce((sum, q) => sum + (parseFloat(q.quotation_total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Client Quotes"
          subtitle="View approved and declined quotes with their valuations"
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

  // Main navigation component
  const MainNavigation = () => {
    const pathname = window.location.pathname;
    return (
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
            { id: 'completed-jobs', label: 'Completed Jobs', icon: CheckCircle, href: '/protected/fc/completed-jobs' }
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
    );
  };

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

      {/* Main Navigation */}
      <MainNavigation />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Quotes</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{totalQuotes}</div>
            <p className="text-muted-foreground text-xs">All quotes</p>
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
            <div className="font-bold text-green-600 text-lg mt-1">
              {approvedValue >= 1000000 ? `R${(approvedValue / 1000000).toFixed(1)}M` : `R${(approvedValue / 1000).toFixed(1)}K`}
            </div>
            <p className="text-muted-foreground text-xs">Total valuation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Declined</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-red-600 text-2xl">{declinedQuotes}</div>
            <p className="text-muted-foreground text-xs">Rejected quotes</p>
            <div className="font-bold text-red-600 text-lg mt-1">
              {declinedValue >= 1000000 ? `R${(declinedValue / 1000000).toFixed(1)}M` : `R${(declinedValue / 1000).toFixed(1)}K`}
            </div>
            <p className="text-muted-foreground text-xs">Total valuation</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex sm:flex-row flex-col gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search client quotes by job number, customer, or email..."
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
                  All Client Quotes
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

      {/* Client Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Quotes</CardTitle>
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
                        {quote.job_status !== 'approved' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                              onClick={() => handleDeclineQuote(quote)}
                              disabled={decliningQuote === quote.id}
                            >
                              {decliningQuote === quote.id ? (
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-1" />
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
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              {approvingQuote === quote.id ? 'Approving...' : 'Approve'}
                            </Button>
                          </>
                        )}
                        {quote.job_status === 'approved' && (
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
      {filteredQuotes.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No client quotes found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first client quote."
                }
              </p>
              {!searchTerm && selectedFilter === "all" && (
                <Button onClick={handleNewQuote} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Client Quote
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}