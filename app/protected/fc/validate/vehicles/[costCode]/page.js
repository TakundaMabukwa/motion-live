"use client";

import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, ChevronDown, ChevronUp, Edit, Plus, Trash2, Check } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AddItemSearch = memo(function AddItemSearch({
  vehicleFieldsToAdd,
  billingFieldsToAdd,
  onAddField
}) {
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const valueInputRef = useRef(null);
  const normalizedSearch = fieldSearch.toLowerCase().trim().replace(/\s+/g, ' ');
  const queryTokens = normalizedSearch ? normalizedSearch.split(' ') : [];
  const matchesSearch = (field) => {
    if (queryTokens.length === 0) return true;
    const fieldText = field.toLowerCase().replace(/_/g, ' ');
    return queryTokens.every(token => fieldText.includes(token));
  };
  const filteredVehicleFields = useMemo(
    () => vehicleFieldsToAdd.filter(matchesSearch),
    [vehicleFieldsToAdd, normalizedSearch]
  );
  const filteredBillingFields = useMemo(
    () => billingFieldsToAdd.filter(matchesSearch),
    [billingFieldsToAdd, normalizedSearch]
  );
  const firstMatch = filteredVehicleFields[0] || filteredBillingFields[0] || '';

  const handleSelectField = (field) => {
    setSelectedField(field);
    setFieldSearch(field.replace(/_/g, ' '));
    setIsDropdownOpen(false);
    requestAnimationFrame(() => valueInputRef.current?.focus());
  };

  const handleAdd = () => {
    if (!selectedField) return;
    onAddField(selectedField, fieldValue);
    setSelectedField('');
    setFieldValue('');
    setFieldSearch('');
    setIsDropdownOpen(false);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    setIsDropdownOpen(true);
    if (!selectedField && firstMatch) {
      handleSelectField(firstMatch);
      return;
    }
    if (selectedField) {
      requestAnimationFrame(() => valueInputRef.current?.focus());
    }
  };

  const handleValueKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleAdd();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="min-w-[320px] relative" ref={dropdownRef}>
        <Input
          ref={searchInputRef}
          value={fieldSearch}
          onChange={(e) => {
            setFieldSearch(e.target.value);
            setSelectedField('');
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search fields..."
          className="h-9 text-sm"
        />
        {isDropdownOpen && (
          <div className="absolute z-20 mt-1 w-full border rounded-md bg-white p-2 shadow-md">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredVehicleFields.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 px-1 mb-1">Vehicle Fields</p>
                {filteredVehicleFields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleSelectField(f)}
                    className={`w-full text-left text-xs px-2 py-1 rounded ${selectedField === f ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                  >
                    {f.replace(/_/g, ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            {filteredBillingFields.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 px-1 mb-1">Billing Fields</p>
                {filteredBillingFields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleSelectField(f)}
                    className={`w-full text-left text-xs px-2 py-1 rounded ${selectedField === f ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                  >
                    {f.replace(/_/g, ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            {filteredVehicleFields.length === 0 && filteredBillingFields.length === 0 && (
              <p className="text-xs text-gray-500 px-1 py-2">No matching fields</p>
            )}
          </div>
          </div>
        )}
      </div>
      <Input
        value={fieldValue}
        onChange={(e) => setFieldValue(e.target.value)}
        onKeyDown={handleValueKeyDown}
        placeholder="Enter value..."
        className="h-9 text-sm w-[180px]"
        disabled={!selectedField}
        ref={valueInputRef}
      />
      <Button size="sm" onClick={handleAdd} disabled={!selectedField}>
        <Plus className="h-3 w-3 mr-1" />
        Add Item
      </Button>
    </div>
  );
});

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
  const [addItemState, setAddItemState] = useState({});
  const costCode = params?.costCode ? decodeURIComponent(params.costCode) : "";

  const excludeKeys = ['id', 'created_at', 'unique_id', 'new_account_number', 'total_rental', 'total_sub', 'total_rental_sub'];
  const billingFields = ['consultancy', 'roaming', 'maintenance', 'after_hours', 'controlroom', 'software', 'additional_data'];
  const specialBillingFields = billingFields;
  const allPossibleBillingFields = [
    'skylink_trailer_unit_rental', 'skylink_trailer_sub',
    'sky_on_batt_ign_rental', 'sky_on_batt_sub',
    'skylink_voice_kit_rental', 'skylink_voice_kit_sub',
    'sky_scout_12v_rental', 'sky_scout_12v_sub',
    'sky_scout_24v_rental', 'sky_scout_24v_sub',
    'skylink_pro_rental', 'skylink_pro_sub',
    'fm_unit_rental', 'fm_unit_sub',
    'beame_1_rental', 'beame_1_sub',
    'beame_2_rental', 'beame_2_sub',
    'beame_3_rental', 'beame_3_sub',
    'beame_4_rental', 'beame_4_sub',
    'beame_5_rental', 'beame_5_sub',
    'single_probe_rental', 'single_probe_sub',
    'dual_probe_rental', 'dual_probe_sub',
    '_4ch_mdvr_rental', '_4ch_mdvr_sub',
    '_5ch_mdvr_rental', '_5ch_mdvr_sub',
    '_8ch_mdvr_rental', '_8ch_mdvr_sub',
    'a2_dash_cam_rental', 'a2_dash_cam_sub',
    'pfk_main_unit_rental', 'pfk_main_unit_sub',
    ...specialBillingFields
  ];
  const allVehicleFieldKeys = useMemo(() => {
    const keysFromVehicles = vehicles.flatMap(v => Object.keys(v || {}));
    return Array.from(new Set([...keysFromVehicles, ...allPossibleBillingFields])).filter(k => !excludeKeys.includes(k));
  }, [vehicles]);

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
    setAddItemState(prev => ({ ...prev, [`vehicle-${vehicle.id}`]: prev[`vehicle-${vehicle.id}`] || { added: [] } }));
  };

  const cancelEdit = () => {
    if (editingVehicle !== null) {
      setAddItemState(prev => {
        const next = { ...prev };
        delete next[`vehicle-${editingVehicle}`];
        return next;
      });
    }
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
    if (field.endsWith('_rental') || (field.endsWith('_sub') && !['total_sub', 'total_rental_sub'].includes(field)) || specialBillingFields.includes(field)) {
      setEditedData(prev => {
        const allKeys = Object.keys(prev);
        const rentalKeys = allKeys.filter(k => k.endsWith('_rental'));
        const subKeys = allKeys.filter(k => (k.endsWith('_sub') && k !== 'total_sub' && k !== 'total_rental_sub') || specialBillingFields.includes(k));
        
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

  const normalizeForCompare = (value) => (value === '' || value === undefined ? null : value);

  const saveVehicle = async () => {
    const currentVehicle = vehicles.find(v => v.id === editedData.id);
    if (!currentVehicle) {
      toast.error('Vehicle not found');
      return;
    }

    const changedFields = Object.keys(editedData).reduce((acc, key) => {
      if (key === 'id' || key === 'unique_id') return acc;
      const before = normalizeForCompare(currentVehicle[key]);
      const after = normalizeForCompare(editedData[key]);
      if (before !== after) {
        acc[key] = editedData[key];
      }
      return acc;
    }, {});

    if (Object.keys(changedFields).length === 0) {
      toast.info('No changes to save');
      setEditingVehicle(null);
      return;
    }

    const previousVehicles = vehicles;
    const optimisticVehicle = { ...currentVehicle, ...changedFields };
    setVehicles(prev => prev.map(v => v.id === editedData.id ? optimisticVehicle : v));
    setEditingVehicle(null);
    setSaving(true);
    try {
      const payload = {
        id: editedData.id,
        ...(editedData.unique_id ? { unique_id: editedData.unique_id } : {}),
        ...changedFields
      };
      const response = await fetch('/api/vehicles/update', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', errorText);
        throw new Error('Failed to update vehicle');
      }
      
      const result = await response.json();
      setVehicles(prev => prev.map(v => v.id === editedData.id ? result : v));
      toast.success('Vehicle updated successfully');
      setEditedData({});
    } catch (error) {
      console.error('Save error:', error);
      setVehicles(previousVehicles);
      setEditingVehicle(editedData.id);
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
      setAddItemState(prev => {
        const next = { ...prev };
        delete next.new;
        return next;
      });
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
    const contextKey = isNew ? 'new' : `vehicle-${vehicle.id}`;
    const addedFields = addItemState[contextKey]?.added || [];
    const hasValue = (value) => value !== null && value !== '' && value !== undefined;
    const allKnownKeys = Array.from(new Set([
      ...allVehicleFieldKeys,
      ...Object.keys(data || {}),
      ...addedFields
    ]));
    const allFieldKeys = allKnownKeys.filter(k => !excludeKeys.includes(k));
    const visibleKeys = allFieldKeys.filter(k => hasValue(data?.[k]) || addedFields.includes(k));
    const billingKeys = visibleKeys.filter(k => k.endsWith('_rental') || k.endsWith('_sub') || billingFields.includes(k));
    const infoKeys = visibleKeys.filter(k => !k.endsWith('_rental') && !k.endsWith('_sub') && !billingFields.includes(k));
    const availableFieldsToAdd = allFieldKeys.filter(f => !visibleKeys.includes(f));
    const billingFieldsToAdd = availableFieldsToAdd
      .filter(f => f.endsWith('_rental') || f.endsWith('_sub') || billingFields.includes(f))
      .sort((a, b) => a.localeCompare(b));
    const vehicleFieldsToAdd = availableFieldsToAdd
      .filter(f => !f.endsWith('_rental') && !f.endsWith('_sub') && !billingFields.includes(f))
      .sort((a, b) => a.localeCompare(b));

    const handleAddField = (fieldToAdd, initialValue = '') => {
      if (!fieldToAdd) return;
      setAddItemState(prev => {
        const current = prev[contextKey] || { added: [] };
        return {
          ...prev,
          [contextKey]: {
            added: current.added.includes(fieldToAdd) ? current.added : [...current.added, fieldToAdd]
          }
        };
      });
      onChange(fieldToAdd, initialValue);
    };
    
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
          {(isEditing || isNew) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Add Item</h3>
              <AddItemSearch
                vehicleFieldsToAdd={vehicleFieldsToAdd}
                billingFieldsToAdd={billingFieldsToAdd}
                onAddField={handleAddField}
              />
            </div>
          )}
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
          {!isNew && !validationMode && (
            <div className="flex justify-end gap-2 mt-4">
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
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                setNewVehicleData({});
                setAddItemState(prev => {
                  const next = { ...prev };
                  delete next.new;
                  return next;
                });
              }}>Cancel</Button>
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
