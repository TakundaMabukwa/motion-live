"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const EquipmentCatalog = () => {
  const [hardwareItems, setHardwareItems] = useState([
    { code: 'HW1', rental: false, type: 'Speq Asset Tracker', product: 'Transaction Unit with Accelerometer and 4g modem for Trailers', price: 4693, quantity: 1, total: 4693, discount: 0, totalAfter: 4693, rentalPrice: 121, totalRental: 121, installation: 250, subscription: 29 },
    { code: 'HW2', rental: false, type: 'Speq Asset Tracker', product: 'Transaction Unit with Accelerometer and 4g modem for Trailers', price: 4693, quantity: 1, total: 4693, discount: 0, totalAfter: 4693, rentalPrice: 121, totalRental: 121, installation: 250, subscription: 29 },
    { code: 'HW3', rental: false, type: 'Speq Asset Tracker', product: 'Transaction Unit with Accelerometer and 4g modem for Trailers', price: 4693, quantity: 1, total: 4693, discount: 0, totalAfter: 4693, rentalPrice: 121, totalRental: 121, installation: 250, subscription: 29 },
    { code: 'HW4', rental: false, type: 'Speq Asset UBI', product: 'Transaction Unit with Accelerometer and 4g modem', price: 4134, quantity: 1, total: 4134, discount: 0, totalAfter: 4134, rentalPrice: 121, totalRental: 121, installation: 250, subscription: 29 },
    { code: 'HW5', rental: false, type: 'Speq Asset Micro/Mini', product: 'Transaction Unit with Accelerometer and 4g modem (Motorcycle)', price: 4786, quantity: 1, total: 4786, discount: 0, totalAfter: 4786, rentalPrice: 162, totalRental: 162, installation: 250, subscription: 29 },
    { code: 'HW6', rental: false, type: 'Backup Unit', product: 'Wireless GPS/LMN AVL device unit', price: 679, quantity: 1, total: 679, discount: 0, totalAfter: 679, rentalPrice: 35, totalRental: 35, installation: 250, subscription: 14.50 },
  ]);

  const [moduleItems, setModuleItems] = useState([
    { code: 'MOD01', rental: false, type: 'Dash Cam', product: 'Camera Integration', price: 1011, quantity: 1, total: 1011, discount: 0, totalAfter: 1011, rentalPrice: 40, totalRental: 40, installation: 0, subscription: 0 },
    { code: 'MOD02', rental: false, type: 'Dash Cam', product: 'Exterior integrated with Speq Pro only', price: 1011, quantity: 1, total: 1011, discount: 0, totalAfter: 1011, rentalPrice: 40, totalRental: 40, installation: 0, subscription: 0 },
    { code: 'MOD03', rental: false, type: 'Dash Cam Optional', product: 'Camera linked with Speq Pro only', price: 482, quantity: 1, total: 482, discount: 0, totalAfter: 482, rentalPrice: 27, totalRental: 27, installation: 150, subscription: 0 },
    { code: 'MOD04', rental: false, type: 'Driver ID 3v Dash Cam', product: 'Dash Cam (Bumper IR panel with Speq Pro only)', price: 295, quantity: 1, total: 295, discount: 0, totalAfter: 295, rentalPrice: 34, totalRental: 34, installation: 150, subscription: 0 },
    { code: 'MOD05', rental: false, type: 'Driver ID 3v Dash Cam', product: 'Tag for Driver ID cards with Speq Pro only', price: 295, quantity: 1, total: 295, discount: 0, totalAfter: 295, rentalPrice: 34, totalRental: 34, installation: 0, subscription: 0 },
  ]);

  const [inputItems, setInputItems] = useState([
    { code: 'INP1', rental: false, type: 'PTG Integration', product: 'PIV Integration', price: 199, quantity: 1, total: 199, discount: 0, totalAfter: 199, rentalPrice: 0, totalRental: 0, installation: 150, subscription: 0 },
    { code: 'INP2', rental: false, type: 'Duo Tangled', product: 'Two Speed Cable', price: 199, quantity: 1, total: 199, discount: 0, totalAfter: 199, rentalPrice: 0, totalRental: 0, installation: 150, subscription: 0 },
    { code: 'INP3', rental: false, type: 'Panic Button/Hotsheet', product: 'Panic Button', price: 345, quantity: 1, total: 345, discount: 0, totalAfter: 345, rentalPrice: 14, totalRental: 14, installation: 150, subscription: 0 },
  ]);

  const [optionalServices, setOptionalServices] = useState([
    { code: 'SRV01', type: 'Extra Bundle Tracking', description: 'Extra Bundle Tracking', quantity: 1, subscription: 0 },
    { code: 'SRV02', type: 'Control Room - Fire', description: 'Monitoring of Fire Unit Alarms only', quantity: 1, subscription: 150 },
    { code: 'SRV03', type: 'Control Room - Superior', description: 'Live On-Screen Monitoring - Includes the previous srv', quantity: 1, subscription: 199 },
    { code: 'SRV04', type: 'Fire', description: 'Fire', quantity: 1, subscription: 75 },
    { code: 'SRV05', type: 'Management and Consultant', description: 'Management and Consultant', quantity: 1, subscription: 75 },
  ]);

  const [pfkCameras, setPfkCameras] = useState([
    { code: 'PFK1', rental: false, product: 'MEGATIVE/PFE', price: 11000, quantity: 1, rentalPrice: 332, installation: 450, subscription: 0 },
    { code: 'PFK2', rental: false, product: 'MEGATIVE COVERING STATION', price: 290, quantity: 1, rentalPrice: 0, installation: 0, subscription: 0 },
  ]);

  const [vuewoItems, setVuewoItems] = useState([
    { code: 'VUE1', rental: false, type: '4 Channel OVR Integration', product: '4 Channel OVR Integration', price: 3272, quantity: 1, total: 3272, discount: 0, totalAfter: 3272, rentalPrice: 89, totalRental: 89, installation: 1100, subscription: 29 },
    { code: 'VUE2', rental: false, type: 'Dua Camera', product: '2 Channel Camera Input', price: 2743, quantity: 1, total: 2743, discount: 0, totalAfter: 2743, rentalPrice: 75, totalRental: 75, installation: 550, subscription: 29 },
    { code: 'VUE3', rental: false, type: 'Dua Camera', product: '4 channel complete with 4 cameras and cables + TB Card', price: 11896, quantity: 1, total: 11896, discount: 0, totalAfter: 11896, rentalPrice: 321, totalRental: 321, installation: 1100, subscription: 29 },
    { code: 'VUE4', rental: false, type: 'Dua Camera', product: 'Single Camera', price: 3864, quantity: 1, total: 3864, discount: 0, totalAfter: 3864, rentalPrice: 105, totalRental: 105, installation: 550, subscription: 16 },
  ]);

  const [dashcamItems, setDashcamItems] = useState([
    { code: 'DASH1', rental: false, type: 'Road Facing Camera', product: 'Road Facing Camera', price: 1232, quantity: 1, total: 1232, discount: 0, totalAfter: 1232, rentalPrice: 33, totalRental: 33, installation: 0, subscription: 29 },
    { code: 'DASH2', rental: false, type: 'Driver in-cab Camera', product: 'Driver in-cab Camera', price: 1376, quantity: 1, total: 1376, discount: 0, totalAfter: 1376, rentalPrice: 37, totalRental: 37, installation: 0, subscription: 29 },
    { code: 'DASH3', rental: false, type: '32 TB Storage', product: '32GB to Memory Card', price: 1731, quantity: 1, total: 1731, discount: 0, totalAfter: 1731, rentalPrice: 46, totalRental: 46, installation: 0, subscription: 0 },
  ]);

  const [aiDashcamItems, setAiDashcamItems] = useState([
    { code: 'AI1', rental: false, type: 'AI Camera', product: 'Tx One Camera System', price: 1867, quantity: 1, total: 1867, discount: 0, totalAfter: 1867, rentalPrice: 51, totalRental: 51, installation: 1100, subscription: 29 },
  ]);

  const [aiMovementItems, setAiMovementItems] = useState([
    { code: 'AI-MOV1', rental: false, type: 'AI Camera', product: 'HD Alarm', price: 2176, quantity: 1, total: 2176, discount: 0, totalAfter: 2176, rentalPrice: 59, totalRental: 59, installation: 250, subscription: 29 },
  ]);

  const [ptiRadioItems, setPtiRadioItems] = useState([
    { code: 'PTI1', rental: false, type: 'Say Talk Mobile', product: 'Portable PTT Radio Entry Level', price: 4977, quantity: 1, total: 4977, discount: 0, totalAfter: 4977, rentalPrice: 135, totalRental: 135, installation: 1500, subscription: 149 },
    { code: 'PTI2', rental: false, type: 'Say Talk Tablet', product: 'Portable PTT Radio with vehicle docking Station', price: 6542, quantity: 1, total: 6542, discount: 0, totalAfter: 6542, rentalPrice: 135, totalRental: 135, installation: 1500, subscription: 149 },
    { code: 'PTI3', rental: false, type: 'Say Talk Mobile', product: 'Mobile PTT Radio for Vehicles', price: 4461, quantity: 1, total: 4461, discount: 0, totalAfter: 4461, rentalPrice: 135, totalRental: 135, installation: 1500, subscription: 149 },
    { code: 'PTI4', rental: false, type: 'Say Talk Mobile UHF', product: 'Mobile PTT Radio with UHF and POC Calling', price: 8720, quantity: 1, total: 8720, discount: 0, totalAfter: 8720, rentalPrice: 135, totalRental: 135, installation: 1500, subscription: 149 },
    { code: 'PTI5', rental: false, type: 'Say Talk Handset', product: 'Handset PTT Radio', price: 3456, quantity: 1, total: 3456, discount: 0, totalAfter: 3456, rentalPrice: 135, totalRental: 135, installation: 1500, subscription: 149 },
  ]);

  const updateItemField = (items: any[], setItems: any, index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate totals when price, quantity, or discount changes
    if (field === 'price' || field === 'quantity' || field === 'discount') {
      const item = updatedItems[index];
      const total = (item.price || 0) * (item.quantity || 1);
      const totalAfter = total - (item.discount || 0);
      updatedItems[index] = { 
        ...updatedItems[index], 
        total, 
        totalAfter,
        totalRental: (item.rentalPrice || 0) * (item.quantity || 1)
      };
    }
    
    // Auto-calculate rental total when rental price or quantity changes
    if (field === 'rentalPrice' || field === 'quantity') {
      const item = updatedItems[index];
      updatedItems[index] = { 
        ...updatedItems[index], 
        totalRental: (item.rentalPrice || 0) * (item.quantity || 1)
      };
    }
    
    setItems(updatedItems);
  };

  const EditableCell = ({ value, onChange, type = "number", className = "" }: { value: any, onChange: (value: any) => void, type?: string, className?: string }) => (
    <Input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
      className={`h-8 text-xs text-center border-0 bg-transparent hover:bg-gray-50 focus:bg-white focus:border-blue-200 ${className}`}
      step={type === 'number' ? '0.01' : undefined}
    />
  );

  const renderTable = (items: any[], setItems: any, title: string, showAllColumns = true) => (
    <Card className="shadow-lg mb-8 border-0">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="font-bold text-blue-900 text-lg text-center uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TYPE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRODUCT</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DESCRIPTION</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRICE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                {showAllColumns && (
                  <>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DISCOUNT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">INSTALLATION</TableHead>
                    <TableHead className="font-bold text-xs text-center">SUBSCRIPTION</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                  <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                  <TableCell className="border-gray-200 border-r text-center">
                    <Checkbox 
                      checked={item.rental} 
                      onCheckedChange={(checked) => updateItemField(items, setItems, index, 'rental', checked)}
                    />
                  </TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.description || item.product}</TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.price} 
                      onChange={(value) => updateItemField(items, setItems, index, 'price', value)}
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.quantity} 
                      onChange={(value) => updateItemField(items, setItems, index, 'quantity', value)}
                    />
                  </TableCell>
                  {showAllColumns && (
                    <>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.total?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.discount} 
                          onChange={(value) => updateItemField(items, setItems, index, 'discount', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalAfter?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.rentalPrice} 
                          onChange={(value) => updateItemField(items, setItems, index, 'rentalPrice', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalRental?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.installation} 
                          onChange={(value) => updateItemField(items, setItems, index, 'installation', value)}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <EditableCell 
                          value={item.subscription} 
                          onChange={(value) => updateItemField(items, setItems, index, 'subscription', value)}
                        />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-gray-50 p-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderOptionalServicesTable = () => (
    <Card className="shadow-lg mb-8 border-0">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="font-bold text-blue-900 text-lg text-center uppercase tracking-wide">OPTIONAL SERVICES</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">%</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TYPE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">SERVICES</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DESCRIPTION</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                <TableHead className="font-bold text-xs text-center">MONTHLY SUBSCRIPTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionalServices.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                  <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                  <TableCell className="border-gray-200 border-r text-center">
                    <Checkbox />
                  </TableCell>
                  <TableCell className="border-gray-200 border-r text-xs text-center"></TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.description}</TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.quantity} 
                      onChange={(value) => updateItemField(optionalServices, setOptionalServices, index, 'quantity', value)}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <EditableCell 
                      value={item.subscription} 
                      onChange={(value) => updateItemField(optionalServices, setOptionalServices, index, 'subscription', value)}
                      className="font-medium"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-gray-50 p-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSimplifiedTable = (items: any[], setItems: any, title: string, headerColor = "bg-blue-50") => (
    <Card className="shadow-lg mb-8 border-0">
      <CardHeader className={`${headerColor} border-b`}>
        <CardTitle className="font-bold text-blue-900 text-lg text-center uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRODUCT</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRICE</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                <TableHead className="border-gray-300 border-r font-bold text-xs text-center">INSTALLATION</TableHead>
                <TableHead className="font-bold text-xs text-center">SUBSCRIPTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                  <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                  <TableCell className="border-gray-200 border-r text-center">
                    <Checkbox 
                      checked={item.rental} 
                      onCheckedChange={(checked) => updateItemField(items, setItems, index, 'rental', checked)}
                    />
                  </TableCell>
                  <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.price} 
                      onChange={(value) => updateItemField(items, setItems, index, 'price', value)}
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.quantity} 
                      onChange={(value) => updateItemField(items, setItems, index, 'quantity', value)}
                    />
                  </TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.rentalPrice} 
                      onChange={(value) => updateItemField(items, setItems, index, 'rentalPrice', value)}
                    />
                  </TableCell>
                  <TableCell className="p-1 border-gray-200 border-r">
                    <EditableCell 
                      value={item.installation} 
                      onChange={(value) => updateItemField(items, setItems, index, 'installation', value)}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <EditableCell 
                      value={item.subscription} 
                      onChange={(value) => updateItemField(items, setItems, index, 'subscription', value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-gray-50 p-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 min-h-screen">
      <div className="space-y-8 mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-gray-900 text-4xl">Equipment Catalog</h1>
          <p className="text-gray-600 text-lg">Comprehensive inventory and pricing system</p>
        </div>

        {renderTable(hardwareItems, setHardwareItems, "HARDWARE")}
        {renderTable(moduleItems, setModuleItems, "MODULES")}
        {renderTable(inputItems, setInputItems, "INPUTS")}
        {renderOptionalServicesTable()}
        {renderSimplifiedTable(pfkCameras, setPfkCameras, "PFK CAMERAS - CAMERA EQUIPMENT")}
        {renderTable(vuewoItems, setVuewoItems, "VUEWO - CAMERA EQUIPMENT")}
        {renderTable(dashcamItems, setDashcamItems, "DASHCAM - CAMERA EQUIPMENT")}

        {/* AI DMS Camera Equipment Section */}
        <Card className="shadow-lg mb-8 border-0">
          <CardHeader className="bg-red-50 border-red-200 border-b">
            <CardTitle className="font-bold text-red-900 text-lg text-center uppercase tracking-wide">AI DASHCAM - AI DMS CAMERA EQUIPMENT</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TYPE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRODUCT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DESCRIPTION</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRICE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DISCOUNT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">INSTALLATION</TableHead>
                    <TableHead className="font-bold text-xs text-center">SUBSCRIPTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiDashcamItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                      <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                      <TableCell className="border-gray-200 border-r text-center">
                        <Checkbox 
                          checked={item.rental} 
                          onCheckedChange={(checked) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'rental', checked)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">AI One Camera System</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.price} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'price', value)}
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.quantity} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'quantity', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.total?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.discount} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'discount', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalAfter?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.rentalPrice} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'rentalPrice', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalRental?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.installation} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'installation', value)}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <EditableCell 
                          value={item.subscription} 
                          onChange={(value) => updateItemField(aiDashcamItems, setAiDashcamItems, index, 'subscription', value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="bg-gray-50 p-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Movement Detection Section */}
        <Card className="shadow-lg mb-8 border-0">
          <CardHeader className="bg-purple-50 border-purple-200 border-b">
            <CardTitle className="font-bold text-purple-900 text-lg text-center uppercase tracking-wide">DASHCAM - AI MOVEMENT DETECTION</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TYPE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRODUCT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DESCRIPTION</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRICE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DISCOUNT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">INSTALLATION</TableHead>
                    <TableHead className="font-bold text-xs text-center">SUBSCRIPTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiMovementItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                      <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                      <TableCell className="border-gray-200 border-r text-center">
                        <Checkbox 
                          checked={item.rental} 
                          onCheckedChange={(checked) => updateItemField(aiMovementItems, setAiMovementItems, index, 'rental', checked)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">Audible and Visual HD Alarm</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.price} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'price', value)}
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.quantity} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'quantity', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.total?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.discount} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'discount', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalAfter?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.rentalPrice} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'rentalPrice', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalRental?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.installation} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'installation', value)}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <EditableCell 
                          value={item.subscription} 
                          onChange={(value) => updateItemField(aiMovementItems, setAiMovementItems, index, 'subscription', value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="bg-gray-50 p-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PTI RADIOS Section */}
        <Card className="shadow-lg mb-8 border-0">
          <CardHeader className="bg-orange-50 border-orange-200 border-b">
            <CardTitle className="font-bold text-orange-900 text-lg text-center uppercase tracking-wide">PTI RADIOS - PTI RADIOS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-100 border-gray-300 border-b-2">
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">CODE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TYPE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRODUCT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DESCRIPTION</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">PRICE</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">QUANTITY</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">DISCOUNT</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">TOTAL RENTAL</TableHead>
                    <TableHead className="border-gray-300 border-r font-bold text-xs text-center">INSTALLATION</TableHead>
                    <TableHead className="font-bold text-xs text-center">SUBSCRIPTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ptiRadioItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 border-gray-200 border-b">
                      <TableCell className="border-gray-200 border-r text-xs text-center">{item.code}</TableCell>
                      <TableCell className="border-gray-200 border-r text-center">
                        <Checkbox 
                          checked={item.rental} 
                          onCheckedChange={(checked) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'rental', checked)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.type}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                      <TableCell className="border-gray-200 border-r text-xs">{item.product}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.price} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'price', value)}
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.quantity} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'quantity', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.total?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.discount} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'discount', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalAfter?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.rentalPrice} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'rentalPrice', value)}
                        />
                      </TableCell>
                      <TableCell className="border-gray-200 border-r font-medium text-xs text-center">${item.totalRental?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="p-1 border-gray-200 border-r">
                        <EditableCell 
                          value={item.installation} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'installation', value)}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <EditableCell 
                          value={item.subscription} 
                          onChange={(value) => updateItemField(ptiRadioItems, setPtiRadioItems, index, 'subscription', value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="bg-gray-50 p-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="py-8 text-center">
          <p className="text-gray-600">Equipment catalog system with comprehensive inventory management</p>
        </div>
      </div>
    </div>
  );
};

export default EquipmentCatalog;