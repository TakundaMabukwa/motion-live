'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ClientCostCentersPage() {
  const params = useParams();
  const router = useRouter();
  const [clientCode, setClientCode] = useState('');

  useEffect(() => {
    console.log('ClientCostCentersPage mounted');
    console.log('Params:', params);
    console.log('Client code from params:', params.code);
    setClientCode(params.code);
  }, [params]);

  return (
    <div className="space-y-6 p-6">
      {/* Simple Test Header */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Clients
        </Button>
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">
            🚨 TEST PAGE - Client Cost Centers 🚨
          </h1>
          <p className="text-gray-600">
            This is a test page to verify routing is working
          </p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-yellow-100 p-4 border border-yellow-400 rounded">
        <h2 className="mb-2 font-bold text-yellow-800">Debug Information:</h2>
        <p><strong>Client Code from params:</strong> {params.code}</p>
        <p><strong>Client Code from state:</strong> {clientCode}</p>
        <p><strong>Current URL:</strong> {window.location.href}</p>
        <p><strong>Params object:</strong> {JSON.stringify(params, null, 2)}</p>
      </div>

      {/* Test Content */}
      <div className="bg-blue-100 p-4 border border-blue-400 rounded">
        <h2 className="mb-2 font-bold text-blue-800">Test Content:</h2>
        <p>If you can see this page, the routing is working!</p>
        <p>Client Code: <strong>{params.code}</strong></p>
        <p>This should be different for each client you click on.</p>
      </div>

      {/* Navigation Test */}
      <div className="bg-green-100 p-4 border border-green-400 rounded">
        <h2 className="mb-2 font-bold text-green-800">Navigation Test:</h2>
        <Button 
          onClick={() => router.push('/protected/accounts?section=clients')}
          className="mr-2"
        >
          Go to Clients List
        </Button>
        <Button 
          onClick={() => router.push('/protected/accounts/client/MACS')}
          variant="outline"
          className="mr-2"
        >
          Go to MACS
        </Button>
        <Button 
          onClick={() => router.push('/protected/accounts/client/HARV')}
          variant="outline"
        >
          Go to HARV
        </Button>
      </div>
    </div>
  );
}
