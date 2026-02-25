'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Quote,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  RefreshCw,
  Plus,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

export default function AccountDashboard({ customer, accountNumber, onNewQuote }) {
  const [salesData, setSalesData] = useState({
    quotationsOpened: 0,
    approved: 0,
    jobsOpen: 0,
    totalQuotationAmount: 0,
    recentInvoices: [],
    totalJobsValue: 0 // Added for total jobs value
  });
  const [clientQuotes, setClientQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (accountNumber) {
      fetchSalesData();
    }
  }, [accountNumber]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from both job_cards and client_quotes tables
      const [jobCardsResponse, clientQuotesResponse] = await Promise.all([
        fetch(`/api/job-cards?account_number=${accountNumber}`),
        fetch(`/api/client-quotes?account_number=${accountNumber}`)
      ]);

      if (!jobCardsResponse.ok || !clientQuotesResponse.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const jobCardsData = await jobCardsResponse.json();
      const clientQuotesData = await clientQuotesResponse.json();

      const jobCards = jobCardsData.job_cards || [];
      const clientQuotes = clientQuotesData.data || clientQuotesData.client_quotes || [];
      
      // Store client quotes for dashboard cards
      setClientQuotes(clientQuotes);

      // Process the data to create sales funnel metrics
      // Filter by created_by to show only quotes/jobs created by the current user
      const quotationsOpened = clientQuotes.filter(quote => 
        quote.created_by // Only show quotes created by the user
      ).length;
      
      const approved = clientQuotes.filter(quote => 
        String(quote.job_status || '').toLowerCase() === 'approved' && quote.created_by
      ).length;
      
      const jobsOpen = jobCards.filter(job => 
        String(job.job_status || '').toLowerCase() !== 'completed' && job.created_by
      ).length;
      
      // Calculate total amounts - show both quotation and actual costs
      const totalQuotationAmount = clientQuotes
        .filter(quote => quote.created_by && String(quote.job_status || '').toLowerCase() === 'approved')
        .reduce((sum, quote) => {
          const amount = parseFloat(quote.quotation_total_amount) || 0;
          return sum + amount;
        }, 0);

      // Get recent invoices (completion dates from job_cards) - only approved quotes that became jobs
      const recentInvoices = jobCards
        .filter(job => job.completion_date && job.created_by && job.quotation_total_amount)
        .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
        .slice(0, 5)
        .map(job => ({
          id: job.id,
          jobNumber: job.job_number,
          completionDate: job.completion_date,
          totalAmount: parseFloat(job.quotation_total_amount) || 0,
          status: job.job_status || job.status
        }));

      // Calculate total jobs value from job_cards
      const totalJobsValue = jobCards
        .filter(job => job.created_by && job.quotation_total_amount)
        .reduce((sum, job) => {
          const amount = parseFloat(job.quotation_total_amount) || 0;
          return sum + amount;
        }, 0);

      setSalesData({
        quotationsOpened,
        approved,
        jobsOpen,
        totalQuotationAmount,
        recentInvoices,
        totalJobsValue // Update totalJobsValue
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSalesData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'open':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading sales data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-2xl">Jobs Dashboard</h1>
          <p className="text-gray-600">Overview of your jobs and combined value</p>
          {lastUpdated && (
            <p className="text-gray-400 text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={onNewQuote}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 w-4 h-4" />
            New Quote
          </Button>
        </div>
      </div>

      {/* Sales Funnel Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
        {/* Total Quotes */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Quotes</CardTitle>
            <Quote className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{salesData.quotationsOpened}</div>
            <p className="text-muted-foreground text-xs">
              All time quotes
            </p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{salesData.approved}</div>
            <p className="text-muted-foreground text-xs">
              Quotes approved by customer
            </p>
          </CardContent>
        </Card>

        {/* Jobs Open */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Jobs Open</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-orange-600 text-2xl">{salesData.jobsOpen}</div>
            <p className="text-muted-foreground text-xs">
              Active jobs in progress
            </p>
          </CardContent>
        </Card>

        {/* Total Jobs Value */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Jobs Value</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-purple-600 text-2xl">
              {formatCurrency(salesData.totalJobsValue)}
            </div>
            <p className="text-muted-foreground text-xs">
              Combined jobs value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Invoices
          </CardTitle>
          <p className="text-gray-600 text-sm">Latest completed jobs and their invoice dates</p>
        </CardHeader>
        <CardContent>
          {salesData.recentInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto mb-2 w-8 h-8 text-gray-400" />
              <p className="text-gray-500">No completed jobs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salesData.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center hover:bg-gray-50 p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-blue-100 rounded-full w-10 h-10">
                      <span className="font-semibold text-blue-600 text-sm">
                        {invoice.jobNumber?.charAt(0) || 'J'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Job #{invoice.jobNumber}</div>
                      <div className="text-gray-500 text-xs">
                        Invoice Date: {formatDate(invoice.completionDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        Total: {formatCurrency(invoice.totalAmount)}
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(invoice.status)}`}>
                      {invoice.status || 'Completed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
