'use client';

import { useState } from 'react';
import { OverdueAccountsWidget } from './OverdueAccountsWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOverdueSummary } from '@/lib/hooks/useOverdueCheck';
import { RefreshCw, Clock, DollarSign, AlertTriangle } from 'lucide-react';

export function OverdueDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const { summary, loading, refresh } = useOverdueSummary(autoRefresh, refreshInterval);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (monthsLate: number) => {
    if (monthsLate === 0) return 'bg-green-100 text-green-800';
    if (monthsLate === 1) return 'bg-yellow-100 text-yellow-800';
    if (monthsLate === 2) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header with summary cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Overdue</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {loading ? '...' : formatCurrency(summary?.totalOverdueAmount || 0)}
            </div>
            <p className="text-muted-foreground text-xs">
              {summary?.totalAccountsWithOverdue || 0} accounts affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Accounts Overdue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {loading ? '...' : summary?.totalAccountsWithOverdue || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Months Late</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {loading ? '...' : summary?.monthsLate || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              Since payment due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Payment Due</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {summary?.paymentDueDay || 21}
            </div>
            <p className="text-muted-foreground text-xs">
              Day of each month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Controls</CardTitle>
          <CardDescription>
            Configure how the overdue accounts data is refreshed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRefresh" className="font-medium text-sm">
                Enable auto-refresh
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="refreshInterval" className="font-medium text-sm">
                Refresh interval:
              </label>
              <select
                id="refreshInterval"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
                disabled={!autoRefresh}
              >
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={900000}>15 minutes</option>
                <option value={1800000}>30 minutes</option>
                <option value={3600000}>1 hour</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={refresh} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Manual Refresh
            </Button>
            
            {summary && (
              <Badge variant={getStatusColor(summary.monthsLate).includes('green') ? 'default' : 'destructive'}>
                Status: {summary.monthsLate === 0 ? 'All Good' : `${summary.monthsLate} month${summary.monthsLate > 1 ? 's' : ''} overdue`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Overdue Accounts */}
      <OverdueAccountsWidget
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        showAllAccounts={false}
        maxAccounts={5}
      />

      {/* All Overdue Accounts (expandable) */}
      <OverdueAccountsWidget
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        showAllAccounts={true}
        maxAccounts={20}
      />
    </div>
  );
}
