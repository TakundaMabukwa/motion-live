"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Car, 
  Wifi,
  Camera,
  HardDrive,
  Mic,
  Speaker,
  Shield,
  Settings,
  DollarSign,
  Calendar,
  Hash,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Vehicle } from '@/lib/actions/vehicles';

interface VehicleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  accountNumber: string;
}

type TabType = 'vehicle-info' | 'equipment' | 'finances';

export default function VehicleDetailsModal({ 
  isOpen, 
  onClose, 
  vehicle,
  accountNumber
}: VehicleDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('vehicle-info');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});

  useEffect(() => {
    if (isOpen && vehicle) {
      setFormData(vehicle);
    }
  }, [isOpen, vehicle]);

  const handleInputChange = (field: keyof Vehicle, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would implement the save functionality
      // For now, just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Vehicle data saved successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Error saving vehicle data:', error);
      toast.error('Failed to save vehicle data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'vehicle-info', label: 'Vehicle Info', icon: Car },
    { id: 'equipment', label: 'Equipment', icon: Settings },
    { id: 'finances', label: 'Finances', icon: null },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderVehicleInfoTab = () => (
    <div className="space-y-6">
      {/* Basic Vehicle Information */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <Car className="w-5 h-5 text-blue-600" />
          Vehicle Information
        </h3>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fleet_number">Fleet Number</Label>
            <Input
              id="fleet_number"
              value={formData.fleet_number || ''}
              onChange={(e) => handleInputChange('fleet_number', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg">Registration</Label>
            <Input
              id="reg"
              value={formData.reg || ''}
              onChange={(e) => handleInputChange('reg', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              value={formData.make || ''}
              onChange={(e) => handleInputChange('make', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model || ''}
              onChange={(e) => handleInputChange('model', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              value={formData.year || ''}
              onChange={(e) => handleInputChange('year', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colour">Color</Label>
            <Input
              id="colour"
              value={formData.colour || ''}
              onChange={(e) => handleInputChange('colour', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin || ''}
              onChange={(e) => handleInputChange('vin', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engine">Engine</Label>
            <Input
              id="engine"
              value={formData.engine || ''}
              onChange={(e) => handleInputChange('engine', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <Hash className="w-5 h-5 text-green-600" />
          Account Information
        </h3>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_account_number">Account Number</Label>
            <Input
              id="new_account_number"
              value={formData.new_account_number || ''}
              onChange={(e) => handleInputChange('new_account_number', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={formData.branch || ''}
              onChange={(e) => handleInputChange('branch', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unique_id">Unique ID</Label>
            <Input
              id="unique_id"
              value={formData.unique_id || ''}
              onChange={(e) => handleInputChange('unique_id', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <Calendar className="w-5 h-5 text-purple-600" />
          Timestamps
        </h3>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Created At</Label>
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              {vehicle.created_at ? formatDate(vehicle.created_at) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEquipmentTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <Settings className="w-5 h-5 text-blue-600" />
        Equipment
      </h3>
      
      {/* Trailer Unit */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Trailer Unit</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_trailer_unit_serial_number">Serial Number</Label>
            <Input
              id="skylink_trailer_unit_serial_number"
              value={formData.skylink_trailer_unit_serial_number || ''}
              onChange={(e) => handleInputChange('skylink_trailer_unit_serial_number', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_trailer_unit_ip">IP Address</Label>
            <Input
              id="skylink_trailer_unit_ip"
              value={formData.skylink_trailer_unit_ip || ''}
              onChange={(e) => handleInputChange('skylink_trailer_unit_ip', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
        </div>
      </div>

      {/* Battery Ignition Unit */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Battery Ignition Unit</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sky_on_batt_ign_unit_serial_number">Serial Number</Label>
            <Input
              id="sky_on_batt_ign_unit_serial_number"
              value={formData.sky_on_batt_ign_unit_serial_number || ''}
              onChange={(e) => handleInputChange('sky_on_batt_ign_unit_serial_number', e.target.value)}
              disabled={!editing}
              placeholder="Battery ignition serial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_on_batt_ign_unit_ip">IP Address</Label>
            <Input
              id="sky_on_batt_ign_unit_ip"
              value={formData.sky_on_batt_ign_unit_ip || ''}
              onChange={(e) => handleInputChange('sky_on_batt_ign_unit_ip', e.target.value)}
              disabled={!editing}
              placeholder="Battery ignition IP"
            />
          </div>
        </div>
      </div>

      {/* Voice Kit */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Voice Kit</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_voice_kit_serial_number">Serial Number</Label>
            <Input
              id="skylink_voice_kit_serial_number"
              value={formData.skylink_voice_kit_serial_number || ''}
              onChange={(e) => handleInputChange('skylink_voice_kit_serial_number', e.target.value)}
              disabled={!editing}
              placeholder="Voice kit serial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_voice_kit_ip">IP Address</Label>
            <Input
              id="skylink_voice_kit_ip"
              value={formData.skylink_voice_kit_ip || ''}
              onChange={(e) => handleInputChange('skylink_voice_kit_ip', e.target.value)}
              disabled={!editing}
              placeholder="Voice kit IP"
            />
          </div>
        </div>
      </div>

      {/* Scout Units */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Scout Units</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sky_scout_12v_serial_number">12V Scout Serial</Label>
            <Input
              id="sky_scout_12v_serial_number"
              value={formData.sky_scout_12v_serial_number || ''}
              onChange={(e) => handleInputChange('sky_scout_12v_serial_number', e.target.value)}
              disabled={!editing}
              placeholder="12V scout serial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_12v_ip">12V Scout IP</Label>
            <Input
              id="sky_scout_12v_ip"
              value={formData.sky_scout_12v_ip || ''}
              onChange={(e) => handleInputChange('sky_scout_12v_ip', e.target.value)}
              disabled={!editing}
              placeholder="12V scout IP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_24v_serial_number">24V Scout Serial</Label>
            <Input
              id="sky_scout_24v_serial_number"
              value={formData.sky_scout_24v_serial_number || ''}
              onChange={(e) => handleInputChange('sky_scout_24v_serial_number', e.target.value)}
              disabled={!editing}
              placeholder="24V scout serial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_24v_ip">24V Scout IP</Label>
            <Input
              id="sky_scout_24v_ip"
              value={formData.sky_scout_24v_ip || ''}
              onChange={(e) => handleInputChange('sky_scout_24v_ip', e.target.value)}
              disabled={!editing}
              placeholder="24V scout IP"
            />
          </div>
        </div>
      </div>

      {/* Pro Unit */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Pro Unit</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_pro_serial_number">Serial Number</Label>
            <Input
              id="skylink_pro_serial_number"
              value={formData.skylink_pro_serial_number || ''}
              onChange={(e) => handleInputChange('skylink_pro_serial_number', e.target.value)}
              disabled={!editing}
              placeholder="Pro unit serial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_pro_ip">IP Address</Label>
            <Input
              id="skylink_pro_ip"
              value={formData.skylink_pro_ip || ''}
              onChange={(e) => handleInputChange('skylink_pro_ip', e.target.value)}
              disabled={!editing}
              placeholder="Pro unit IP"
            />
          </div>
        </div>
      </div>

      {/* Communication */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Communication</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_sim_card_no">SIM Card Number</Label>
            <Input
              id="skylink_sim_card_no"
              value={formData.skylink_sim_card_no || ''}
              onChange={(e) => handleInputChange('skylink_sim_card_no', e.target.value)}
              disabled={!editing}
              placeholder="SIM card number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_data_number">Data Number</Label>
            <Input
              id="skylink_data_number"
              value={formData.skylink_data_number || ''}
              onChange={(e) => handleInputChange('skylink_data_number', e.target.value)}
              disabled={!editing}
              placeholder="Data number"
            />
          </div>
        </div>
      </div>

      {/* Safety & Security Devices */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Safety & Security Devices</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sky_safety">Sky Safety</Label>
            <Input
              id="sky_safety"
              value={formData.sky_safety || ''}
              onChange={(e) => handleInputChange('sky_safety', e.target.value)}
              disabled={!editing}
              placeholder="Sky safety device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_idata">Sky iData</Label>
            <Input
              id="sky_idata"
              value={formData.sky_idata || ''}
              onChange={(e) => handleInputChange('sky_idata', e.target.value)}
              disabled={!editing}
              placeholder="Sky iData device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_ican">Sky iCAN</Label>
            <Input
              id="sky_ican"
              value={formData.sky_ican || ''}
              onChange={(e) => handleInputChange('sky_ican', e.target.value)}
              disabled={!editing}
              placeholder="Sky iCAN device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industrial_panic">Industrial Panic</Label>
            <Input
              id="industrial_panic"
              value={formData.industrial_panic || ''}
              onChange={(e) => handleInputChange('industrial_panic', e.target.value)}
              disabled={!editing}
              placeholder="Industrial panic button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flat_panic">Flat Panic</Label>
            <Input
              id="flat_panic"
              value={formData.flat_panic || ''}
              onChange={(e) => handleInputChange('flat_panic', e.target.value)}
              disabled={!editing}
              placeholder="Flat panic button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buzzer">Buzzer</Label>
            <Input
              id="buzzer"
              value={formData.buzzer || ''}
              onChange={(e) => handleInputChange('buzzer', e.target.value)}
              disabled={!editing}
              placeholder="Buzzer device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="early_warning">Early Warning</Label>
            <Input
              id="early_warning"
              value={formData.early_warning || ''}
              onChange={(e) => handleInputChange('early_warning', e.target.value)}
              disabled={!editing}
              placeholder="Early warning system"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breathaloc">Breathaloc</Label>
            <Input
              id="breathaloc"
              value={formData.breathaloc || ''}
              onChange={(e) => handleInputChange('breathaloc', e.target.value)}
              disabled={!editing}
              placeholder="Breathaloc device"
            />
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Access Control</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tag">Tag</Label>
            <Input
              id="tag"
              value={formData.tag || ''}
              onChange={(e) => handleInputChange('tag', e.target.value)}
              disabled={!editing}
              placeholder="Tag device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag_reader">Tag Reader</Label>
            <Input
              id="tag_reader"
              value={formData.tag_reader || ''}
              onChange={(e) => handleInputChange('tag_reader', e.target.value)}
              disabled={!editing}
              placeholder="Tag reader device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keypad">Keypad</Label>
            <Input
              id="keypad"
              value={formData.keypad || ''}
              onChange={(e) => handleInputChange('keypad', e.target.value)}
              disabled={!editing}
              placeholder="Keypad device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keypad_waterproof">Waterproof Keypad</Label>
            <Input
              id="keypad_waterproof"
              value={formData.keypad_waterproof || ''}
              onChange={(e) => handleInputChange('keypad_waterproof', e.target.value)}
              disabled={!editing}
              placeholder="Waterproof keypad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag_">Tag (Alt)</Label>
            <Input
              id="tag_"
              value={formData.tag_ || ''}
              onChange={(e) => handleInputChange('tag_', e.target.value)}
              disabled={!editing}
              placeholder="Alternative tag"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag_reader_">Tag Reader (Alt)</Label>
            <Input
              id="tag_reader_"
              value={formData.tag_reader_ || ''}
              onChange={(e) => handleInputChange('tag_reader_', e.target.value)}
              disabled={!editing}
              placeholder="Alternative tag reader"
            />
          </div>
        </div>
      </div>

      {/* Communication & Monitoring */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Communication & Monitoring</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cia">CIA</Label>
            <Input
              id="cia"
              value={formData.cia || ''}
              onChange={(e) => handleInputChange('cia', e.target.value)}
              disabled={!editing}
              placeholder="CIA device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fm_unit">FM Unit</Label>
            <Input
              id="fm_unit"
              value={formData.fm_unit || ''}
              onChange={(e) => handleInputChange('fm_unit', e.target.value)}
              disabled={!editing}
              placeholder="FM unit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim_card_number">SIM Card Number</Label>
            <Input
              id="sim_card_number"
              value={formData.sim_card_number || ''}
              onChange={(e) => handleInputChange('sim_card_number', e.target.value)}
              disabled={!editing}
              placeholder="SIM card number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_number">Data Number</Label>
            <Input
              id="data_number"
              value={formData.data_number || ''}
              onChange={(e) => handleInputChange('data_number', e.target.value)}
              disabled={!editing}
              placeholder="Data number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gps">GPS</Label>
            <Input
              id="gps"
              value={formData.gps || ''}
              onChange={(e) => handleInputChange('gps', e.target.value)}
              disabled={!editing}
              placeholder="GPS device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gsm">GSM</Label>
            <Input
              id="gsm"
              value={formData.gsm || ''}
              onChange={(e) => handleInputChange('gsm', e.target.value)}
              disabled={!editing}
              placeholder="GSM device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="main_fm_harness">Main FM Harness</Label>
            <Input
              id="main_fm_harness"
              value={formData.main_fm_harness || ''}
              onChange={(e) => handleInputChange('main_fm_harness', e.target.value)}
              disabled={!editing}
              placeholder="Main FM harness"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idata">iData</Label>
            <Input
              id="idata"
              value={formData.idata || ''}
              onChange={(e) => handleInputChange('idata', e.target.value)}
              disabled={!editing}
              placeholder="iData device"
            />
          </div>
        </div>
      </div>

      {/* Beame Devices */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Beame Devices</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="beame_1">Beame 1</Label>
            <Input
              id="beame_1"
              value={formData.beame_1 || ''}
              onChange={(e) => handleInputChange('beame_1', e.target.value)}
              disabled={!editing}
              placeholder="Beame device 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beame_2">Beame 2</Label>
            <Input
              id="beame_2"
              value={formData.beame_2 || ''}
              onChange={(e) => handleInputChange('beame_2', e.target.value)}
              disabled={!editing}
              placeholder="Beame device 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beame_3">Beame 3</Label>
            <Input
              id="beame_3"
              value={formData.beame_3 || ''}
              onChange={(e) => handleInputChange('beame_3', e.target.value)}
              disabled={!editing}
              placeholder="Beame device 3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beame_4">Beame 4</Label>
            <Input
              id="beame_4"
              value={formData.beame_4 || ''}
              onChange={(e) => handleInputChange('beame_4', e.target.value)}
              disabled={!editing}
              placeholder="Beame device 4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beame_5">Beame 5</Label>
            <Input
              id="beame_5"
              value={formData.beame_5 || ''}
              onChange={(e) => handleInputChange('beame_5', e.target.value)}
              disabled={!editing}
              placeholder="Beame device 5"
            />
          </div>
        </div>
      </div>

      {/* Fuel Monitoring */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Fuel Monitoring</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fuel_probe_1">Fuel Probe 1</Label>
            <Input
              id="fuel_probe_1"
              value={formData.fuel_probe_1 || ''}
              onChange={(e) => handleInputChange('fuel_probe_1', e.target.value)}
              disabled={!editing}
              placeholder="Fuel probe 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel_probe_2">Fuel Probe 2</Label>
            <Input
              id="fuel_probe_2"
              value={formData.fuel_probe_2 || ''}
              onChange={(e) => handleInputChange('fuel_probe_2', e.target.value)}
              disabled={!editing}
              placeholder="Fuel probe 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_7m_harness_for_probe">7m Harness for Probe</Label>
            <Input
              id="_7m_harness_for_probe"
              value={formData._7m_harness_for_probe || ''}
              onChange={(e) => handleInputChange('_7m_harness_for_probe', e.target.value)}
              disabled={!editing}
              placeholder="7m harness for probe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpiece">T-Piece</Label>
            <Input
              id="tpiece"
              value={formData.tpiece || ''}
              onChange={(e) => handleInputChange('tpiece', e.target.value)}
              disabled={!editing}
              placeholder="T-piece connector"
            />
          </div>
        </div>
      </div>

      {/* Cables & Extensions */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Cables & Extensions</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="_1m_extension_cable">1m Extension Cable</Label>
            <Input
              id="_1m_extension_cable"
              value={formData._1m_extension_cable || ''}
              onChange={(e) => handleInputChange('_1m_extension_cable', e.target.value)}
              disabled={!editing}
              placeholder="1m extension cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_3m_extension_cable">3m Extension Cable</Label>
            <Input
              id="_3m_extension_cable"
              value={formData._3m_extension_cable || ''}
              onChange={(e) => handleInputChange('_3m_extension_cable', e.target.value)}
              disabled={!editing}
              placeholder="3m extension cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_5m_cable_for_camera_4pin">5m Cable for Camera 4pin</Label>
            <Input
              id="_5m_cable_for_camera_4pin"
              value={formData._5m_cable_for_camera_4pin || ''}
              onChange={(e) => handleInputChange('_5m_cable_for_camera_4pin', e.target.value)}
              disabled={!editing}
              placeholder="5m cable for camera 4pin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_5m_cable_6pin">5m Cable 6pin</Label>
            <Input
              id="_5m_cable_6pin"
              value={formData._5m_cable_6pin || ''}
              onChange={(e) => handleInputChange('_5m_cable_6pin', e.target.value)}
              disabled={!editing}
              placeholder="5m cable 6pin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_10m_cable_for_camera_4pin">10m Cable for Camera 4pin</Label>
            <Input
              id="_10m_cable_for_camera_4pin"
              value={formData._10m_cable_for_camera_4pin || ''}
              onChange={(e) => handleInputChange('_10m_cable_for_camera_4pin', e.target.value)}
              disabled={!editing}
              placeholder="10m cable for camera 4pin"
            />
          </div>
        </div>
      </div>

      {/* DVR Systems */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">DVR Systems</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="_4ch_mdvr">4CH MDVR</Label>
            <Input
              id="_4ch_mdvr"
              value={formData._4ch_mdvr || ''}
              onChange={(e) => handleInputChange('_4ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="4 channel MDVR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_5ch_mdvr">5CH MDVR</Label>
            <Input
              id="_5ch_mdvr"
              value={formData._5ch_mdvr || ''}
              onChange={(e) => handleInputChange('_5ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="5 channel MDVR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_8ch_mdvr">8CH MDVR</Label>
            <Input
              id="_8ch_mdvr"
              value={formData._8ch_mdvr || ''}
              onChange={(e) => handleInputChange('_8ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="8 channel MDVR"
            />
          </div>
        </div>
      </div>

      {/* Dash Cameras */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Dash Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="a2_dash_cam">A2 Dash Cam</Label>
            <Input
              id="a2_dash_cam"
              value={formData.a2_dash_cam || ''}
              onChange={(e) => handleInputChange('a2_dash_cam', e.target.value)}
              disabled={!editing}
              placeholder="A2 dash cam"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a3_dash_cam_ai">A3 Dash Cam AI</Label>
            <Input
              id="a3_dash_cam_ai"
              value={formData.a3_dash_cam_ai || ''}
              onChange={(e) => handleInputChange('a3_dash_cam_ai', e.target.value)}
              disabled={!editing}
              placeholder="A3 dash cam AI"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a2_mec_5">A2 MEC 5</Label>
            <Input
              id="a2_mec_5"
              value={formData.a2_mec_5 || ''}
              onChange={(e) => handleInputChange('a2_mec_5', e.target.value)}
              disabled={!editing}
              placeholder="A2 MEC 5"
            />
          </div>
        </div>
      </div>

      {/* Dome Cameras */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Dome Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vw400_dome_1">VW400 Dome 1</Label>
            <Input
              id="vw400_dome_1"
              value={formData.vw400_dome_1 || ''}
              onChange={(e) => handleInputChange('vw400_dome_1', e.target.value)}
              disabled={!editing}
              placeholder="VW400 dome camera 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw400_dome_2">VW400 Dome 2</Label>
            <Input
              id="vw400_dome_2"
              value={formData.vw400_dome_2 || ''}
              onChange={(e) => handleInputChange('vw400_dome_2', e.target.value)}
              disabled={!editing}
              placeholder="VW400 dome camera 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw300_dakkie_dome_1">VW300 Dakkie Dome 1</Label>
            <Input
              id="vw300_dakkie_dome_1"
              value={formData.vw300_dakkie_dome_1 || ''}
              onChange={(e) => handleInputChange('vw300_dakkie_dome_1', e.target.value)}
              disabled={!editing}
              placeholder="VW300 dakkie dome 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw300_dakkie_dome_2">VW300 Dakkie Dome 2</Label>
            <Input
              id="vw300_dakkie_dome_2"
              value={formData.vw300_dakkie_dome_2 || ''}
              onChange={(e) => handleInputChange('vw300_dakkie_dome_2', e.target.value)}
              disabled={!editing}
              placeholder="VW300 dakkie dome 2"
            />
          </div>
        </div>
      </div>

      {/* Specialized Cameras */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Specialized Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vw502_dual_lens_camera">VW502 Dual Lens</Label>
            <Input
              id="vw502_dual_lens_camera"
              value={formData.vw502_dual_lens_camera || ''}
              onChange={(e) => handleInputChange('vw502_dual_lens_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW502 dual lens camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw303_driver_facing_camera">VW303 Driver Facing</Label>
            <Input
              id="vw303_driver_facing_camera"
              value={formData.vw303_driver_facing_camera || ''}
              onChange={(e) => handleInputChange('vw303_driver_facing_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW303 driver facing camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw502f_road_facing_camera">VW502F Road Facing</Label>
            <Input
              id="vw502f_road_facing_camera"
              value={formData.vw502f_road_facing_camera || ''}
              onChange={(e) => handleInputChange('vw502f_road_facing_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW502F road facing camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw306_dvr_road_facing_for_4ch_8ch">VW306 DVR Road Facing</Label>
            <Input
              id="vw306_dvr_road_facing_for_4ch_8ch"
              value={formData.vw306_dvr_road_facing_for_4ch_8ch || ''}
              onChange={(e) => handleInputChange('vw306_dvr_road_facing_for_4ch_8ch', e.target.value)}
              disabled={!editing}
              placeholder="VW306 DVR road facing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw306m_a2_dash_cam">VW306M A2 Dash Cam</Label>
            <Input
              id="vw306m_a2_dash_cam"
              value={formData.vw306m_a2_dash_cam || ''}
              onChange={(e) => handleInputChange('vw306m_a2_dash_cam', e.target.value)}
              disabled={!editing}
              placeholder="VW306M A2 dash cam"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dms01_driver_facing">DMS01 Driver Facing</Label>
            <Input
              id="dms01_driver_facing"
              value={formData.dms01_driver_facing || ''}
              onChange={(e) => handleInputChange('dms01_driver_facing', e.target.value)}
              disabled={!editing}
              placeholder="DMS01 driver facing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adas_02_road_facing">ADAS02 Road Facing</Label>
            <Input
              id="adas_02_road_facing"
              value={formData.adas_02_road_facing || ''}
              onChange={(e) => handleInputChange('adas_02_road_facing', e.target.value)}
              disabled={!editing}
              placeholder="ADAS02 road facing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw100ip_driver_facing_ip">VW100IP Driver Facing</Label>
            <Input
              id="vw100ip_driver_facing_ip"
              value={formData.vw100ip_driver_facing_ip || ''}
              onChange={(e) => handleInputChange('vw100ip_driver_facing_ip', e.target.value)}
              disabled={!editing}
              placeholder="VW100IP driver facing IP"
            />
          </div>
        </div>
      </div>

      {/* Storage Devices */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Storage Devices</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sd_card_1tb">1TB SD Card</Label>
            <Input
              id="sd_card_1tb"
              value={formData.sd_card_1tb || ''}
              onChange={(e) => handleInputChange('sd_card_1tb', e.target.value)}
              disabled={!editing}
              placeholder="1TB SD card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_2tb">2TB SD Card</Label>
            <Input
              id="sd_card_2tb"
              value={formData.sd_card_2tb || ''}
              onChange={(e) => handleInputChange('sd_card_2tb', e.target.value)}
              disabled={!editing}
              placeholder="2TB SD card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_512gb">512GB SD Card</Label>
            <Input
              id="sd_card_512gb"
              value={formData.sd_card_512gb || ''}
              onChange={(e) => handleInputChange('sd_card_512gb', e.target.value)}
              disabled={!editing}
              placeholder="512GB SD card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_480gb">480GB SD Card</Label>
            <Input
              id="sd_card_480gb"
              value={formData.sd_card_480gb || ''}
              onChange={(e) => handleInputChange('sd_card_480gb', e.target.value)}
              disabled={!editing}
              placeholder="480GB SD card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_256gb">256GB SD Card</Label>
            <Input
              id="sd_card_256gb"
              value={formData.sd_card_256gb || ''}
              onChange={(e) => handleInputChange('sd_card_256gb', e.target.value)}
              disabled={!editing}
              placeholder="256GB SD card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_250gb">250GB SD Card</Label>
            <Input
              id="sd_card_250gb"
              value={formData.sd_card_250gb || ''}
              onChange={(e) => handleInputChange('sd_card_250gb', e.target.value)}
              disabled={!editing}
              placeholder="250GB SD card"
            />
          </div>
        </div>
      </div>

      {/* Audio Equipment */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Audio Equipment</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mic">Microphone</Label>
            <Input
              id="mic"
              value={formData.mic || ''}
              onChange={(e) => handleInputChange('mic', e.target.value)}
              disabled={!editing}
              placeholder="Microphone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="speaker">Speaker</Label>
            <Input
              id="speaker"
              value={formData.speaker || ''}
              onChange={(e) => handleInputChange('speaker', e.target.value)}
              disabled={!editing}
              placeholder="Speaker"
            />
          </div>
        </div>
      </div>

      {/* PFK Equipment */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">PFK Equipment</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pfk_main_unit">PFK Main Unit</Label>
            <Input
              id="pfk_main_unit"
              value={formData.pfk_main_unit || ''}
              onChange={(e) => handleInputChange('pfk_main_unit', e.target.value)}
              disabled={!editing}
              placeholder="PFK main unit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_corpconnect_sim_number">PFK CorpConnect SIM</Label>
            <Input
              id="pfk_corpconnect_sim_number"
              value={formData.pfk_corpconnect_sim_number || ''}
              onChange={(e) => handleInputChange('pfk_corpconnect_sim_number', e.target.value)}
              disabled={!editing}
              placeholder="PFK CorpConnect SIM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_corpconnect_data_number">PFK CorpConnect Data</Label>
            <Input
              id="pfk_corpconnect_data_number"
              value={formData.pfk_corpconnect_data_number || ''}
              onChange={(e) => handleInputChange('pfk_corpconnect_data_number', e.target.value)}
              disabled={!editing}
              placeholder="PFK CorpConnect data"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_road_facing">PFK Road Facing</Label>
            <Input
              id="pfk_road_facing"
              value={formData.pfk_road_facing || ''}
              onChange={(e) => handleInputChange('pfk_road_facing', e.target.value)}
              disabled={!editing}
              placeholder="PFK road facing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_driver_facing">PFK Driver Facing</Label>
            <Input
              id="pfk_driver_facing"
              value={formData.pfk_driver_facing || ''}
              onChange={(e) => handleInputChange('pfk_driver_facing', e.target.value)}
              disabled={!editing}
              placeholder="PFK driver facing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_dome_1">PFK Dome 1</Label>
            <Input
              id="pfk_dome_1"
              value={formData.pfk_dome_1 || ''}
              onChange={(e) => handleInputChange('pfk_dome_1', e.target.value)}
              disabled={!editing}
              placeholder="PFK dome 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_dome_2">PFK Dome 2</Label>
            <Input
              id="pfk_dome_2"
              value={formData.pfk_dome_2 || ''}
              onChange={(e) => handleInputChange('pfk_dome_2', e.target.value)}
              disabled={!editing}
              placeholder="PFK dome 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_5m">PFK 5m</Label>
            <Input
              id="pfk_5m"
              value={formData.pfk_5m || ''}
              onChange={(e) => handleInputChange('pfk_5m', e.target.value)}
              disabled={!editing}
              placeholder="PFK 5m cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_10m">PFK 10m</Label>
            <Input
              id="pfk_10m"
              value={formData.pfk_10m || ''}
              onChange={(e) => handleInputChange('pfk_10m', e.target.value)}
              disabled={!editing}
              placeholder="PFK 10m cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_15m">PFK 15m</Label>
            <Input
              id="pfk_15m"
              value={formData.pfk_15m || ''}
              onChange={(e) => handleInputChange('pfk_15m', e.target.value)}
              disabled={!editing}
              placeholder="PFK 15m cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfk_20m">PFK 20m</Label>
            <Input
              id="pfk_20m"
              value={formData.pfk_20m || ''}
              onChange={(e) => handleInputChange('pfk_20m', e.target.value)}
              disabled={!editing}
              placeholder="PFK 20m cable"
            />
          </div>
        </div>
      </div>

      {/* Additional Equipment */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Additional Equipment</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="corpconnect_sim_no">CorpConnect SIM</Label>
            <Input
              id="corpconnect_sim_no"
              value={formData.corpconnect_sim_no || ''}
              onChange={(e) => handleInputChange('corpconnect_sim_no', e.target.value)}
              disabled={!editing}
              placeholder="CorpConnect SIM number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corpconnect_data_no">CorpConnect Data</Label>
            <Input
              id="corpconnect_data_no"
              value={formData.corpconnect_data_no || ''}
              onChange={(e) => handleInputChange('corpconnect_data_no', e.target.value)}
              disabled={!editing}
              placeholder="CorpConnect data number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim_id">SIM ID</Label>
            <Input
              id="sim_id"
              value={formData.sim_id || ''}
              onChange={(e) => handleInputChange('sim_id', e.target.value)}
              disabled={!editing}
              placeholder="SIM ID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roller_door_switches">Roller Door Switches</Label>
            <Input
              id="roller_door_switches"
              value={formData.roller_door_switches || ''}
              onChange={(e) => handleInputChange('roller_door_switches', e.target.value)}
              disabled={!editing}
              placeholder="Roller door switches"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              value={formData.account_number || ''}
              onChange={(e) => handleInputChange('account_number', e.target.value)}
              disabled={!editing}
              placeholder=""
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCamerasTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <Camera className="w-5 h-5 text-blue-600" />
        Camera Systems
      </h3>
      
      {/* Dash Cams */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Dash Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="a2_dash_cam">A2 Dash Cam</Label>
            <Input
              id="a2_dash_cam"
              value={formData.a2_dash_cam || ''}
              onChange={(e) => handleInputChange('a2_dash_cam', e.target.value)}
              disabled={!editing}
              placeholder="A2 dash cam details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a3_dash_cam_ai">A3 Dash Cam AI</Label>
            <Input
              id="a3_dash_cam_ai"
              value={formData.a3_dash_cam_ai || ''}
              onChange={(e) => handleInputChange('a3_dash_cam_ai', e.target.value)}
              disabled={!editing}
              placeholder="A3 dash cam AI details"
            />
          </div>
        </div>
      </div>

      {/* Dome Cameras */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Dome Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vw400_dome_1">VW400 Dome 1</Label>
            <Input
              id="vw400_dome_1"
              value={formData.vw400_dome_1 || ''}
              onChange={(e) => handleInputChange('vw400_dome_1', e.target.value)}
              disabled={!editing}
              placeholder="VW400 dome camera 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw400_dome_2">VW400 Dome 2</Label>
            <Input
              id="vw400_dome_2"
              value={formData.vw400_dome_2 || ''}
              onChange={(e) => handleInputChange('vw400_dome_2', e.target.value)}
              disabled={!editing}
              placeholder="VW400 dome camera 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw300_dakkie_dome_1">VW300 Dakkie Dome 1</Label>
            <Input
              id="vw300_dakkie_dome_1"
              value={formData.vw300_dakkie_dome_1 || ''}
              onChange={(e) => handleInputChange('vw300_dakkie_dome_1', e.target.value)}
              disabled={!editing}
              placeholder="VW300 dakkie dome 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw300_dakkie_dome_2">VW300 Dakkie Dome 2</Label>
            <Input
              id="vw300_dakkie_dome_2"
              value={formData.vw300_dakkie_dome_2 || ''}
              onChange={(e) => handleInputChange('vw300_dakkie_dome_2', e.target.value)}
              disabled={!editing}
              placeholder="VW300 dakkie dome 2"
            />
          </div>
        </div>
      </div>

      {/* Specialized Cameras */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Specialized Cameras</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vw502_dual_lens_camera">VW502 Dual Lens</Label>
            <Input
              id="vw502_dual_lens_camera"
              value={formData.vw502_dual_lens_camera || ''}
              onChange={(e) => handleInputChange('vw502_dual_lens_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW502 dual lens camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw303_driver_facing_camera">VW303 Driver Facing</Label>
            <Input
              id="vw303_driver_facing_camera"
              value={formData.vw303_driver_facing_camera || ''}
              onChange={(e) => handleInputChange('vw303_driver_facing_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW303 driver facing camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw502f_road_facing_camera">VW502F Road Facing</Label>
            <Input
              id="vw502f_road_facing_camera"
              value={formData.vw502f_road_facing_camera || ''}
              onChange={(e) => handleInputChange('vw502f_road_facing_camera', e.target.value)}
              disabled={!editing}
              placeholder="VW502F road facing camera"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vw100ip_driver_facing_ip">VW100IP Driver Facing</Label>
            <Input
              id="vw100ip_driver_facing_ip"
              value={formData.vw100ip_driver_facing_ip || ''}
              onChange={(e) => handleInputChange('vw100ip_driver_facing_ip', e.target.value)}
              disabled={!editing}
              placeholder="VW100IP driver facing IP"
            />
          </div>
        </div>
      </div>

      {/* DVR Systems */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">DVR Systems</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="_4ch_mdvr">4CH MDVR</Label>
            <Input
              id="_4ch_mdvr"
              value={formData._4ch_mdvr || ''}
              onChange={(e) => handleInputChange('_4ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="4 channel MDVR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_5ch_mdvr">5CH MDVR</Label>
            <Input
              id="_5ch_mdvr"
              value={formData._5ch_mdvr || ''}
              onChange={(e) => handleInputChange('_5ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="5 channel MDVR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="_8ch_mdvr">8CH MDVR</Label>
            <Input
              id="_8ch_mdvr"
              value={formData._8ch_mdvr || ''}
              onChange={(e) => handleInputChange('_8ch_mdvr', e.target.value)}
              disabled={!editing}
              placeholder="8 channel MDVR"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorageTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <HardDrive className="w-5 h-5 text-blue-600" />
        Storage Devices
      </h3>
      
      {/* SD Cards */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">SD Cards</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sd_card_1tb">1TB SD Card</Label>
            <Input
              id="sd_card_1tb"
              value={formData.sd_card_1tb || ''}
              onChange={(e) => handleInputChange('sd_card_1tb', e.target.value)}
              disabled={!editing}
              placeholder="1TB SD card details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_2tb">2TB SD Card</Label>
            <Input
              id="sd_card_2tb"
              value={formData.sd_card_2tb || ''}
              onChange={(e) => handleInputChange('sd_card_2tb', e.target.value)}
              disabled={!editing}
              placeholder="2TB SD card details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_512gb">512GB SD Card</Label>
            <Input
              id="sd_card_512gb"
              value={formData.sd_card_512gb || ''}
              onChange={(e) => handleInputChange('sd_card_512gb', e.target.value)}
              disabled={!editing}
              placeholder="512GB SD card details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_480gb">480GB SD Card</Label>
            <Input
              id="sd_card_480gb"
              value={formData.sd_card_480gb || ''}
              onChange={(e) => handleInputChange('sd_card_480gb', e.target.value)}
              disabled={!editing}
              placeholder="480GB SD card details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_256gb">256GB SD Card</Label>
            <Input
              id="sd_card_256gb"
              value={formData.sd_card_256gb || ''}
              onChange={(e) => handleInputChange('sd_card_256gb', e.target.value)}
              disabled={!editing}
              placeholder="256GB SD card details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sd_card_250gb">250GB SD Card</Label>
            <Input
              id="sd_card_250gb"
              value={formData.sd_card_250gb || ''}
              onChange={(e) => handleInputChange('sd_card_250gb', e.target.value)}
              disabled={!editing}
              placeholder="250GB SD card details"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAudioTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <Mic className="w-5 h-5 text-blue-600" />
        Audio Equipment
      </h3>
      
      {/* Audio Devices */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Audio Devices</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mic">Microphone</Label>
            <Input
              id="mic"
              value={formData.mic || ''}
              onChange={(e) => handleInputChange('mic', e.target.value)}
              disabled={!editing}
              placeholder="Microphone details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="speaker">Speaker</Label>
            <Input
              id="speaker"
              value={formData.speaker || ''}
              onChange={(e) => handleInputChange('speaker', e.target.value)}
              disabled={!editing}
              placeholder="Speaker details"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSafetyTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <Shield className="w-5 h-5 text-blue-600" />
        Safety Equipment
      </h3>
      
      {/* Safety Devices */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Safety Devices</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sky_safety">Sky Safety</Label>
            <Input
              id="sky_safety"
              value={formData.sky_safety || ''}
              onChange={(e) => handleInputChange('sky_safety', e.target.value)}
              disabled={!editing}
              placeholder="Sky safety device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industrial_panic">Industrial Panic</Label>
            <Input
              id="industrial_panic"
              value={formData.industrial_panic || ''}
              onChange={(e) => handleInputChange('industrial_panic', e.target.value)}
              disabled={!editing}
              placeholder="Industrial panic button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flat_panic">Flat Panic</Label>
            <Input
              id="flat_panic"
              value={formData.flat_panic || ''}
              onChange={(e) => handleInputChange('flat_panic', e.target.value)}
              disabled={!editing}
              placeholder="Flat panic button"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buzzer">Buzzer</Label>
            <Input
              id="buzzer"
              value={formData.buzzer || ''}
              onChange={(e) => handleInputChange('buzzer', e.target.value)}
              disabled={!editing}
              placeholder="Buzzer device"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="early_warning">Early Warning</Label>
            <Input
              id="early_warning"
              value={formData.early_warning || ''}
              onChange={(e) => handleInputChange('early_warning', e.target.value)}
              disabled={!editing}
              placeholder="Early warning system"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breathaloc">Breathaloc</Label>
            <Input
              id="breathaloc"
              value={formData.breathaloc || ''}
              onChange={(e) => handleInputChange('breathaloc', e.target.value)}
              disabled={!editing}
              placeholder="Breathaloc device"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancesTab = () => (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <span className="flex justify-center items-center w-5 h-5 font-bold text-blue-600 text-lg">R</span>
        Financial Information
      </h3>
      
      {/* Total Costs */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Total Costs</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="total_rental">Total Rental</Label>
            <Input
              id="total_rental"
              type="number"
              value={formData.total_rental || ''}
              onChange={(e) => handleInputChange('total_rental', parseFloat(e.target.value) || 0)}
              disabled={!editing}
              placeholder="Total rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_sub">Total Subscription</Label>
            <Input
              id="total_sub"
              type="number"
              value={formData.total_sub || ''}
              onChange={(e) => handleInputChange('total_sub', parseFloat(e.target.value) || 0)}
              disabled={!editing}
              placeholder="Total subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_rental_sub">Total Rental + Subscription</Label>
            <Input
              id="total_rental_sub"
              type="number"
              value={formData.total_rental_sub || ''}
              onChange={(e) => handleInputChange('total_rental_sub', parseFloat(e.target.value) || 0)}
              disabled={!editing}
              placeholder="Combined total cost"
            />
          </div>
        </div>
      </div>

      {/* Service Costs */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Service Costs</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="consultancy">Consultancy</Label>
            <Input
              id="consultancy"
              value={formData.consultancy || ''}
              onChange={(e) => handleInputChange('consultancy', e.target.value)}
              disabled={!editing}
              placeholder="Consultancy costs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roaming">Roaming</Label>
            <Input
              id="roaming"
              value={formData.roaming || ''}
              onChange={(e) => handleInputChange('roaming', e.target.value)}
              disabled={!editing}
              placeholder="Roaming costs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance">Maintenance</Label>
            <Input
              id="maintenance"
              value={formData.maintenance || ''}
              onChange={(e) => handleInputChange('maintenance', e.target.value)}
              disabled={!editing}
              placeholder="Maintenance costs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="after_hours">After Hours</Label>
            <Input
              id="after_hours"
              value={formData.after_hours || ''}
              onChange={(e) => handleInputChange('after_hours', e.target.value)}
              disabled={!editing}
              placeholder="After hours costs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="controlroom">Control Room</Label>
            <Input
              id="controlroom"
              value={formData.controlroom || ''}
              onChange={(e) => handleInputChange('controlroom', e.target.value)}
              disabled={!editing}
              placeholder="Control room costs"
            />
          </div>
        </div>
      </div>

      {/* Rental Costs */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Rental Costs</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_trailer_unit_rental">Skylink Trailer Unit Rental</Label>
            <Input
              id="skylink_trailer_unit_rental"
              value={formData.skylink_trailer_unit_rental || ''}
              onChange={(e) => handleInputChange('skylink_trailer_unit_rental', e.target.value)}
              disabled={!editing}
              placeholder="Trailer unit rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_on_batt_ign_rental">Sky On Batt Ignition Rental</Label>
            <Input
              id="sky_on_batt_ign_rental"
              value={formData.sky_on_batt_ign_rental || ''}
              onChange={(e) => handleInputChange('sky_on_batt_ign_rental', e.target.value)}
              disabled={!editing}
              placeholder="Battery ignition rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_voice_kit_rental">Skylink Voice Kit Rental</Label>
            <Input
              id="skylink_voice_kit_rental"
              value={formData.skylink_voice_kit_rental || ''}
              onChange={(e) => handleInputChange('skylink_voice_kit_rental', e.target.value)}
              disabled={!editing}
              placeholder="Voice kit rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_12v_rental">Sky Scout 12V Rental</Label>
            <Input
              id="sky_scout_12v_rental"
              value={formData.sky_scout_12v_rental || ''}
              onChange={(e) => handleInputChange('sky_scout_12v_rental', e.target.value)}
              disabled={!editing}
              placeholder="12V scout rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_24v_rental">Sky Scout 24V Rental</Label>
            <Input
              id="sky_scout_24v_rental"
              value={formData.sky_scout_24v_rental || ''}
              onChange={(e) => handleInputChange('sky_scout_24v_rental', e.target.value)}
              disabled={!editing}
              placeholder="24V scout rental cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_pro_rental">Skylink Pro Rental</Label>
            <Input
              id="skylink_pro_rental"
              value={formData.skylink_pro_rental || ''}
              onChange={(e) => handleInputChange('skylink_pro_rental', e.target.value)}
              disabled={!editing}
              placeholder="Pro unit rental cost"
            />
          </div>
        </div>
      </div>

      {/* Subscription Costs */}
      <div className="space-y-4">
        <h4 className="font-medium text-md">Subscription Costs</h4>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skylink_trailer_sub">Skylink Trailer Subscription</Label>
            <Input
              id="skylink_trailer_sub"
              value={formData.skylink_trailer_sub || ''}
              onChange={(e) => handleInputChange('skylink_trailer_sub', e.target.value)}
              disabled={!editing}
              placeholder="Trailer subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_on_batt_sub">Sky On Batt Subscription</Label>
            <Input
              id="sky_on_batt_sub"
              value={formData.sky_on_batt_sub || ''}
              onChange={(e) => handleInputChange('sky_on_batt_sub', e.target.value)}
              disabled={!editing}
              placeholder="Battery ignition subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_voice_kit_sub">Skylink Voice Kit Subscription</Label>
            <Input
              id="skylink_voice_kit_sub"
              value={formData.skylink_voice_kit_sub || ''}
              onChange={(e) => handleInputChange('skylink_voice_kit_sub', e.target.value)}
              disabled={!editing}
              placeholder="Voice kit subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_12v_sub">Sky Scout 12V Subscription</Label>
            <Input
              id="sky_scout_12v_sub"
              value={formData.sky_scout_12v_sub || ''}
              onChange={(e) => handleInputChange('sky_scout_12v_sub', e.target.value)}
              disabled={!editing}
              placeholder="12V scout subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sky_scout_24v_sub">Sky Scout 24V Subscription</Label>
            <Input
              id="sky_scout_24v_sub"
              value={formData.sky_scout_24v_sub || ''}
              onChange={(e) => handleInputChange('sky_scout_24v_sub', e.target.value)}
              disabled={!editing}
              placeholder="24V scout subscription cost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skylink_pro_sub">Skylink Pro Subscription</Label>
            <Input
              id="skylink_pro_sub"
              value={formData.skylink_pro_sub || ''}
              onChange={(e) => handleInputChange('skylink_pro_sub', e.target.value)}
              disabled={!editing}
              placeholder="Pro unit subscription cost"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'vehicle-info':
        return renderVehicleInfoTab();
      case 'equipment':
        return renderEquipmentTab();
      case 'finances':
        return renderFinancesTab();
      default:
        return renderVehicleInfoTab();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="flex flex-col bg-white shadow-xl m-4 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4 border-b">
          <div className="flex items-center space-x-3">
            <Car className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle className="text-xl">Vehicle Details</CardTitle>
              <p className="text-gray-600 text-sm">
                {vehicle.fleet_number || vehicle.reg || `Vehicle ${vehicle.id}`} | {vehicle.company || 'Unknown Company'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.id === 'finances' ? (
                    <span className="flex justify-center items-center w-4 h-4 font-bold text-xs">R</span>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </CardContent>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 bg-gray-50 p-6 border-t">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFormData(vehicle); // Reset form data
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Vehicle
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
