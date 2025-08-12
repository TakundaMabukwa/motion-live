'use client';
        
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientQuoteForm from '@/components/ui-personal/client-quote-form';

export default function TestCustomerMatch() {
  const [accountNumber, setAccountNumber] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const testCustomerMatch = async () => {
    if (!accountNumber) {
      setError('Please enter an account number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/customers/match-account?accountNumber=${encodeURIComponent(accountNumber)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to fetch customer data');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testVehiclesByCompany = async () => {
    if (!accountNumber) {
      setError('Please enter an account number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to fetch vehicles');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDebugVehicleFetch = async () => {
    if (!accountNumber) {
      setError('Please enter an account number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug-vehicle-fetch?accountNumber=${encodeURIComponent(accountNumber)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to debug vehicle fetch');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testClientQuoteForm = () => {
    setShowQuoteForm(true);
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Test Customer Match API</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number (e.g., MAC-001)"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={testCustomerMatch} disabled={loading}>
              {loading ? 'Testing...' : 'Test Customer Match'}
            </Button>
            <Button onClick={testVehiclesByCompany} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Vehicles by Company'}
            </Button>
            <Button onClick={testDebugVehicleFetch} disabled={loading} variant="secondary">
              {loading ? 'Testing...' : 'Debug Vehicle Fetch'}
            </Button>
            <Button onClick={testClientQuoteForm} disabled={loading} variant="destructive">
              Test Client Quote Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Test Client Quote Form Modal */}
      {showQuoteForm && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">Test Client Quote Form</h2>
              <Button 
                onClick={() => setShowQuoteForm(false)}
                variant="ghost"
                size="sm"
              >
                Close
              </Button>
            </div>
            <ClientQuoteForm
              customer={{
                trading_name: "Test Company",
                company: "Test Company",
                email: "test@example.com",
                cell_no: "1234567890",
                physical_address: "123 Test St",
                new_account_number: accountNumber || "MAC-001"
              }}
              vehicles={[]} // Empty vehicles to test the fix
              onClose={() => setShowQuoteForm(false)}
              onQuoteCreated={(quote) => {
                console.log('Quote created:', quote);
                setShowQuoteForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
