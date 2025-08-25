'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestAccountsVehicleAmounts() {
  const [prefix, setPrefix] = useState('KARG');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!prefix.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/vehicle-amounts?prefix=${encodeURIComponent(prefix.trim())}`);
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

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-3xl">Test Accounts Vehicle Amounts API</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-2 font-medium text-sm">Account Prefix:</label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Enter prefix (e.g., KARG, AVIS)"
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} disabled={loading || !prefix.trim()}>
                {loading ? 'Loading...' : 'Fetch Data'}
              </Button>
            </div>
          </div>
          
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {data && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Response Summary:</h3>
                <p>Success: {data.success ? 'Yes' : 'No'}</p>
                <p>Prefix: {data.prefix}</p>
                                 <p>Total Monthly Amount: R {data.totalMonthlyAmount?.toFixed(2) || '0.00'}</p>
                 <p>Total Amount Due: R {data.totalAmountDue?.toFixed(2) || '0.00'}</p>
                 <p>Unique Client Count: {data.uniqueClientCount || 0}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Vehicle Invoices:</h3>
                <div className="space-y-2">
                  {data.vehicleInvoices?.map((invoice: any, index: number) => (
                    <div key={index} className="p-3 border rounded text-sm">
                      <p><strong>Doc No:</strong> {invoice.doc_no}</p>
                      <p><strong>Account Number:</strong> {invoice.new_account_number}</p>
                      <p><strong>Stock Code:</strong> {invoice.stock_code}</p>
                      <p><strong>Stock Description:</strong> {invoice.stock_description}</p>
                      <p><strong>1st Month:</strong> R {invoice.one_month?.toFixed(2) || '0.00'}</p>
                      <p><strong>2nd Month:</strong> R {invoice['2nd_month']?.toFixed(2) || '0.00'}</p>
                      <p><strong>3rd Month:</strong> R {invoice['3rd_month']?.toFixed(2) || '0.00'}</p>
                      <p><strong>Amount Due:</strong> R {invoice.amount_due?.toFixed(2) || '0.00'}</p>
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
