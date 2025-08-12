"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestScheduleAPI() {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const testAPI = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Testing schedule API...');
            const response = await fetch('/api/job-cards/schedule');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            setApiData(data);
            
        } catch (err) {
            console.error('Error testing API:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto p-6 container">
            <h1 className="mb-6 font-bold text-2xl">Schedule API Test</h1>
            
            <Button 
                onClick={testAPI} 
                disabled={loading}
                className="mb-6"
            >
                {loading ? 'Testing...' : 'Test Schedule API'}
            </Button>
            
            {error && (
                <Card className="bg-red-50 mb-6 border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-800">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-700">{error}</p>
                    </CardContent>
                </Card>
            )}
            
            {apiData && (
                <Card>
                    <CardHeader>
                        <CardTitle>API Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold">Total Jobs:</h3>
                                <p>{apiData.total || 0}</p>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold">Jobs Array:</h3>
                                <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-sm">
                                    {JSON.stringify(apiData.jobs, null, 2)}
                                </pre>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold">Jobs By Date:</h3>
                                <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-sm">
                                    {JSON.stringify(apiData.jobsByDate, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
