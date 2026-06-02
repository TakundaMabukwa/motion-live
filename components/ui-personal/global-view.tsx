'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  Building,
  TrendingUp,
  RefreshCw,
  Eye,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface JobCard {
  id: string;
  job_number: string;
  job_type: string;
  job_description: string;
  status: string;
  job_status: string;
  customer_name: string;
  customer_email: string;
  vehicle_registration: string;
  created_at: string;
  updated_at: string;
  account_id: string;
  new_account_number: string;
  quotation_total_amount: number;
  priority: string;
}

interface AccountSummary {
  account_number: string;
  company_name: string;
  total_jobs: number;
  open_jobs: number;
  total_value: number;
  last_activity: string;
}

interface RevenueBreakdownItem {
  label: string;
  total: number;
  vehicleCount: number;
}

export default function GlobalView() {
  const [recentJobs, setRecentJobs] = useState<JobCard[]>([]);
  const [accountSummaries, setAccountSummaries] = useState<AccountSummary[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/fc/global-summary', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch global data');
      }

      const data = await response.json();
      setRecentJobs(Array.isArray(data?.recentJobs) ? data.recentJobs : []);
      setAccountSummaries(
        Array.isArray(data?.accountSummaries) ? data.accountSummaries : [],
      );
      setAccountCount(Number(data?.accountCount) || 0);
      setDeviceCount(Number(data?.deviceCount) || 0);
      setRevenue(Number(data?.revenue) || 0);
      setRevenueBreakdown(Array.isArray(data?.revenueBreakdown) ? data.revenueBreakdown : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching global data:', error);
      toast.error('Failed to load global data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchGlobalData();
  };

  const handleAccountClick = (accountNumber: string) => {
    router.push(`/protected/fc/accounts/${accountNumber}`);
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/protected/fc/jobs/${jobId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'open':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading global data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-2xl">Global View</h1>
          <p className="text-gray-600">High-level overview of all accounts and recent activity</p>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
        {/* Accounts */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Accounts</CardTitle>
            <Building className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{accountCount}</div>
            <p className="text-muted-foreground text-xs">
              Active accounts
            </p>
          </CardContent>
        </Card>

        {/* Devices */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Devices</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{deviceCount}</div>
            <p className="text-muted-foreground text-xs">
              Tracked vehicles
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-emerald-600 text-2xl">{formatCurrency(revenue)}</div>
            <p className="text-muted-foreground text-xs">
              Total rental & subscription
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Breakdown */}
      {revenueBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Devices Breakdown
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Total value and count per device type across all vehicles
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Device</th>
                    <th className="text-right py-2 font-medium">Count</th>
                    <th className="text-right py-2 font-medium">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBreakdown.map((item) => (
                    <tr key={item.label} className="border-b last:border-0">
                      <td className="py-1.5">{item.label}</td>
                      <td className="text-right py-1.5 text-muted-foreground">{item.vehicleCount}</td>
                      <td className="text-right py-1.5 font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Jobs (Last 24 Hours)
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Jobs reported in the last 24 hours across all accounts
          </p>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-2 w-8 h-8 text-gray-400" />
              <p className="text-gray-500">No jobs reported in the last 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex justify-between items-center hover:bg-gray-50 p-3 border rounded-lg cursor-pointer" onClick={() => handleJobClick(job.id)}>
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-blue-100 rounded-full w-10 h-10">
                      <span className="font-semibold text-blue-600 text-sm">
                        {job.job_number?.charAt(0) || 'J'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Job #{job.job_number}</div>
                      <div className="text-gray-500 text-xs">
                        {job.customer_name} • {job.vehicle_registration}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {job.job_type} • {formatTimeAgo(job.created_at)}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Created: {new Date(job.created_at).toLocaleDateString('en-ZA', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(job.job_status || job.status)}>
                      {job.job_status || job.status || 'Unknown'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleJobClick(job.id); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Account Overview
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Summary of active accounts and their current jobs
          </p>
        </CardHeader>
        <CardContent>
          {accountSummaries.length === 0 ? (
            <div className="py-8 text-center">
              <Building className="mx-auto mb-2 w-8 h-8 text-gray-400" />
              <p className="text-gray-500">No active accounts found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {accountSummaries
                .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
                .map((account) => (
                  <div key={account.account_number} className="flex justify-between items-center hover:bg-gray-50 p-3 border rounded-lg cursor-pointer" onClick={() => handleAccountClick(account.account_number)}>
                    <div className="flex items-center gap-3">
                      <div className="flex justify-center items-center bg-green-100 rounded-full w-10 h-10">
                        <span className="font-semibold text-green-600 text-sm">
                          {account.company_name.charAt(0) || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{account.company_name}</div>
                        <div className="text-gray-500 text-xs">
                          Account #{account.account_number}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Last activity: {formatTimeAgo(account.last_activity)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Jobs:</span>
                        <span className="font-medium">{account.total_jobs}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Open:</span>
                        <span className="font-medium">{account.open_jobs}</span>
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(account.total_value)}
                      </div>
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
