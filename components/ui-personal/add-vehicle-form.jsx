"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddVehicleForm({ companyName, onVehicleAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Vehicle Information
    registration_number: "",
    engine_number: "",
    vin_number: "",
    make: "",
    model: "",
    sub_model: "",
    manufactured_year: new Date().getFullYear(),
    vehicle_type: "",
    registration_date: "",
    license_expiry_date: "",
    purchase_price: "",
    retail_price: "",
    vehicle_priority: "",
    fuel_type: "",
    transmission_type: "",
    tank_capacity: "",
    register_number: "",
    take_on_kilometers: "",
    service_intervals_km: "",
    boarding_km: "",
    date_expected_boarding: "",
    color: "",
    length_meters: "",
    width_meters: "",
    height_meters: "",
    volume: "",
    tare_weight: "",
    gross_weight: "",
    trailer_count: "",
    trailer_type: "",
    
    // Service Plan
    has_service_plan: false,
    is_factory_service_plan: false,
    is_aftermarket_service_plan: false,
    service_provider: "",
    service_plan_km: "",
    service_plan_interval_km: "",
    service_plan_start_date: "",
    service_plan_end_date: "",
    
    // Maintenance Plan
    has_maintenance_plan: false,
    is_factory_maintenance_plan: false,
    is_aftermarket_maintenance_plan: false,
    maintenance_provider: "",
    maintenance_plan_km: "",
    maintenance_plan_interval_km: "",
    maintenance_plan_start_date: "",
    maintenance_plan_end_date: "",
    
    // Insurance
    has_insurance: false,
    insurance_policy_number: "",
    insurance_provider: "",
    insurance_document_url: "",
    
    // Tracking
    has_tracking: false,
    tracking_provider: "",
    tracking_document_url: "",
    
    // Bank/Card Information
    has_card: false,
    card_type: "",
    bank_name: "",
    card_number: "",
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

      const response = await fetch(`${baseUrl}/api/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          cost_centres: [companyName], // Replace with company name as requested
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add vehicle');
      }

      toast.success('Vehicle added successfully!');
      setIsOpen(false);
      setFormData({
        registration_number: "",
        engine_number: "",
        vin_number: "",
        make: "",
        model: "",
        sub_model: "",
        manufactured_year: new Date().getFullYear(),
        vehicle_type: "",
        registration_date: "",
        license_expiry_date: "",
        purchase_price: "",
        retail_price: "",
        vehicle_priority: "",
        fuel_type: "",
        transmission_type: "",
        tank_capacity: "",
        register_number: "",
        take_on_kilometers: "",
        service_intervals_km: "",
        boarding_km: "",
        date_expected_boarding: "",
        color: "",
        length_meters: "",
        width_meters: "",
        height_meters: "",
        volume: "",
        tare_weight: "",
        gross_weight: "",
        trailer_count: "",
        trailer_type: "",
        has_service_plan: false,
        is_factory_service_plan: false,
        is_aftermarket_service_plan: false,
        service_provider: "",
        service_plan_km: "",
        service_plan_interval_km: "",
        service_plan_start_date: "",
        service_plan_end_date: "",
        has_maintenance_plan: false,
        is_factory_maintenance_plan: false,
        is_aftermarket_maintenance_plan: false,
        maintenance_provider: "",
        maintenance_plan_km: "",
        maintenance_plan_interval_km: "",
        maintenance_plan_start_date: "",
        maintenance_plan_end_date: "",
        has_insurance: false,
        insurance_policy_number: "",
        insurance_provider: "",
        insurance_document_url: "",
        has_tracking: false,
        tracking_provider: "",
        tracking_document_url: "",
        has_card: false,
        card_type: "",
        bank_name: "",
        card_number: "",
      });

      if (onVehicleAdded) {
        onVehicleAdded();
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error(error.message || 'Failed to add vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[80vw] max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="vehicle" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="vehicle">Vehicle Info</TabsTrigger>
              <TabsTrigger value="service">Service Plan</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
              <TabsTrigger value="bank">Bank/Card</TabsTrigger>
            </TabsList>

            {/* Vehicle Information Tab */}
            <TabsContent value="vehicle" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number *</Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="engine_number">Engine Number *</Label>
                    <Input
                      id="engine_number"
                      value={formData.engine_number}
                      onChange={(e) => handleInputChange('engine_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vin_number">VIN Number *</Label>
                    <Input
                      id="vin_number"
                      value={formData.vin_number}
                      onChange={(e) => handleInputChange('vin_number', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub_model">Sub Model</Label>
                    <Input
                      id="sub_model"
                      value={formData.sub_model}
                      onChange={(e) => handleInputChange('sub_model', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufactured_year">Manufactured Year *</Label>
                    <Select value={formData.manufactured_year.toString()} onValueChange={(value) => handleInputChange('manufactured_year', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                    <Select value={formData.vehicle_type} onValueChange={(value) => handleInputChange('vehicle_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="trailer">Trailer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_date">Registration Date *</Label>
                    <Input
                      id="registration_date"
                      type="date"
                      value={formData.registration_date}
                      onChange={(e) => handleInputChange('registration_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_expiry_date">License Expiry Date *</Label>
                    <Input
                      id="license_expiry_date"
                      type="date"
                      value={formData.license_expiry_date}
                      onChange={(e) => handleInputChange('license_expiry_date', e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price">Purchase Price</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retail_price">Retail Price</Label>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      value={formData.retail_price}
                      onChange={(e) => handleInputChange('retail_price', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_priority">Vehicle Priority</Label>
                    <Select value={formData.vehicle_priority} onValueChange={(value) => handleInputChange('vehicle_priority', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Fuel Type *</Label>
                    <Select value={formData.fuel_type} onValueChange={(value) => handleInputChange('fuel_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="lpg">LPG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transmission_type">Transmission Type *</Label>
                    <Select value={formData.transmission_type} onValueChange={(value) => handleInputChange('transmission_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="cvt">CVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tank_capacity">Tank Capacity (L)</Label>
                    <Input
                      id="tank_capacity"
                      type="number"
                      step="0.1"
                      value={formData.tank_capacity}
                      onChange={(e) => handleInputChange('tank_capacity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color *</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_intervals_km">Service Intervals (KM) *</Label>
                    <Input
                      id="service_intervals_km"
                      type="number"
                      value={formData.service_intervals_km}
                      onChange={(e) => handleInputChange('service_intervals_km', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="take_on_kilometers">Take On Kilometers</Label>
                    <Input
                      id="take_on_kilometers"
                      type="number"
                      value={formData.take_on_kilometers}
                      onChange={(e) => handleInputChange('take_on_kilometers', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dimensions & Weight</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="length_meters">Length (m)</Label>
                    <Input
                      id="length_meters"
                      type="number"
                      step="0.01"
                      value={formData.length_meters}
                      onChange={(e) => handleInputChange('length_meters', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width_meters">Width (m)</Label>
                    <Input
                      id="width_meters"
                      type="number"
                      step="0.01"
                      value={formData.width_meters}
                      onChange={(e) => handleInputChange('width_meters', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height_meters">Height (m)</Label>
                    <Input
                      id="height_meters"
                      type="number"
                      step="0.01"
                      value={formData.height_meters}
                      onChange={(e) => handleInputChange('height_meters', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume (m³)</Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.01"
                      value={formData.volume}
                      onChange={(e) => handleInputChange('volume', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tare_weight">Tare Weight (kg)</Label>
                    <Input
                      id="tare_weight"
                      type="number"
                      step="0.1"
                      value={formData.tare_weight}
                      onChange={(e) => handleInputChange('tare_weight', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gross_weight">Gross Weight (kg)</Label>
                    <Input
                      id="gross_weight"
                      type="number"
                      step="0.1"
                      value={formData.gross_weight}
                      onChange={(e) => handleInputChange('gross_weight', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trailer Information</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trailer_count">Trailer Count</Label>
                    <Input
                      id="trailer_count"
                      type="number"
                      value={formData.trailer_count}
                      onChange={(e) => handleInputChange('trailer_count', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trailer_type">Trailer Type</Label>
                    <Input
                      id="trailer_type"
                      value={formData.trailer_type}
                      onChange={(e) => handleInputChange('trailer_type', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Plan Tab */}
            <TabsContent value="service" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Service Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_service_plan"
                      checked={formData.has_service_plan}
                      onCheckedChange={(checked) => handleInputChange('has_service_plan', checked)}
                    />
                    <Label htmlFor="has_service_plan">Has Service Plan</Label>
                  </div>
                  
                  {formData.has_service_plan && (
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_factory_service_plan"
                          checked={formData.is_factory_service_plan}
                          onCheckedChange={(checked) => handleInputChange('is_factory_service_plan', checked)}
                        />
                        <Label htmlFor="is_factory_service_plan">Factory Service Plan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_aftermarket_service_plan"
                          checked={formData.is_aftermarket_service_plan}
                          onCheckedChange={(checked) => handleInputChange('is_aftermarket_service_plan', checked)}
                        />
                        <Label htmlFor="is_aftermarket_service_plan">Aftermarket Service Plan</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_provider">Service Provider</Label>
                        <Input
                          id="service_provider"
                          value={formData.service_provider}
                          onChange={(e) => handleInputChange('service_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_plan_km">Service Plan KM</Label>
                        <Input
                          id="service_plan_km"
                          type="number"
                          value={formData.service_plan_km}
                          onChange={(e) => handleInputChange('service_plan_km', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_plan_interval_km">Service Plan Interval (KM)</Label>
                        <Input
                          id="service_plan_interval_km"
                          type="number"
                          value={formData.service_plan_interval_km}
                          onChange={(e) => handleInputChange('service_plan_interval_km', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_plan_start_date">Service Plan Start Date</Label>
                        <Input
                          id="service_plan_start_date"
                          type="date"
                          value={formData.service_plan_start_date}
                          onChange={(e) => handleInputChange('service_plan_start_date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_plan_end_date">Service Plan End Date</Label>
                        <Input
                          id="service_plan_end_date"
                          type="date"
                          value={formData.service_plan_end_date}
                          onChange={(e) => handleInputChange('service_plan_end_date', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Plan Tab */}
            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_maintenance_plan"
                      checked={formData.has_maintenance_plan}
                      onCheckedChange={(checked) => handleInputChange('has_maintenance_plan', checked)}
                    />
                    <Label htmlFor="has_maintenance_plan">Has Maintenance Plan</Label>
                  </div>
                  
                  {formData.has_maintenance_plan && (
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_factory_maintenance_plan"
                          checked={formData.is_factory_maintenance_plan}
                          onCheckedChange={(checked) => handleInputChange('is_factory_maintenance_plan', checked)}
                        />
                        <Label htmlFor="is_factory_maintenance_plan">Factory Maintenance Plan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_aftermarket_maintenance_plan"
                          checked={formData.is_aftermarket_maintenance_plan}
                          onCheckedChange={(checked) => handleInputChange('is_aftermarket_maintenance_plan', checked)}
                        />
                        <Label htmlFor="is_aftermarket_maintenance_plan">Aftermarket Maintenance Plan</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_provider">Maintenance Provider</Label>
                        <Input
                          id="maintenance_provider"
                          value={formData.maintenance_provider}
                          onChange={(e) => handleInputChange('maintenance_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_plan_km">Maintenance Plan KM</Label>
                        <Input
                          id="maintenance_plan_km"
                          type="number"
                          value={formData.maintenance_plan_km}
                          onChange={(e) => handleInputChange('maintenance_plan_km', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_plan_interval_km">Maintenance Plan Interval (KM)</Label>
                        <Input
                          id="maintenance_plan_interval_km"
                          type="number"
                          value={formData.maintenance_plan_interval_km}
                          onChange={(e) => handleInputChange('maintenance_plan_interval_km', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_plan_start_date">Maintenance Plan Start Date</Label>
                        <Input
                          id="maintenance_plan_start_date"
                          type="date"
                          value={formData.maintenance_plan_start_date}
                          onChange={(e) => handleInputChange('maintenance_plan_start_date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_plan_end_date">Maintenance Plan End Date</Label>
                        <Input
                          id="maintenance_plan_end_date"
                          type="date"
                          value={formData.maintenance_plan_end_date}
                          onChange={(e) => handleInputChange('maintenance_plan_end_date', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insurance Tab */}
            <TabsContent value="insurance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_insurance"
                      checked={formData.has_insurance}
                      onCheckedChange={(checked) => handleInputChange('has_insurance', checked)}
                    />
                    <Label htmlFor="has_insurance">Has Insurance</Label>
                  </div>
                  
                  {formData.has_insurance && (
                    <div className="gap-4 grid grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="insurance_policy_number">Insurance Policy Number</Label>
                        <Input
                          id="insurance_policy_number"
                          value={formData.insurance_policy_number}
                          onChange={(e) => handleInputChange('insurance_policy_number', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insurance_provider">Insurance Provider</Label>
                        <Input
                          id="insurance_provider"
                          value={formData.insurance_provider}
                          onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="insurance_document_url">Insurance Document URL</Label>
                        <Input
                          id="insurance_document_url"
                          type="url"
                          value={formData.insurance_document_url}
                          onChange={(e) => handleInputChange('insurance_document_url', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tracking Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_tracking"
                      checked={formData.has_tracking}
                      onCheckedChange={(checked) => handleInputChange('has_tracking', checked)}
                    />
                    <Label htmlFor="has_tracking">Has Tracking</Label>
                  </div>
                  
                  {formData.has_tracking && (
                    <div className="gap-4 grid grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tracking_provider">Tracking Provider</Label>
                        <Input
                          id="tracking_provider"
                          value={formData.tracking_provider}
                          onChange={(e) => handleInputChange('tracking_provider', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tracking_document_url">Tracking Document URL</Label>
                        <Input
                          id="tracking_document_url"
                          type="url"
                          value={formData.tracking_document_url}
                          onChange={(e) => handleInputChange('tracking_document_url', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bank/Card Tab */}
            <TabsContent value="bank" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bank/Card Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_card"
                      checked={formData.has_card}
                      onCheckedChange={(checked) => handleInputChange('has_card', checked)}
                    />
                    <Label htmlFor="has_card">Has Card</Label>
                  </div>
                  
                  {formData.has_card && (
                    <div className="gap-4 grid grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card_type">Card Type</Label>
                        <Select value={formData.card_type} onValueChange={(value) => handleInputChange('card_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select card type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit">Credit Card</SelectItem>
                            <SelectItem value="debit">Debit Card</SelectItem>
                            <SelectItem value="fuel">Fuel Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => handleInputChange('bank_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="card_number">Card Number</Label>
                        <Input
                          id="card_number"
                          value={formData.card_number}
                          onChange={(e) => handleInputChange('card_number', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Adding Vehicle...
                </>
              ) : (
                'Add Vehicle'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 