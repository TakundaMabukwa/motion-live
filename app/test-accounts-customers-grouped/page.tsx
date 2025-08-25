'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestAccountsCustomersGrouped() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/accounts/customers-grouped?fetchAll=true');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-3xl">Test Accounts Customers Grouped API</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>API Test</span>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {data && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Response Summary:</h3>
                <p>Total Count: {data.count}</p>
                <p>Company Groups: {data.companyGroups?.length || 0}</p>
                <p>Page: {data.page}</p>
                <p>Has More: {data.hasMore ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Company Groups:</h3>
                <div className="space-y-2">
                  {data.companyGroups?.map((group: any, index: number) => (
                    <div key={group.id} className="p-3 border rounded">
                      <p><strong>ID:</strong> {group.id}</p>
                      <p><strong>Company Group:</strong> {group.company_group}</p>
                      <p><strong>Legal Names:</strong> {group.legal_names}</p>
                      <p><strong>Prefix:</strong> {group.prefix}</p>
                                             <p><strong>Monthly Amount:</strong> R {group.totalMonthlyAmount?.toFixed(2) || '0.00'}</p>
                       <p><strong>Amount Due:</strong> R {group.totalAmountDue?.toFixed(2) || '0.00'}</p>
                       <p><strong>Unique Client Count:</strong> {group.uniqueClientCount || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
