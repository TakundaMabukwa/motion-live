'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TestMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runMigration = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/migrate-qr-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success('Migration completed successfully!');
      } else {
        setResult(data);
        toast.error(data.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Error running migration:', error);
      toast.error('Failed to run migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Test QR Code Fields Migration</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This will add the missing qr_code and ip_address fields to the job_cards table.
          </p>
          
          <Button 
            onClick={runMigration} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Running Migration...' : 'Run Migration'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
