"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, ChevronDown, ChevronUp, Edit, Plus, Trash2, Check } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ValidateVehiclesPage() {
  const router = useRouter();
  const params = useParams();
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVehicles, setExpandedVehicles] = useState({});
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({});
  const [validationMode, setValidationMode] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const costCode = params?.costCode ? decodeURIComponent(params.costCode) : "";

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        if (!costCode) {
          console.error('No cost code provided');
          toast.error('No cost center provided');
          return;
        }

        console.log('Fetching vehicles for cost code:', costCode);
        const response = await fetch(`/api/vehicles/get?cost_code=${encodeURIComponent(costCode)}`);
        console.log('Vehicles response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Vehicles error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch vehicles');
        }
        
        const data = await response.json();
        console.log('Vehicles data:', data);
        setVehicles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [costCode]);

  const toggleVehicle = (vehicleId) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  const calculateTotals = (data) => {
    const allKeys = Object.keys(data);
    
    // All rental fields ending with _rental (excluding total_rental)
    const rentalKeys = allKeys.filter(k => k.endsWith('_rental') && k !== 'total_rental');
    
    // All sub fields: those ending with _sub (excluding totals) + special billing fields
    const specialBillingFields = ['consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom'];
    const subKeys = allKeys.filter(k => 
      (k.endsWith('_sub') && !['total_sub', 'total_rental_sub'].includes(k)) || 
      specialBillingFields.includes(k)
    );
    
    const totalRental = rentalKeys.reduce((sum, k) => {
      const val = data[k];
      if (val === null || val === undefined || val === '') return sum;
      const numVal = parseFloat(val);
      return isNaN(numVal) ? sum : sum + numVal;
    }, 0);
    
    const totalSub = subKeys.reduce((sum, k) => {
      const val = data[k];
      if (val === null || val === undefined || val === '') return sum;
      const numVal = parseFloat(val);
      return isNaN(numVal) ? sum : sum + numVal;
    }, 0);
    
    return {
      total_rental: totalRental,
      total_sub: totalSub,
      total_rental_sub: totalRental + totalSub
    };
  };

  const startEdit = (vehicle) => {
    setEditingVehicle(vehicle.id);
    const totals = calculateTotals(vehicle);
    setEditedData({...vehicle, ...totals});
  };

  const cancelEdit = () => {
    setEditingVehicle(null);
    setEditedData({});
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => {
      const updated = {...prev, [field]: value === '' ? null : value};
      const totals = calculateTotals(updated);
      return {...updated, ...totals};
    });
  };

  const confirmField = (field) => {
    const subFields = ['consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom'];
    if (field.endsWith('_rental') || (field.endsWith('_sub') && !['total_sub', 'total_rental_sub'].includes(field)) || subFields.includes(field)) {
      setEditedData(prev => {
        const allKeys = Object.keys(prev);
        const rentalKeys = allKeys.filter(k => k.endsWith('_rental'));
        const subKeys = allKeys.filter(k => (k.endsWith('_sub') && k !== 'total_sub' && k !== 'total_rental_sub') || subFields.includes(k));
        
        const totalRental = rentalKeys.reduce((sum, k) => sum + (parseFloat(prev[k]) || 0), 0);
        const totalSub = subKeys.reduce((sum, k) => sum + (parseFloat(prev[k]) || 0), 0);
        
        return {
          ...prev,
          total_rental: totalRental > 0 ? totalRental.toFixed(2) : '0',
          total_sub: totalSub > 0 ? totalSub.toFixed(2) : '0',
          total_rental_sub: (totalRental + totalSub) > 0 ? (totalRental + totalSub).toFixed(2) : '0'
        };
      });
    }
    toast.success('Field confirmed');
  };

  const saveVehicle = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/vehicles/update', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(editedData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', errorText);
        throw new Error('Failed to update vehicle');
      }
      
      const result = await response.json();
      setVehicles(prev => prev.map(v => v.id === editedData.id ? result : v));
      toast.success('Vehicle updated successfully');
      setEditingVehicle(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update vehicle: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewVehicleChange = (field, value) => {
    setNewVehicleData(prev => {
      const updated = {...prev, [field]: value === '' ? null : value};
      const totals = calculateTotals(updated);
      return {...updated, ...totals};
    });
  };

  const addVehicle = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/vehicles/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...newVehicleData, new_account_number: costCode})
      });
      
      if (!response.ok) throw new Error('Failed to create vehicle');
      
      const newVehicle = await response.json();
      setVehicles(prev => [...prev, newVehicle]);
      toast.success('Vehicle added successfully');
      setShowAddForm(false);
      setNewVehicleData({});
    } catch (error) {
      toast.error('Failed to add vehicle: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
      const response = await fetch('/api/vehicles/delete', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: vehicleId})
      });
      
      if (!response.ok) throw new Error('Failed to delete vehicle');
      
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      toast.success('Vehicle deleted successfully');
    } catch (error) {
      toast.error('Failed to delete vehicle: ' + error.message);
    }
  };

  const renderField = (label, value) => {
    if (!value && value !== 0) return null;
    return (
      <div>
        <Label className="text-xs text-gray-500">{label}</Label>
        <p className="text-sm">{value}</p>
      </div>
    );
  };

  const renderAllFields = (vehicle, isEditing, isNew = false) => {
    const data = isNew ? newVehicleData : (isEditing ? editedData : vehicle);
    const onChange = isNew ? handleNewVehicleChange : handleFieldChange;
    
    const excludeKeys = ['id', 'created_at', 'unique_id', 'new_account_number', 'total_rental', 'total_sub', 'total_rental_sub'];
    const billingFields = ['consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom'];
    const allKeys = Object.keys(data || {});
    
    const billingKeys = allKeys.filter(k => k.endsWith('_rental') || k.endsWith('_sub') || billingFields.includes(k));
    const infoKeys = allKeys.filter(k => !excludeKeys.includes(k) && !billingKeys.includes(k));
    
    return (
      <>
        <div className="col-span-full mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Vehicle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {infoKeys.map((key, idx) => {
              const displayLabel = key.replace(/_/g, ' ').toUpperCase();
              return (
                <div key={idx} className="text-sm">
                  <Label className="text-xs text-gray-500">{displayLabel}</Label>
                  {(isEditing || isNew) ? (
                    <Input value={data[key] || ''} onChange={(e) => onChange(key, e.target.value)} className="h-8 text-sm" />
                  ) : (
                    <p className="text-sm mt-1">{data[key] || 'N/A'}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="col-span-full">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Billing Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {billingKeys.map((key, idx) => {
              const displayLabel = key.replace(/_/g, ' ').toUpperCase();
              return (
                <div key={idx} className="text-sm">
                  <Label className="text-xs text-gray-500">{displayLabel}</Label>
                  {(isEditing || isNew) ? (
                    <div className="flex gap-1">
                      <Input value={data[key] || ''} onChange={(e) => onChange(key, e.target.value)} className="h-8 text-sm" />
                      {!isNew && data[key] !== vehicle[key] && (
                        <button onClick={() => confirmField(key)} className="px-1 hover:bg-green-100 rounded">
                          <Check className="h-3 w-3 text-green-600" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm mt-1">{data[key] || 'N/A'}</p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mt-4">
            {!isNew && !validationMode && (
              <div className="flex justify-end gap-2 mb-4">
                {editingVehicle === vehicle.id ? (
                  <>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    <Button size="sm" onClick={saveVehicle} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => deleteVehicle(vehicle.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button size="sm" onClick={() => startEdit(vehicle)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div>
                  <Label className="text-xs font-medium text-slate-600">TOTAL RENTAL</Label>
                  <p className="text-lg font-bold mt-1">R {parseFloat(data.total_rental || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">TOTAL SUB</Label>
                  <p className="text-lg font-bold mt-1">R {parseFloat(data.total_sub || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-800 text-white rounded-lg p-3 -m-1">
                  <Label className="text-xs font-medium text-slate-300">TOTAL</Label>
                  <p className="text-xl font-bold mt-1">R {parseFloat(data.total_rental_sub || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader title="Validate Vehicles" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{validationMode ? "Validation Mode" : "Validate Vehicles"} - {costCode}</h1>
              <Button 
                size="sm" 
                variant={validationMode ? "default" : "outline"}
                onClick={() => setValidationMode(!validationMode)}
              >
                {validationMode ? "ON" : "OFF"}
              </Button>
            </div>
            <p className="text-sm text-gray-500">Minimal vehicle information</p>
          </div>
        </div>
        {!validationMode && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        )}
      </div>

      {!validationMode && showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {renderAllFields({}, false, true)}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {setShowAddForm(false); setNewVehicleData({});}}>Cancel</Button>
              <Button onClick={addVehicle} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Add Vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No vehicles found for this cost center</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {vehicles.map((vehicle) => (
            <Collapsible key={vehicle.id} open={expandedVehicles[vehicle.id]} onOpenChange={() => toggleVehicle(vehicle.id)}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-6 text-left">
                        <div>
                          <Label className="text-xs text-gray-500">Registration</Label>
                          <p className="text-sm font-medium">{vehicle.reg || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Fleet Number</Label>
                          <p className="text-sm font-medium">{vehicle.fleet_number || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">VIN</Label>
                          <p className="text-sm font-medium">{vehicle.vin || 'N/A'}</p>
                        </div>
                      </div>
                      {expandedVehicles[vehicle.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {renderAllFields(vehicle, editingVehicle === vehicle.id)}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
