"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Car, Plus, Search, X } from "lucide-react";

const DeinstallationFlow = ({ 
  deInstallData, 
  setDeInstallData, 
  fetchVehiclesFromIP, 
  toggleVehicleSelection, 
  addProduct,
  viewVehicleParts,
  backToVehicleSelection,
  selectedProducts
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  if (deInstallData.loadingVehicles) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
        <span className="text-gray-600">Loading vehicles...</span>
      </div>
    );
  }

  if (!deInstallData.availableVehicles || deInstallData.availableVehicles.length === 0) {
    return (
      <div className="py-8 text-center">
        <Car className="mx-auto mb-4 w-12 h-12 text-gray-400" />
        <h3 className="mb-2 font-medium text-gray-900 text-lg">No vehicles available</h3>
        <p className="text-gray-500">This customer has no vehicles assigned for de-installation.</p>
      </div>
    );
  }

  // Step 1: Vehicle Selection
  if (deInstallData.currentStep === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-3">
          <Label>Select Vehicle ({deInstallData.totalVehicles})</Label>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 h-8 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deInstallData.availableVehicles
                .filter(vehicle => {
                  if (!searchTerm) return true;
                  const plate = (vehicle.fleet_number || vehicle.reg || '').toLowerCase();
                  return plate.includes(searchTerm.toLowerCase());
                })
                .map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {vehicle.fleet_number || vehicle.reg || 'Unknown Vehicle'}
                    </TableCell>
                    <TableCell>{vehicle.make || 'Unknown'}</TableCell>
                    <TableCell>{vehicle.model || ''}</TableCell>
                    <TableCell>{vehicle.year || 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewVehicleParts(vehicle.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        
        {/* All vehicles are now loaded by default for de-installation */}
      </div>
    );
  }
  
  // Step 2: Parts Selection for the selected vehicle
  if (deInstallData.currentStep === 1 && deInstallData.currentVehicleId) {
    const vehicle = deInstallData.availableVehicles.find(v => v.id === deInstallData.currentVehicleId);
    const vehicleName = vehicle 
      ? `${vehicle.fleet_number || vehicle.reg || 'Unknown'}`
      : 'Unknown Vehicle';
    
    // Define equipment groups (serial_number and ip pairs)
    const equipmentGroups = [
      { base: 'skylink_trailer_unit', name: 'Skylink Trailer Unit' },
      { base: 'sky_on_batt_ign_unit', name: 'Sky On Batt IGN Unit' },
      { base: 'skylink_voice_kit', name: 'Skylink Voice Kit' },
      { base: 'sky_scout_12v', name: 'Sky Scout 12V' },
      { base: 'sky_scout_24v', name: 'Sky Scout 24V' },
      { base: 'skylink_pro', name: 'Skylink Pro' }
    ];
    
    // Single field equipment
    const singleFields = [
      'skylink_sim_card_no', 'skylink_data_number', 'sky_safety', 'sky_idata', 'sky_ican', 'industrial_panic',
      'flat_panic', 'buzzer', 'tag', 'tag_reader', 'keypad', 'keypad_waterproof', 'early_warning', 'cia',
      'fm_unit', 'sim_card_number', 'data_number', 'gps', 'gsm', 'tag_', 'tag_reader_', 'main_fm_harness',
      'beame_1', 'beame_2', 'beame_3', 'beame_4', 'beame_5', 'fuel_probe_1', 'fuel_probe_2',
      '_7m_harness_for_probe', 'tpiece', 'idata', '_1m_extension_cable', '_3m_extension_cable',
      '_4ch_mdvr', '_5ch_mdvr', '_8ch_mdvr', 'a2_dash_cam', 'a3_dash_cam_ai', 'corpconnect_sim_no',
      'corpconnect_data_no', 'sim_id', '_5m_cable_for_camera_4pin', '_5m_cable_6pin', '_10m_cable_for_camera_4pin',
      'a2_mec_5', 'vw400_dome_1', 'vw400_dome_2', 'vw300_dakkie_dome_1', 'vw300_dakkie_dome_2',
      'vw502_dual_lens_camera', 'vw303_driver_facing_camera', 'vw502f_road_facing_camera',
      'vw306_dvr_road_facing_for_4ch_8ch', 'vw306m_a2_dash_cam', 'dms01_driver_facing', 'adas_02_road_facing',
      'vw100ip_driver_facing_ip', 'sd_card_1tb', 'sd_card_2tb', 'sd_card_480gb', 'sd_card_256gb',
      'sd_card_512gb', 'sd_card_250gb', 'mic', 'speaker', 'pfk_main_unit', 'pfk_corpconnect_sim_number',
      'pfk_corpconnect_data_number', 'breathaloc', 'pfk_road_facing', 'pfk_driver_facing', 'pfk_dome_1',
      'pfk_dome_2', 'pfk_5m', 'pfk_10m', 'pfk_15m', 'pfk_20m', 'roller_door_switches'
    ];
    
    // Get installed equipment (grouped and single)
    const installedEquipment = vehicle ? (() => {
      const equipment = [];
      
      // Process grouped equipment (serial_number + ip pairs)
      equipmentGroups.forEach(group => {
        const serialField = `${group.base}_serial_number`;
        const ipField = `${group.base}_ip`;
        const hasSerial = vehicle[serialField] && vehicle[serialField].toString().trim() !== '';
        const hasIp = vehicle[ipField] && vehicle[ipField].toString().trim() !== '';
        
        if (hasSerial || hasIp) {
          const values = [];
          if (hasSerial) values.push(`S/N: ${vehicle[serialField]}`);
          if (hasIp) values.push(`IP: ${vehicle[ipField]}`);
          
          equipment.push({
            id: `${group.base}-${vehicle.id}`,
            fieldName: group.base,
            name: group.name,
            value: values.join(', '),
            description: `De-installation of ${group.name} - ${values.join(', ')}`,
            type: "HARDWARE",
            category: "EQUIPMENT",
            de_installation_price: 500,
            code: group.base.toUpperCase(),
            vehicleId: vehicle.id,
            vehiclePlate: vehicle.fleet_number || vehicle.reg || 'Unknown'
          });
        }
      });
      
      // Process single field equipment
      singleFields.forEach(field => {
        if (vehicle[field] && vehicle[field].toString().trim() !== '') {
          equipment.push({
            id: `${field}-${vehicle.id}`,
            fieldName: field,
            name: field.replace(/_/g, ' ').replace(/^_/, '').toUpperCase(),
            value: vehicle[field],
            description: `De-installation of ${field.replace(/_/g, ' ')} - Value: ${vehicle[field]}`,
            type: "HARDWARE",
            category: "EQUIPMENT",
            de_installation_price: 500,
            code: field.toUpperCase(),
            vehicleId: vehicle.id,
            vehiclePlate: vehicle.fleet_number || vehicle.reg || 'Unknown'
          });
        }
      });
      
      return equipment;
    })() : [];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={backToVehicleSelection}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vehicles
          </Button>
          
          <Badge variant="outline" className="text-sm">
            {installedEquipment.length} items installed
          </Badge>
        </div>
        
        {/* Vehicle Info */}
        <div className="bg-blue-50 p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">{vehicleName}</span>
            {vehicle && (
              <span className="text-blue-700 text-sm">
                {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
              </span>
            )}
          </div>
        </div>
        
        {/* List of installed equipment */}
        {installedEquipment.length > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Installed Equipment:</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Add all equipment to quote
                  installedEquipment.forEach(equipment => {
                    const isAlreadySelected = selectedProducts.some(p => p.id === equipment.id);
                    if (!isAlreadySelected) {
                      addProduct(equipment);
                    }
                  });
                }}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {installedEquipment.map((equipment) => {
                const isSelected = selectedProducts.some(p => p.id === equipment.id);
                return (
                  <div key={equipment.id} className={`flex justify-between items-start p-3 border rounded-lg transition-colors ${
                    isSelected ? 'bg-green-50 border-green-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{equipment.name}</div>
                      <div className="text-gray-600 text-xs mt-1">
                        <span className="font-medium">Details:</span> {equipment.value}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addProduct(equipment)}
                      disabled={isSelected}
                      className={`text-xs ${
                        isSelected 
                          ? 'bg-green-600 text-white cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-500 w-5 h-5" />
              <div>
                <h4 className="font-medium text-yellow-800">No equipment found</h4>
                <p className="text-yellow-700 text-sm">This vehicle has no registered equipment in the system.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

export default DeinstallationFlow;