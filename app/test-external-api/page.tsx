'use client';

import { useState, useEffect } from 'react';

export default function TestExternalAPI() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing external API via proxy...');
      const response = await fetch('/api/external-vehicle-data');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const proxyResponse = await response.json();
      console.log('Proxy Response:', proxyResponse);
      
      if (!proxyResponse.success) {
        throw new Error(`Proxy error: ${proxyResponse.error}`);
      }
      
      setData(proxyResponse.data);
    } catch (err) {
      console.error('API Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-4 font-bold text-2xl">External API Test</h1>
      
      <button 
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 mb-4 px-4 py-2 rounded text-white"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {error && (
        <div className="bg-red-100 mb-4 p-4 border border-red-400 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="bg-green-100 mb-4 p-4 border border-green-400 rounded text-green-700">
          <strong>Success!</strong> Data received:
          <pre className="mt-2 overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

             <div className="text-gray-600 text-sm">
         <p>This page tests the external API endpoint via our server-side proxy: <code>/api/external-vehicle-data</code></p>
         <p>Original endpoint: <code>http://64.227.138.235:8000/latest</code></p>
         <p>Check the browser console for detailed logs.</p>
       </div>
    </div>
  );
} 