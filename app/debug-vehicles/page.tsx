"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Search, CheckCircle, XCircle } from "lucide-react";

export default function DebugVehiclesPage() {
  const [testCompany, setTestCompany] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState([]);

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  const fetchAllCompanies = async () => {
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      
      const response = await fetch(`${baseUrl}/api/debug`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllCompanies(data.debug?.uniqueCompanies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const testCompanyName = async () => {
    if (!testCompany.trim()) return;
    
    setLoading(true);
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      
      const response = await fetch(`${baseUrl}/api/test-vehicles?company=${encodeURIComponent(testCompany)}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults({ error: "Failed to test company name" });
      }
    } catch (error) {
      setResults({ error: "Error testing company name" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="space-y-6 mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">Vehicle Loading Debug Tool</h1>
          <p className="text-gray-600">Test and troubleshoot vehicle loading issues</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Test Company Name</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="testCompany">Company Name</Label>
                <Input
                  id="testCompany"
                  value={testCompany}
                  onChange={(e) => setTestCompany(e.target.value)}
                  placeholder="Enter company name to test..."
                  onKeyPress={(e) => e.key === 'Enter' && testCompanyName()}
                />
              </div>
              <Button 
                onClick={testCompanyName} 
                disabled={loading || !testCompany.trim()}
                className="mt-6"
              >
                {loading ? "Testing..." : "Test"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <div className="flex items-center space-x-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span>{results.error}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="gap-4 grid grid-cols-2 text-sm">
                    <div>
                      <strong>Test Company:</strong> {results.testCompany}
                    </div>
                    <div>
                      <strong>Cleaned Company:</strong> {results.cleanCompany}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">Matching Results:</h3>
                    {results.results.map((result, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{result.type.replace(/_/g, ' ').toUpperCase()}</span>
                          <div className="flex items-center space-x-2">
                            {result.count > 0 ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm">{result.count} vehicles found</span>
                          </div>
                        </div>
                        <div className="mb-2 text-gray-600 text-xs">
                          Query: {result.query}
                        </div>
                        {result.vehicles.length > 0 && (
                          <div className="text-xs">
                            <strong>Vehicles:</strong> {result.vehicles.map(v => v.registration_number || v.new_registration).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {results.similarCompanies.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="mb-2 font-semibold">Similar Companies Found:</h3>
                      <div className="flex flex-wrap gap-2">
                        {results.similarCompanies.map((company, index) => (
                          <span key={index} className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-sm">
                            {company}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>All Available Companies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              <div className="gap-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {allCompanies.map((company, index) => (
                  <div key={index} className="bg-gray-100 p-2 rounded text-sm">
                    {company}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-gray-600 text-xs">
              Total: {allCompanies.length} companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="mb-2 font-semibold">Common Issues:</h4>
              <ul className="space-y-1 text-gray-700 list-disc list-inside">
                <li><strong>Case sensitivity:</strong> Company names are stored in different cases</li>
                <li><strong>Special characters:</strong> Spaces, hyphens, or other characters may differ</li>
                <li><strong>Abbreviations:</strong> Company may be stored with or without abbreviations</li>
                <li><strong>Active status:</strong> Only active vehicles are shown</li>
              </ul>
            </div>
            
            <div>
              <h4 className="mb-2 font-semibold">How to Use:</h4>
              <ol className="space-y-1 text-gray-700 list-decimal list-inside">
                <li>Enter the company name you're trying to find vehicles for</li>
                <li>Click "Test" to see all matching attempts</li>
                <li>Check the "Similar Companies" section for close matches</li>
                <li>Use the "All Available Companies" list to find the exact name</li>
                <li>Try variations of the company name if no matches are found</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 