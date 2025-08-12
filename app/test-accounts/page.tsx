'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function TestAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicle-invoices?page=1&limit=10');
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

  const viewAccount = (accountNumber) => {
    router.push(`/protected/accounts?account=${encodeURIComponent(accountNumber)}&section=vehicles`);
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Test Accounts Navigation</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Available Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div>No accounts found</div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account, index) => (
                <div key={index} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <div className="font-medium">{account.company}</div>
                    <div className="text-gray-600 text-sm">#{account.accountNumber}</div>
                    <div className="text-gray-500 text-sm">{account.vehicleCount} vehicles</div>
                  </div>
                  <Button onClick={() => viewAccount(account.accountNumber)}>
                    View Account (Vehicles)
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
