"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, ChevronDown, ChevronUp, Edit, Plus, Trash2 } from "lucide-react";
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

  const startEdit = (vehicle) => {
    setEditingVehicle(vehicle.id);
    setEditedData({...vehicle});
  };

  const cancelEdit = () => {
    setEditingVehicle(null);
    setEditedData({});
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({...prev, [field]: value}));
  };

  const saveVehicle = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/vehicles/update', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(editedData)
      });
      
      if (!response.ok) throw new Error('Failed to update vehicle');
      
      setVehicles(prev => prev.map(v => v.id === editedData.id ? editedData : v));
      toast.success('Vehicle updated successfully');
      setEditingVehicle(null);
    } catch (error) {
      toast.error('Failed to update vehicle: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewVehicleChange = (field, value) => {
    setNewVehicleData(prev => ({...prev, [field]: value}));
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
    const fieldKeys = [
      ['company', 'Company'],
      ['new_account_number', 'Account Number'],
      ['branch', 'Branch'],
      ['make', 'Make'],
      ['model', 'Model'],
      ['engine', 'Engine'],
      ['year', 'Year'],
      ['colour', 'Colour'],
      ['skylink_trailer_unit_serial_number', 'Skylink Trailer Unit SN'],
      ['skylink_trailer_unit_ip', 'Skylink Trailer Unit IP'],
      ['sky_on_batt_ign_unit_serial_number', 'Sky On Batt IGN Unit SN'],
      ['sky_on_batt_ign_unit_ip', 'Sky On Batt IGN Unit IP'],
      ['skylink_voice_kit_serial_number', 'Skylink Voice Kit SN'],
      ['skylink_voice_kit_ip', 'Skylink Voice Kit IP'],
      ['sky_scout_12v_serial_number', 'Sky Scout 12V SN'],
      ['sky_scout_12v_ip', 'Sky Scout 12V IP'],
      ['sky_scout_24v_serial_number', 'Sky Scout 24V SN'],
      ['sky_scout_24v_ip', 'Sky Scout 24V IP'],
      ['skylink_pro_serial_number', 'Skylink Pro SN'],
      ['skylink_pro_ip', 'Skylink Pro IP'],
      ['skylink_sim_card_no', 'Skylink SIM Card'],
      ['skylink_data_number', 'Skylink Data Number'],
      ['sky_safety', 'Sky Safety'],
      ['sky_idata', 'Sky iData'],
      ['sky_ican', 'Sky iCan'],
      ['industrial_panic', 'Industrial Panic'],
      ['flat_panic', 'Flat Panic'],
      ['buzzer', 'Buzzer'],
      ['tag', 'Tag'],
      ['tag_reader', 'Tag Reader'],
      ['keypad', 'Keypad'],
      ['keypad_waterproof', 'Keypad Waterproof'],
      ['early_warning', 'Early Warning'],
      ['cia', 'CIA'],
      ['fm_unit', 'FM Unit'],
      ['sim_card_number', 'SIM Card Number'],
      ['data_number', 'Data Number'],
      ['gps', 'GPS'],
      ['gsm', 'GSM'],
      ['main_fm_harness', 'Main FM Harness'],
      ['beame_1', 'Beame 1'],
      ['beame_2', 'Beame 2'],
      ['beame_3', 'Beame 3'],
      ['beame_4', 'Beame 4'],
      ['beame_5', 'Beame 5'],
      ['fuel_probe_1', 'Fuel Probe 1'],
      ['fuel_probe_2', 'Fuel Probe 2'],
      ['_7m_harness_for_probe', '7M Harness for Probe'],
      ['tpiece', 'T-Piece'],
      ['idata', 'iData'],
      ['_1m_extension_cable', '1M Extension Cable'],
      ['_3m_extension_cable', '3M Extension Cable'],
      ['_4ch_mdvr', '4CH MDVR'],
      ['_5ch_mdvr', '5CH MDVR'],
      ['_8ch_mdvr', '8CH MDVR'],
      ['a2_dash_cam', 'A2 Dash Cam'],
      ['a3_dash_cam_ai', 'A3 Dash Cam AI'],
      ['corpconnect_sim_no', 'CorpConnect SIM'],
      ['corpconnect_data_no', 'CorpConnect Data'],
      ['sim_id', 'SIM ID'],
      ['_5m_cable_for_camera_4pin', '5M Cable 4Pin'],
      ['_5m_cable_6pin', '5M Cable 6Pin'],
      ['_10m_cable_for_camera_4pin', '10M Cable 4Pin'],
      ['a2_mec_5', 'A2 MEC 5'],
      ['vw400_dome_1', 'VW400 Dome 1'],
      ['vw400_dome_2', 'VW400 Dome 2'],
      ['vw300_dakkie_dome_1', 'VW300 Dakkie Dome 1'],
      ['vw300_dakkie_dome_2', 'VW300 Dakkie Dome 2'],
      ['vw502_dual_lens_camera', 'VW502 Dual Lens Camera'],
      ['vw303_driver_facing_camera', 'VW303 Driver Facing Camera'],
      ['vw502f_road_facing_camera', 'VW502F Road Facing Camera'],
      ['vw306_dvr_road_facing_for_4ch_8ch', 'VW306 DVR Road Facing'],
      ['vw306m_a2_dash_cam', 'VW306M A2 Dash Cam'],
      ['dms01_driver_facing', 'DMS01 Driver Facing'],
      ['adas_02_road_facing', 'ADAS 02 Road Facing'],
      ['vw100ip_driver_facing_ip', 'VW100IP Driver Facing IP'],
      ['sd_card_1tb', 'SD Card 1TB'],
      ['sd_card_2tb', 'SD Card 2TB'],
      ['sd_card_480gb', 'SD Card 480GB'],
      ['sd_card_256gb', 'SD Card 256GB'],
      ['sd_card_512gb', 'SD Card 512GB'],
      ['sd_card_250gb', 'SD Card 250GB'],
      ['mic', 'Mic'],
      ['speaker', 'Speaker'],
      ['pfk_main_unit', 'PFK Main Unit'],
      ['pfk_corpconnect_sim_number', 'PFK CorpConnect SIM'],
      ['pfk_corpconnect_data_number', 'PFK CorpConnect Data'],
      ['breathaloc', 'Breathaloc'],
      ['pfk_road_facing', 'PFK Road Facing'],
      ['pfk_driver_facing', 'PFK Driver Facing'],
      ['pfk_dome_1', 'PFK Dome 1'],
      ['pfk_dome_2', 'PFK Dome 2'],
      ['pfk_5m', 'PFK 5M'],
      ['pfk_10m', 'PFK 10M'],
      ['pfk_15m', 'PFK 15M'],
      ['pfk_20m', 'PFK 20M'],
      ['roller_door_switches', 'Roller Door Switches'],
      ['consultancy', 'Consultancy'],
      ['roaming', 'Roaming'],
      ['maintenance', 'Maintenance'],
      ['after_hours', 'After Hours'],
      ['controlroom', 'Control Room'],
      ['total_rental', 'Total Rental'],
      ['total_sub', 'Total Sub'],
      ['total_rental_sub', 'Total Rental + Sub'],
    ];

    return fieldKeys.map(([key, label], idx) => {
      if (key === 'new_account_number') {
        return (
          <div key={idx}>
            <Label className="text-xs text-gray-500">{label}</Label>
            <p className="text-sm font-medium">{isNew ? costCode : (data[key] || 'N/A')}</p>
          </div>
        );
      }
      
      return (
        <div key={idx}>
          <Label className="text-xs text-gray-500">{label}</Label>
          {(isEditing || isNew) ? (
            <Input
              value={data[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              className="text-sm"
            />
          ) : (
            <p className="text-sm">{data[key] || 'N/A'}</p>
          )}
        </div>
      );
    });
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
                    {!validationMode && (
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
