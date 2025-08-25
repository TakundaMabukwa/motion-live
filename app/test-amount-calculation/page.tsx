'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestAmountCalculation() {
  const [prefix, setPrefix] = useState('KARG');
  const [realData, setRealData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculationDetails, setCalculationDetails] = useState<any>(null);

  const testRealCalculation = async () => {
    if (!prefix.trim()) return;
    
    setLoading(true);
    try {
      // Fetch real data from the API
      const response = await fetch(`/api/accounts/vehicle-amounts?prefix=${encodeURIComponent(prefix.trim())}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRealData(data);

      // Now let's test the calculation logic step by step
      if (data.vehicleInvoices && data.vehicleInvoices.length > 0) {
        const currentDate = new Date();
        const currentDay = currentDate.getDate();
        const currentMonth = currentDate.getMonth() + 1;
        const paymentDueDay = 21;

        console.log('Current Date Info:', {
          currentDay,
          currentMonth,
          paymentDueDay,
          isAfterDueDate: currentDay >= paymentDueDay
        });

        // Test the calculation for each invoice
        const detailedCalculations = data.vehicleInvoices.map((invoice: any, index: number) => {
          const oneMonth = parseFloat(invoice.one_month) || 0;
          const secondMonth = parseFloat(invoice['2nd_month']) || 0;
          const thirdMonth = parseFloat(invoice['3rd_month']) || 0;
          const amountDue = parseFloat(invoice.amount_due) || 0;

          // Calculate overdue amount using the same logic as the API
          let overdueAmount = 0;
          if (currentDay >= paymentDueDay) {
            if (currentMonth === 1) {
              overdueAmount = oneMonth + secondMonth + thirdMonth;
            } else if (currentMonth === 2) {
              overdueAmount = secondMonth + thirdMonth;
            } else if (currentMonth === 3) {
              overdueAmount = thirdMonth;
            } else {
              overdueAmount = oneMonth + secondMonth + thirdMonth;
            }
          }

          return {
            index,
            accountNumber: invoice.new_account_number,
            oneMonth,
            secondMonth,
            thirdMonth,
            amountDue,
            calculatedOverdue: overdueAmount,
            monthlyTotal: oneMonth + secondMonth + thirdMonth
          };
        });

        setCalculationDetails({
          currentDate: currentDate.toLocaleDateString(),
          currentDay,
          currentMonth,
          paymentDueDay,
          isAfterDueDate: currentDay >= paymentDueDay,
          detailedCalculations,
          summary: {
            totalMonthlyAmount: data.totalMonthlyAmount,
            totalAmountDue: data.totalAmountDue,
            uniqueClientCount: data.uniqueClientCount,
            vehicleCount: data.vehicleCount
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-3xl">Amount Calculation Test</h1>
      <p className="text-gray-600">
        This page demonstrates the difference between the old and new amount calculation methods.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Real Calculation</CardTitle>
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
              <Button onClick={testRealCalculation} disabled={loading || !prefix.trim()}>
                {loading ? 'Loading...' : 'Test Real Calculation'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {calculationDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Calculation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 border rounded">
              <h4 className="mb-2 font-semibold text-blue-800">Current Date Information:</h4>
              <p><strong>Date:</strong> {calculationDetails.currentDate}</p>
              <p><strong>Day:</strong> {calculationDetails.currentDay}</p>
              <p><strong>Month:</strong> {calculationDetails.currentMonth}</p>
              <p><strong>Payment Due Day:</strong> {calculationDetails.paymentDueDay}</p>
              <p><strong>After Due Date:</strong> {calculationDetails.isAfterDueDate ? 'Yes' : 'No'}</p>
            </div>

            <div className="bg-green-50 p-4 border rounded">
              <h4 className="mb-2 font-semibold text-green-800">Summary:</h4>
              <p><strong>Total Monthly Amount:</strong> R {calculationDetails.summary.totalMonthlyAmount?.toFixed(2) || '0.00'}</p>
              <p><strong>Total Monthly Amount Due:</strong> R {calculationDetails.summary.totalAmountDue?.toFixed(2) || '0.00'}</p>
              <p><strong>Unique Client Count:</strong> {calculationDetails.summary.uniqueClientCount || 0}</p>
              <p><strong>Vehicle Count:</strong> {calculationDetails.summary.vehicleCount || 0}</p>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-gray-900">Detailed Invoice Calculations:</h4>
              <div className="space-y-2">
                {calculationDetails.detailedCalculations.map((calc: any) => (
                  <div key={calc.index} className="bg-gray-50 p-3 border rounded text-sm">
                    <p><strong>Account:</strong> {calc.accountNumber}</p>
                    <p><strong>1st Month:</strong> R {calc.oneMonth.toFixed(2)}</p>
                    <p><strong>2nd Month:</strong> R {calc.secondMonth.toFixed(2)}</p>
                    <p><strong>3rd Month:</strong> R {calc.thirdMonth.toFixed(2)}</p>
                    <p><strong>Monthly Total:</strong> R {calc.monthlyTotal.toFixed(2)}</p>
                    <p><strong>DB Amount Due:</strong> R {calc.amountDue.toFixed(2)}</p>
                    <p><strong>Calculated Overdue:</strong> R {calc.calculatedOverdue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {realData && (
        <Card>
          <CardHeader>
            <CardTitle>Raw API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(realData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How the Amount Due Calculation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">The Calculation Logic:</h4>
            <ul className="space-y-1 text-gray-600 text-sm list-disc list-inside">
              <li><strong>Simple Addition:</strong> No complex date-based logic</li>
              <li><strong>Always Shows:</strong> Total monthly amounts for all accounts with same prefix</li>
              <li><strong>Monthly Fields:</strong> Uses <code>one_month</code>, <code>2nd_month</code>, <code>3rd_month</code></li>
              <li><strong>Purpose:</strong> Shows what clients owe for their monthly subscriptions</li>
            </ul>
          </div>

                      <div>
              <h4 className="mb-2 font-semibold text-gray-900">Example:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p>For any account with prefix "KARG":</p>
                <p>• <code>one_month</code> + <code>2nd_month</code> + <code>3rd_month</code> = Total Monthly Amount Due</p>
                <p>• This represents what the client owes for their monthly subscriptions</p>
                <p>• No date-based logic - always shows the total monthly amounts</p>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
