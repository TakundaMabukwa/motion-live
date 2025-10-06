'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function EmailTestPage() {
  const [email, setEmail] = useState('mabukwa25@gmail.com');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestEmail = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        toast.success(`Test email sent successfully to ${email}!`);
      } else {
        setResult({ error: data.error });
        toast.error(`Failed to send email: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      setResult({ error: errorMessage });
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto p-6 max-w-2xl container">
      <Card>
        <CardHeader>
          <CardTitle className="font-bold text-2xl text-center">
            📧 Solflo Email Service Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="font-medium text-sm">
              Test Email Address:
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address to test"
              className="w-full"
            />
          </div>

          <Button
            onClick={sendTestEmail}
            disabled={isSending || !email}
            className="bg-blue-600 hover:bg-blue-700 w-full"
          >
            {isSending ? (
              <>
                <div className="mr-2 border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
                Sending Test Email...
              </>
            ) : (
              <>
                📤 Send Hello World Test Email
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 p-4 border rounded-lg">
              {result.success ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-green-600">✅ Email Sent Successfully!</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>To:</strong> {result.details.to}</p>
                    <p><strong>From:</strong> {result.details.from}</p>
                    <p><strong>Subject:</strong> Hello World - Solflo Email Test</p>
                    <p><strong>Message ID:</strong> {result.messageId}</p>
                    <p><strong>Sent At:</strong> {new Date(result.details.sentAt).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-red-600">❌ Email Failed</h3>
                  <p className="text-red-600 text-sm">{result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 mt-6 p-4 rounded-lg">
            <h4 className="mb-2 font-semibold text-blue-900">Email Service Configuration:</h4>
            <div className="space-y-1 text-blue-800 text-sm">
              <p><strong>SMTP Server:</strong> mail.solflo.co.za:587</p>
              <p><strong>From Address:</strong> admin@solflo.co.za</p>
              <p><strong>Authentication:</strong> Enabled</p>
              <p><strong>Security:</strong> TLS (Port 587)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
