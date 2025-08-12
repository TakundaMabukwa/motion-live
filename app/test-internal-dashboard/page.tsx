'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import InternalAccountDashboard from '@/components/accounts/InternalAccountDashboard';

export default function TestInternalDashboard() {
  const [accountNumber, setAccountNumber] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const openDashboard = () => {
    if (accountNumber.trim()) {
      setShowDashboard(true);
    }
  };

  const goBack = () => {
    setShowDashboard(false);
    setAccountNumber('');
  };

  if (showDashboard) {
    return (
      <InternalAccountDashboard 
        accountNumber={accountNumber}
        onBack={goBack}
        defaultTab="overview"
      />
    );
  }

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Test Internal Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Enter Account Number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Input
              placeholder="Enter account number (e.g., AIRG-0001)"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && openDashboard()}
            />
            <Button onClick={openDashboard} disabled={!accountNumber.trim()}>
              Open Dashboard
            </Button>
          </div>
          
          <div className="text-gray-600 text-sm">
            <p>Try these sample account numbers:</p>
            <ul className="space-y-1 mt-2 list-disc list-inside">
              <li>AIRG-0001</li>
              <li>MAC-001</li>
              <li>TEST-001</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features of the Internal Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500 rounded-full w-2 h-2"></div>
              <span><strong>Overview Tab:</strong> Summary cards and quick vehicle preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 rounded-full w-2 h-2"></div>
              <span><strong>Vehicles Tab:</strong> Complete list of all vehicles with monthly costs</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-purple-500 rounded-full w-2 h-2"></div>
              <span><strong>Financials Tab:</strong> Detailed financial breakdown and summaries</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-orange-500 rounded-full w-2 h-2"></div>
              <span><strong>Details Tab:</strong> Account information and vehicle categories</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
