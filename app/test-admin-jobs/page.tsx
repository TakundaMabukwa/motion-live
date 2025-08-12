'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TestAdminJobs() {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test-admin-jobs');
      const data = await response.json();
      
      if (data.success) {
        setTestData(data);
      } else {
        setError(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Test error:', error);
      setError(error.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Admin Jobs API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={loading}>
            {loading ? 'Running Test...' : 'Run Test'}
          </Button>
          
          {error && (
            <div className="bg-red-100 mt-4 p-4 border border-red-400 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {testData && (
            <div className="space-y-4 mt-6">
              <div className="gap-4 grid grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quote Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">{testData.summary.totalQuoteProducts}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cust Quotes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">{testData.summary.totalCustQuotes}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Admin Jobs Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">{testData.summary.adminJobsFound}</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quote Products Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testData.allQuoteProducts.map((product: any, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <div className="flex justify-between">
                          <span><strong>ID:</strong> {product.id}</span>
                          <span><strong>Role:</strong> <Badge>{product.role}</Badge></span>
                          <span><strong>Open:</strong> <Badge variant={product.open ? "default" : "secondary"}>{product.open ? "Yes" : "No"}</Badge></span>
                        </div>
                        <div><strong>Product:</strong> {product.product_name}</div>
                        <div><strong>Quote ID:</strong> {product.quote_id}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Admin Jobs Query Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testData.adminJobs.map((job: any, index: number) => (
                      <div key={index} className="p-2 border rounded">
                        <div className="flex justify-between">
                          <span><strong>ID:</strong> {job.id}</span>
                          <span><strong>Role:</strong> <Badge>{job.role}</Badge></span>
                          <span><strong>Open:</strong> <Badge variant={job.open ? "default" : "secondary"}>{job.open ? "Yes" : "No"}</Badge></span>
                        </div>
                        <div><strong>Product:</strong> {job.product_name}</div>
                        <div><strong>Quote ID:</strong> {job.quote_id}</div>
                        {job.cust_quotes && (
                          <div className="bg-gray-100 mt-2 p-2 rounded">
                            <div><strong>Customer:</strong> {job.cust_quotes.customer_name}</div>
                            <div><strong>Job Type:</strong> {job.cust_quotes.job_type}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 