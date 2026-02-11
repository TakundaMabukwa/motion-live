"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, ArrowLeft, CheckCircle, Check } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";

export default function ValidateCostCentersPage() {
  const router = useRouter();
  const params = useParams();
  
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState({});
  const accountNumbers = params?.accountNumbers ? decodeURIComponent(params.accountNumbers) : "";

  useEffect(() => {
    const fetchCostCenters = async () => {
      try {
        if (!accountNumbers) {
          console.error('No account numbers provided');
          toast.error('No account numbers provided');
          return;
        }

        console.log('Fetching cost centers for accounts:', accountNumbers);
        const response = await fetch(`/api/cost-centers?accounts=${encodeURIComponent(accountNumbers)}`);
        console.log('Cost centers response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Cost centers error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch cost centers');
        }
        
        const data = await response.json();
        console.log('Cost centers data:', data);
        setCostCenters(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching cost centers:', error);
        toast.error('Failed to load cost centers: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCostCenters();
  }, [accountNumbers]);

  const handleValidate = async (costCenter) => {
    const key = costCenter.cost_code;
    setValidating(prev => ({...prev, [key]: true}));
    try {
      const response = await fetch('/api/cost-centers/validate', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cost_code: costCenter.cost_code, validated: !costCenter.validated})
      });
      
      if (!response.ok) throw new Error('Failed to update validation status');
      
      setCostCenters(prev => prev.map(cc => 
        cc.cost_code === costCenter.cost_code ? {...cc, validated: !cc.validated} : cc
      ));
      toast.success(costCenter.validated ? 'Validation removed' : 'Cost center validated');
    } catch (error) {
      toast.error('Failed to update validation status');
    } finally {
      setValidating(prev => ({...prev, [key]: false}));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader title="Select Cost Center" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader 
        title="Select Cost Center"
        subtitle="Choose a cost center to view and validate vehicles"
      />

      <div className="flex gap-2 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {costCenters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No cost centers found for this customer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 border-b text-left">Cost Center</th>
                <th className="px-4 py-2 border-b text-left">Company</th>
                <th className="px-4 py-2 border-b text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {costCenters.map((costCenter, idx) => (
                <tr key={costCenter.id || `${costCenter.cost_code}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{costCenter.cost_code}</span>
                      {costCenter.validated && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Validated
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b">{costCenter.company || '-'}</td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/protected/fc/validate/vehicles/${encodeURIComponent(costCenter.cost_code)}`)}
                      >
                        View Vehicles
                      </Button>
                      <Button
                        size="sm"
                        variant={costCenter.validated ? "outline" : "default"}
                        onClick={() => handleValidate(costCenter)}
                        disabled={validating[costCenter.cost_code] || costCenter.validated}
                      >
                        {validating[costCenter.cost_code] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {costCenter.validated ? 'Validated' : 'Validate'}
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
