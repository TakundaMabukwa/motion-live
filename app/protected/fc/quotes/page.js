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
  ExternalLink,
  Eye,
  X,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [quotePendingApproval, setQuotePendingApproval] = useState(null);
  const [annuityEndDate, setAnnuityEndDate] = useState("");
  const [approvalDestination, setApprovalDestination] = useState("");

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
        quote.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const formatVehicleRegistration = (registration) => {
    if (!registration) return 'No Registration';
    
    // Check if it's a temporary registration
    if (registration.startsWith('TEMP-')) {
      return (
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
            TEMP
          </Badge>
          <span className="text-sm ml-1">{registration.replace('TEMP-', '')}</span>
        </div>
      );
    }
    
    // Regular vehicle registration
    return (
      <div className="font-mono font-medium">
        {registration}
      </div>
    );
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'R0.00';
    return `R${parseFloat(amount).toFixed(2)}`;
  };

  const toDateInputValue = (value) => {
    if (!value) return '';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return parsedDate.toISOString().split('T')[0];
  };

  const isDeinstallOrDecommissionQuote = (quote) => {
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const jobType = normalize(quote?.job_type);
    const quotationJobType = normalize(quote?.quotation_job_type);
    const description = normalize(quote?.job_description);

    return (
      jobType.includes('deinstall') ||
      quotationJobType.includes('deinstall') ||
      jobType.includes('decommission') ||
      description.includes('decommission')
    );
  };

  const getRoutingPayload = (destination) => {
    switch (destination) {
      case 'admin':
        return {
          role: 'admin',
          move_to: 'admin',
          status: 'admin_created'
        };
      case 'inv':
        return {
          role: 'inv',
          move_to: 'inv'
        };
      case 'accounts':
        return {
          role: 'accounts',
          move_to: 'accounts'
        };
      default:
        return {};
    }
  };

  const resetApproveModalState = () => {
    setIsApproveModalOpen(false);
    setQuotePendingApproval(null);
    setAnnuityEndDate('');
    setApprovalDestination('');
  };

  const approveQuoteAndCreateJobCard = async (quote, options = {}) => {
    const { annuityDate = '', destination = 'none' } = options;

    try {
      setApprovingQuote(quote.id);
      
      // First, update the quote status to approved
      const approvePayload = {
        job_status: 'approved'
      };

      if (annuityDate) {
        approvePayload.annuity_end_date = annuityDate;
      }

      const updateResponse = await fetch(`/api/customer-quotes/${quote.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvePayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to approve quote');
      }

      const routingPayload = getRoutingPayload(destination);

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
          contactPerson: quote.contact_person,
          decommissionDate: annuityDate || quote.decommission_date || null,
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
          quoteNotes: quote.quote_notes,
          quoteType: 'external',
          specialInstructions: quote.special_instructions || quote.quote_notes,
          accessRequirements: '',
          siteContactPerson: '',
          siteContactPhone: '',
          // Include account information if available
          accountId: quote.account_id || null,
          newAccountNumber: quote.new_account_number || quote.account_number || null,
          ...routingPayload
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
      return true;

    } catch (error) {
      console.error('Error approving quote:', error);
      toast.error('Failed to approve quote', {
        description: error.message
      });
      return false;
    } finally {
      setApprovingQuote(null);
    }
  };

  const handleApproveQuote = async (quote) => {
    if (isDeinstallOrDecommissionQuote(quote)) {
      setQuotePendingApproval(quote);
      setAnnuityEndDate(toDateInputValue(quote.decommission_date));
      setApprovalDestination('');
      setIsApproveModalOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to approve quote ${quote.job_number}? This will move it to job cards.`)) {
      return;
    }

    await approveQuoteAndCreateJobCard(quote, { destination: 'none' });
  };

  const handleConfirmModalApproval = async () => {
    if (!quotePendingApproval) return;

    if (!annuityEndDate) {
      toast.error('Annuity end date is required');
      return;
    }

    if (!approvalDestination) {
      toast.error('Please choose where to route the job card');
      return;
    }

    const success = await approveQuoteAndCreateJobCard(quotePendingApproval, {
      annuityDate: annuityEndDate,
      destination: approvalDestination
    });

    if (success) {
      resetApproveModalState();
    }
  };

  const handleApproveModalOpenChange = (open) => {
    if (!open) {
      if (approvingQuote) return;
      resetApproveModalState();
      return;
    }

    setIsApproveModalOpen(true);
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

  const handleViewQuote = (quote) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedQuote(null);
  };

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

      {/* Filter */}
      <div className="flex sm:flex-row flex-col gap-4">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Quotes</CardTitle>
          <div className="w-full max-w-sm">
            <Input
              type="text"
              placeholder="Search by vehicle reg, customer, or job number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Vehicle Registration</TableHead>
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
                    <TableCell>{formatVehicleRegistration(quote.vehicle_registration)}</TableCell>
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
                          onClick={() => handleViewQuote(quote)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {quote.job_status !== 'approved' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/protected/fc/quotes/${quote.id}/edit`}
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
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

      {/* De-install / Decommission Approval Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={handleApproveModalOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Quote and Route Job Card</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              Quote <span className="font-semibold">{quotePendingApproval?.job_number}</span> is a de-install/decommission job.
              Add annuity end date and choose where the new job card should go.
            </div>

            <div className="space-y-2">
              <label htmlFor="annuity-end-date" className="text-sm font-medium text-gray-700">
                Annuity End Date <span className="text-red-600">*</span>
              </label>
              <Input
                id="annuity-end-date"
                type="date"
                value={annuityEndDate}
                onChange={(event) => setAnnuityEndDate(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="job-routing-destination" className="text-sm font-medium text-gray-700">
                Route Job Card To <span className="text-red-600">*</span>
              </label>
              <select
                id="job-routing-destination"
                value={approvalDestination}
                onChange={(event) => setApprovalDestination(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              >
                <option value="" disabled>Select a destination</option>
                <option value="inv">Inventory</option>
                <option value="admin">Admin</option>
                <option value="accounts">Accounts</option>
                <option value="none">None (Current ruleset)</option>
              </select>
              <p className="text-xs text-gray-500">
                If you choose <span className="font-medium">none</span>, approval follows the current flow with no forced role routing.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetApproveModalState}
                disabled={Boolean(approvingQuote)}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConfirmModalApproval}
                disabled={Boolean(approvingQuote) || !annuityEndDate || !approvalDestination}
              >
                {approvingQuote ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Approve and Create Job Card
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                      <Badge className={`ml-2 ${getStatusColor(selectedQuote.job_status || 'draft')}`}>
                        {getStatusText(selectedQuote.job_status)}
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
                            <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedQuote.quote_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedQuote.quote_expiry_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Priority</dt>
                            <dd className="mt-1 text-sm text-gray-900 capitalize">{selectedQuote.priority || 'Medium'}</dd>
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
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Registration</dt>
                            <dd className="mt-1">{formatVehicleRegistration(selectedQuote.vehicle_registration)}</dd>
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
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Quantity</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Unit Price</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedQuote.quotation_products.map((product, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name || product.description || 'Product'}</div>
                                  {product.description && product.name && (
                                    <div className="text-sm text-gray-500">{product.description}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{product.quantity || 1}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(product.price || product.unit_price || 0)}</td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency((product.quantity || 1) * (product.price || product.unit_price || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Email Communication */}
                {(selectedQuote.quote_email_subject || selectedQuote.quote_email_body) && (
                  <div className="bg-white rounded border mt-6">
                    <div className="border-b px-4 py-3">
                      <h3 className="text-base font-medium text-gray-900">Email Communication</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {selectedQuote.quote_email_subject && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Subject</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedQuote.quote_email_subject}</dd>
                        </div>
                      )}
                      {selectedQuote.quote_email_body && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Message</dt>
                          <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded border max-h-48 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{selectedQuote.quote_email_body}</pre>
                          </dd>
                        </div>
                      )}
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
