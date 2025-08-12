'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function DebugRoutingContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicle-invoices?page=1&limit=5');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNavigation = (accountNumber) => {
    console.log('Testing navigation to:', accountNumber);
    console.log('Current pathname:', pathname);
    console.log('Current search params:', searchParams.toString());
    
    // Try different navigation approaches
    const url = `/protected/accounts/${encodeURIComponent(accountNumber)}`;
    console.log('Navigating to:', url);
    
    router.push(url);
  };

  const testNavigationWithSection = (accountNumber) => {
    console.log('Testing navigation with section to:', accountNumber);
    const url = `/protected/accounts/${encodeURIComponent(accountNumber)}?section=vehicles`;
    console.log('Navigating to:', url);
    
    router.push(url);
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Debug Routing</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Route Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>Pathname:</strong> {pathname}</div>
            <div><strong>Search Params:</strong> {searchParams.toString()}</div>
            <div><strong>Full URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Test Basic Navigation:</h3>
              <Button onClick={() => router.push('/protected/accounts')}>
                Go to /protected/accounts
              </Button>
            </div>
            
            <div>
              <h3 className="mb-2 font-medium">Test Account Navigation:</h3>
              {loading ? (
                <div>Loading accounts...</div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account, index) => (
                    <div key={index} className="flex space-x-2">
                      <Button 
                        size="sm"
                        onClick={() => testNavigation(account.accountNumber)}
                      >
                        Navigate to {account.accountNumber}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => testNavigationWithSection(account.accountNumber)}
                      >
                        Navigate with section=vehicles
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DebugRoutingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DebugRoutingContent />
    </Suspense>
  );
}
