'use client';

import { useState } from 'react';
import { useOverdueCheck } from '@/lib/hooks/useOverdueCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, DollarSign, Building2, Car, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface OverdueAccountsWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showAllAccounts?: boolean;
  maxAccounts?: number;
  onAccountClick?: (accountNumber: string) => void;
}

export function OverdueAccountsWidget({
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  showAllAccounts = false,
  maxAccounts = 10,
  onAccountClick
}: OverdueAccountsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data, loading, error, refresh, forceRefresh, lastUpdated } = useOverdueCheck(autoRefresh, refreshInterval);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      toast({
        title: "Data refreshed",
        description: "Overdue accounts data has been updated.",
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh overdue accounts data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceRefresh();
      toast({
        title: "Data force refreshed",
        description: "Overdue accounts data has been forcefully updated from the database.",
      });
    } catch (err) {
      toast({
        title: "Force refresh failed",
        description: "Failed to force refresh overdue accounts data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAccountClick = (accountNumber: string) => {
    if (onAccountClick) {
      onAccountClick(accountNumber);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getOverdueBadgeVariant = (amount: number) => {
    if (amount === 0) return 'secondary';
    if (amount > 0 && amount <= 1000) return 'default';
    if (amount > 1000 && amount <= 5000) return 'destructive';
    return 'destructive';
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Error Loading Overdue Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="mr-2 w-4 h-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const accountsToShow = showAllAccounts 
    ? data?.allOverdueAccounts || []
    : data?.topOverdueAccounts || [];

  const displayedAccounts = accountsToShow.slice(0, maxAccounts);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Overdue Accounts
            </CardTitle>
            <CardDescription>
              {data?.summary ? (
                <>
                  {data.summary.totalAccountsWithOverdue} accounts with overdue payments totaling{' '}
                  {formatCurrency(data.summary.totalOverdueAmount)}
                  {data.summary.monthsLate > 0 && (
                    <span className="font-medium text-orange-600">
                      {' '}({data.summary.monthsLate} month{data.summary.monthsLate > 1 ? 's' : ''} overdue)
                    </span>
                  )}
                </>
              ) : (
                'Loading overdue accounts...'
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Force Refresh
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-muted-foreground text-sm">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
            Loading overdue accounts...
          </div>
        ) : displayedAccounts.length === 0 ? (
          <div className="py-8 text-muted-foreground text-center">
            <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-green-500" />
            <p className="font-medium text-lg">No overdue accounts</p>
            <p>All accounts are up to date with their payments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAccounts.map((account) => (
              <div
                key={account.accountNumber}
                className={`hover:bg-muted/50 p-4 border rounded-lg transition-colors ${
                  onAccountClick ? 'cursor-pointer hover:shadow-md' : ''
                }`}
                onClick={() => onAccountClick && handleAccountClick(account.accountNumber)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{account.company}</span>
                      {onAccountClick && (
                        <ExternalLink className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span>Account: {account.accountNumber}</span>
                      <span>•</span>
                      <Car className="w-3 h-3" />
                      <span>{account.vehicleCount} vehicle{account.vehicleCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-destructive text-lg">
                      {formatCurrency(account.totalOverdue)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Monthly: {formatCurrency(account.totalMonthlyAmount)}
                    </div>
                  </div>
                </div>
                
                <div className="gap-2 grid grid-cols-2 md:grid-cols-4">
                  <div className="text-center">
                    <Badge variant={getOverdueBadgeVariant(account.overdue1_30)} className="w-full">
                      1-30 days
                    </Badge>
                    <div className="mt-1 font-medium text-sm">
                      {formatCurrency(account.overdue1_30)}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant={getOverdueBadgeVariant(account.overdue31_60)} className="w-full">
                      31-60 days
                    </Badge>
                    <div className="mt-1 font-medium text-sm">
                      {formatCurrency(account.overdue31_60)}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant={getOverdueBadgeVariant(account.overdue61_90)} className="w-full">
                      61-90 days
                    </Badge>
                    <div className="mt-1 font-medium text-sm">
                      {formatCurrency(account.overdue61_90)}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant={getOverdueBadgeVariant(account.overdue91_plus)} className="w-full">
                      91+ days
                    </Badge>
                    <div className="mt-1 font-medium text-sm">
                      {formatCurrency(account.overdue91_plus)}
                    </div>
                  </div>
                </div>
                
                {onAccountClick && (
                  <div className="mt-3 pt-3 border-muted border-t">
                    <p className="text-muted-foreground text-sm text-center">
                      Click to view vehicle details and costs
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {showAllAccounts && accountsToShow.length > maxAccounts && (
              <div className="py-4 text-muted-foreground text-center">
                <p>Showing {maxAccounts} of {accountsToShow.length} overdue accounts</p>
                <p className="text-sm">Increase maxAccounts prop to see more</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
