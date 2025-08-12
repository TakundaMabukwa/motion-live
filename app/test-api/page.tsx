"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAPI() {
  const [companyGroupsData, setCompanyGroupsData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testCompanyGroupsAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/customers-grouped');
      console.log('Company Groups Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Company Groups Error:', errorText);
        setError(`Company Groups API Error: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('Company Groups Data:', data);
      setCompanyGroupsData(data);
    } catch (err) {
      console.error('Company Groups Fetch Error:', err);
      setError(`Company Groups Fetch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCustomersAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/customers');
      console.log('Customers Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Customers Error:', errorText);
        setError(`Customers API Error: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('Customers Data:', data);
      setCustomersData(data);
    } catch (err) {
      console.error('Customers Fetch Error:', err);
      setError(`Customers Fetch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testTablesAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-tables');
      console.log('Tables Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tables Error:', errorText);
        setError(`Tables API Error: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('Tables Data:', data);
      setTableData(data);
    } catch (err) {
      console.error('Tables Fetch Error:', err);
      setError(`Tables Fetch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-bold text-2xl">API Test Page</h1>
      
      <div className="space-y-4">
        <Button 
          onClick={testTablesAPI} 
          disabled={loading}
          className="mr-4"
        >
          Test Tables
        </Button>
        
        <Button 
          onClick={testCompanyGroupsAPI} 
          disabled={loading}
          className="mr-4"
        >
          Test Company Groups API
        </Button>
        
        <Button 
          onClick={testCustomersAPI} 
          disabled={loading}
        >
          Test Customers API
        </Button>
      </div>

      {loading && (
        <div className="text-blue-600">Loading...</div>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
          </CardContent>
        </Card>
      )}

      {tableData && (
        <Card>
          <CardHeader>
            <CardTitle>Tables Test Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-sm">
              {JSON.stringify(tableData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {companyGroupsData && (
        <Card>
          <CardHeader>
            <CardTitle>Company Groups API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-sm">
              {JSON.stringify(companyGroupsData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {customersData && (
        <Card>
          <CardHeader>
            <CardTitle>Customers API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-sm">
              {JSON.stringify(customersData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 