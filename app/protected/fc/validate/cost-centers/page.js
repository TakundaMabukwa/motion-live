"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Search } from "lucide-react";

function ValidateCostCentersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountParam = searchParams?.get("account");
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCostCenters = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!accountParam) throw new Error("No account numbers provided");
        const res = await fetch(`/api/cost-centers/validate?all_new_account_numbers=${encodeURIComponent(accountParam)}`);
        if (!res.ok) throw new Error("Failed to fetch cost centers");
        const data = await res.json();
        setCostCenters(data.costCenters || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCostCenters();
  }, [accountParam]);

  const filteredCostCenters = searchTerm.trim() === ""
    ? costCenters
    : costCenters.filter(center =>
        center.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.cost_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Cost Center</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">Choose a cost center to view and validate vehicles</p>
          <div className="mb-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company or code"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : filteredCostCenters.length > 0 ? (
            <ul className="divide-y">
              {filteredCostCenters.map(center => (
                <li key={center.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium text-gray-900">{center.company}</span>
                    <span className="ml-2 text-xs text-gray-500">{center.cost_code}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/protected/fc/validate/cost-centers/${encodeURIComponent(center.cost_code)}`)}
                  >
                    View Vehicles
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No cost centers found for this customer</h3>
              <p className="mb-4 text-gray-500">Check the account numbers or try again later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ValidateCostCentersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ValidateCostCentersContent />
    </Suspense>
  );
}
