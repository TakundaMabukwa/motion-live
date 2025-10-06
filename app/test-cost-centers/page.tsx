'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function TestCostCentersPage() {
  const [accountNumbers, setAccountNumbers] = useState('ALLI-0001');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCostCentersAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🧪 Testing cost centers API with account numbers:', accountNumbers);

      const response = await fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(accountNumbers)}`);
      
      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response data:', data);
      
      setResult(data);
    } catch (err) {
      console.error('💥 Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDebugAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🧪 Testing debug cost centers API');

      const response = await fetch(`/api/debug/cost-centers?all_new_account_numbers=${encodeURIComponent(accountNumbers)}`);
      
      console.log('📡 Debug API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Debug API Error:', errorText);
        throw new Error(`Debug API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Debug API Response data:', data);
      
      setResult(data);
    } catch (err) {
      console.error('💥 Debug test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testTableStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('🧪 Testing cost centers table structure');

      const response = await fetch('/api/debug/cost-centers-table');
      
      console.log('📡 Table API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Table API Error:', errorText);
        throw new Error(`Table API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Table API Response data:', data);
      
      setResult(data);
    } catch (err) {
      console.error('💥 Table test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Cost Centers API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-sm">Account Numbers:</label>
            <Input
              value={accountNumbers}
              onChange={(e) => setAccountNumbers(e.target.value)}
              placeholder="ALLI-0001 or ALLI-0001,ALLI-0002"
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testCostCentersAPI} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Testing...' : 'Test Cost Centers API'}
            </Button>
            
            <Button 
              onClick={testDebugAPI} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Debug API'}
            </Button>
            
            <Button 
              onClick={testTableStructure} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Table Structure'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 p-4 border border-red-200 rounded-md">
              <h3 className="font-medium text-red-800">❌ Error:</h3>
              <p className="mt-1 text-red-700 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-800">✅ Success!</h3>
                <p className="mt-1 text-green-700 text-sm">
                  Check the browser console for detailed logs
                </p>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-md">
                <h3 className="mb-2 font-medium text-gray-800">📊 Response Data:</h3>
                <pre className="bg-white p-3 border rounded max-h-96 overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.costCenters && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-800">🏢 Found Cost Centers:</h3>
                  <div className="gap-2 grid">
                    {result.costCenters.map((center: any, index: number) => (
                      <div key={index} className="bg-white p-3 border rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{center.cost_code}</Badge>
                          <span className="font-medium text-sm">{center.company}</span>
                        </div>
                        <div className="text-gray-600 text-xs">
                          ID: {center.id} | Created: {center.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.sampleData && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-800">📋 Sample Table Data:</h3>
                  <div className="gap-2 grid">
                    {result.sampleData.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-3 border rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.cost_code}</Badge>
                          <span className="font-medium text-sm">{item.company}</span>
                        </div>
                        <div className="text-gray-600 text-xs">
                          ID: {item.id} | Created: {item.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
