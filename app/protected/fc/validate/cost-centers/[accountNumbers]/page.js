"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, ArrowLeft, CheckCircle, Check, Trash2, AlertCircle } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";

export default function ValidateCostCentersPage() {
  const router = useRouter();
  const params = useParams();
  
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState({});
  const [deleting, setDeleting] = useState({});
  const [deleteModal, setDeleteModal] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [transferOptions, setTransferOptions] = useState([]);
  const [selectedTransferTarget, setSelectedTransferTarget] = useState(null);
  const [deleteAction, setDeleteAction] = useState(null); // 'transfer' or 'delete'
  const accountNumbers = params?.accountNumbers ? decodeURIComponent(params.accountNumbers) : "";

  const normalizedAccountNumbers = Array.from(
    new Set(
      accountNumbers
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  useEffect(() => {
    const fetchCostCenters = async () => {
      try {
        if (normalizedAccountNumbers.length === 0) {
          console.error('No account numbers provided');
          toast.error('No account numbers provided');
          setCostCenters([]);
          setLoading(false);
          return;
        }

        const isSingleAccount = normalizedAccountNumbers.length === 1;
        const singleAccount = normalizedAccountNumbers[0] || "";
        const prefix = singleAccount.split("-")[0]?.trim();

        const requestUrl =
          isSingleAccount && prefix
            ? `/api/cost-centers?prefix=${encodeURIComponent(prefix)}`
            : `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(normalizedAccountNumbers.join(","))}`;

        console.log('Fetching cost centers using request:', requestUrl);
        const response = await fetch(requestUrl, { cache: "no-store" });
        console.log('Cost centers response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Cost centers error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch cost centers');
        }
        
        const data = await response.json();
        console.log('Cost centers data:', data);

        const fetchedCenters = Array.isArray(data?.costCenters)
          ? data.costCenters
          : Array.isArray(data)
            ? data
            : [];

        const orderedCenters =
          isSingleAccount && prefix
            ? fetchedCenters.filter((center) =>
                String(center?.cost_code || "").trim().toUpperCase().startsWith(`${prefix}-`),
              )
            : normalizedAccountNumbers
                .map((code) =>
                  fetchedCenters.find(
                    (center) =>
                      String(center?.cost_code || "").trim().toUpperCase() === code,
                  ),
                )
                .filter(Boolean);

        setCostCenters(orderedCenters);

        if (!isSingleAccount && orderedCenters.length !== normalizedAccountNumbers.length) {
          const missingCodes = normalizedAccountNumbers.filter(
            (code) =>
              !fetchedCenters.some(
                (center) =>
                  String(center?.cost_code || "").trim().toUpperCase() === code,
              ),
          );
          console.warn("Missing cost centers for codes:", missingCodes);
        }
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

  const handleDeleteClick = async (costCenter) => {
    setDeleteModal(costCenter);
    setVehicleLoading(true);
    setDeleteAction(null);
    setSelectedTransferTarget(null);
    setVehicles([]);
    setTransferOptions([]);

    try {
      // Fetch vehicles with this cost code
      const response = await fetch(`/api/cost-centers/check-vehicles?cost_code=${encodeURIComponent(costCenter.cost_code)}`);
      if (!response.ok) throw new Error('Failed to check vehicles');
      
      const data = await response.json();
      setVehicles(data.vehicles || []);

      // If there are vehicles, try to get transfer options (cost centers with same prefix)
      if (data.vehicles && data.vehicles.length > 0) {
        const prefix = costCenter.cost_code.match(/^[A-Z-]+/)?.[0] || '';
        const options = costCenters.filter(cc => 
          cc.cost_code !== costCenter.cost_code && 
          cc.cost_code.startsWith(prefix.replace(/-$/, ''))
        );
        setTransferOptions(options);
      }
    } catch (error) {
      console.error('Error checking vehicles:', error);
      toast.error('Failed to check vehicles: ' + error.message);
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    
    if (vehicles.length > 0 && !deleteAction) {
      toast.error('Please select what to do with the vehicles');
      return;
    }

    const key = deleteModal.cost_code;
    setDeleting(prev => ({...prev, [key]: true}));

    try {
      const body = {
        cost_code: deleteModal.cost_code,
        vehicleAction: deleteAction || 'none' // 'none', 'delete', or transfer target cost code
      };

      if (deleteAction === 'transfer' && selectedTransferTarget) {
        body.vehicleAction = selectedTransferTarget.cost_code;
      }

      const response = await fetch('/api/cost-centers/delete', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete cost center');
      }

      setCostCenters(prev => prev.filter(cc => cc.cost_code !== deleteModal.cost_code));
      toast.success('Cost center deleted successfully');
      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting cost center:', error);
      toast.error('Failed to delete cost center: ' + error.message);
    } finally {
      setDeleting(prev => ({...prev, [key]: false}));
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
                <th className="px-4 py-2 border-b text-left">Lock Status</th>
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
                  <td className="px-4 py-2 border-b align-top">
                    {costCenter.total_amount_locked ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-700">
                        <span className="font-semibold text-blue-900">Locked</span>
                        <span>Amount: {costCenter.total_amount_locked_value != null ? `R ${Number(costCenter.total_amount_locked_value).toFixed(2)}` : '-'}</span>
                        <span>By: {costCenter.total_amount_locked_by_email || costCenter.total_amount_locked_by || '-'}</span>
                        <span>At: {costCenter.total_amount_locked_at ? new Date(costCenter.total_amount_locked_at).toLocaleString('en-ZA') : '-'}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not locked</span>
                    )}
                  </td>
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
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(costCenter)}
                        disabled={deleting[costCenter.cost_code]}
                      >
                        {deleting[costCenter.cost_code] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
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

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl border-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-full">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-red-900">Delete Cost Center</h3>
                  <p className="text-sm text-red-700">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <CardContent className="space-y-5 pt-6 pb-6 px-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Cost Center Info */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-1 uppercase font-semibold tracking-wide">Cost Center</p>
                <p className="text-2xl font-bold text-gray-900">{deleteModal.company || deleteModal.cost_code}</p>
                <p className="text-xs text-gray-600 mt-1">{deleteModal.cost_code}</p>
              </div>

              {/* Loading or Content */}
              {vehicleLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Checking vehicles...</p>
                </div>
              ) : vehicles.length > 0 ? (
                <div className="space-y-4">
                  {/* Vehicles List */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 text-sm mb-3">
                          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} attached to this cost center:
                        </p>
                        <ul className="space-y-2">
                          {vehicles.map((v, i) => (
                            <li key={i} className="bg-white p-2 rounded border border-yellow-100 text-xs">
                              <p className="font-mono font-semibold text-gray-900">{v.reg || v.fleet_number || 'Unknown'}</p>
                              {v.make && v.model && (
                                <p className="text-gray-600">{v.make} {v.model}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Options */}
                  <div className="space-y-3">
                    <p className="font-semibold text-gray-900 text-sm">What would you like to do?</p>
                    
                    {transferOptions.length > 0 && (
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors group"
                               style={{borderColor: deleteAction === 'transfer' ? '#3b82f6' : undefined, backgroundColor: deleteAction === 'transfer' ? '#eff6ff' : undefined}}>
                          <input 
                            type="radio" 
                            name="action" 
                            value="transfer"
                            checked={deleteAction === 'transfer'}
                            onChange={() => setDeleteAction('transfer')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700">Move vehicles to another cost center</p>
                            <p className="text-xs text-gray-500 mt-1">Vehicles will be reassigned to the selected cost center</p>
                          </div>
                        </label>
                        {deleteAction === 'transfer' && (
                          <select
                            value={selectedTransferTarget?.cost_code || ''}
                            onChange={(e) => {
                              const target = transferOptions.find(opt => opt.cost_code === e.target.value);
                              setSelectedTransferTarget(target);
                            }}
                            className="w-full ml-6 p-2.5 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                          >
                            <option value="">📍 Select destination cost center...</option>
                            {transferOptions.map(opt => (
                              <option key={opt.cost_code} value={opt.cost_code}>
                                {opt.cost_code} - {opt.company}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    
                    <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors group"
                           style={{borderColor: deleteAction === 'delete' ? '#ef4444' : undefined, backgroundColor: deleteAction === 'delete' ? '#fef2f2' : undefined}}>
                      <input 
                        type="radio" 
                        name="action" 
                        value="delete"
                        checked={deleteAction === 'delete'}
                        onChange={() => setDeleteAction('delete')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm group-hover:text-red-700">Delete vehicles from system</p>
                        <p className="text-xs text-gray-500 mt-1">Vehicles will be permanently removed from the system</p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-green-900">No vehicles attached</p>
                  <p className="text-xs text-green-700 mt-1">This cost center can be safely deleted</p>
                </div>
              )}
            </CardContent>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
              <Button 
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={deleting[deleteModal.cost_code]}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting[deleteModal.cost_code] || (vehicles.length > 0 && !deleteAction)}
                className="px-6 bg-red-600 hover:bg-red-700"
              >
                {deleting[deleteModal.cost_code] ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete Cost Center'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
