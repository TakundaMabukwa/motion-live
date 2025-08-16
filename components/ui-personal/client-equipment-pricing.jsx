"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Save,
  X,
  Plus,
  Calculator,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function ClientEquipmentPricing({ accountNumber }) {
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Sample data - in a real app, this would come from an API
  const sampleData = [
    {
      id: 1,
      percentageDiscount: 10,
      itemDescription: "GPS Tracking Device",
      numberOfUnits: 5,
      costPerUnit: 150.00,
      costTotal: 750.00
    },
    {
      id: 2,
      percentageDiscount: 15,
      itemDescription: "Camera Module",
      numberOfUnits: 3,
      costPerUnit: 200.00,
      costTotal: 600.00
    },
    {
      id: 3,
      percentageDiscount: 5,
      itemDescription: "Installation Kit",
      numberOfUnits: 8,
      costPerUnit: 75.00,
      costTotal: 600.00
    }
  ];

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setEquipmentItems(sampleData);
      setLoading(false);
    }, 500);
  }, []);

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditForm({
      percentageDiscount: item.percentageDiscount,
      numberOfUnits: item.numberOfUnits,
      costPerUnit: item.costPerUnit
    });
  };

  const handleSave = (itemId) => {
    const updatedItems = equipmentItems.map(item => {
      if (item.id === itemId) {
        const numberOfUnits = parseFloat(editForm.numberOfUnits) || 0;
        const costPerUnit = parseFloat(editForm.costPerUnit) || 0;
        const percentageDiscount = parseFloat(editForm.percentageDiscount) || 0;
        
        // Calculate new total with discount
        const subtotal = numberOfUnits * costPerUnit;
        const discountAmount = (subtotal * percentageDiscount) / 100;
        const costTotal = subtotal - discountAmount;

        return {
          ...item,
          percentageDiscount,
          numberOfUnits,
          costPerUnit,
          costTotal: parseFloat(costTotal.toFixed(2))
        };
      }
      return item;
    });

    setEquipmentItems(updatedItems);
    setEditingItem(null);
    setEditForm({});
    toast.success('Equipment pricing updated successfully!');
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addNewItem = () => {
    const newItem = {
      id: Date.now(),
      percentageDiscount: 0,
      itemDescription: "New Equipment Item",
      numberOfUnits: 1,
      costPerUnit: 0.00,
      costTotal: 0.00
    };
    setEquipmentItems(prev => [...prev, newItem]);
    toast.success('New equipment item added!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <p className="text-gray-600">Loading equipment pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-xl">Client Equipment Pricing</h2>
          <p className="text-gray-600 text-sm">
            {accountNumber ? `Pricing for Account ${accountNumber}` : 'Equipment pricing configuration'}
          </p>
        </div>
        <Button 
          onClick={addNewItem}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 w-4 h-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Equipment Pricing Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Percentage Discount (%)</TableHead>
                  <TableHead>Item Description</TableHead>
                  <TableHead>No. of Units</TableHead>
                  <TableHead>Cost per Unit (R)</TableHead>
                  <TableHead>Cost Total (R)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {editingItem === item.id ? (
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editForm.percentageDiscount}
                            onChange={(e) => handleInputChange('percentageDiscount', e.target.value)}
                            className="w-20"
                          />
                          <Label className="text-gray-500 text-xs">%</Label>
                        </div>
                      ) : (
                        <span className="font-medium">{item.percentageDiscount}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.itemDescription}</span>
                    </TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <Input
                          type="number"
                          min="1"
                          value={editForm.numberOfUnits}
                          onChange={(e) => handleInputChange('numberOfUnits', e.target.value)}
                          className="w-20"
                        />
                      ) : (
                        <span className="font-medium">{item.numberOfUnits}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.costPerUnit}
                            onChange={(e) => handleInputChange('costPerUnit', e.target.value)}
                            className="w-24"
                          />
                          <Label className="text-gray-500 text-xs">R</Label>
                        </div>
                      ) : (
                        <span className="font-medium">R {item.costPerUnit.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-blue-600">
                        R {item.costTotal.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {editingItem === item.id ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="mr-1 w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {equipmentItems.length === 0 && (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No equipment items</h3>
              <p className="text-gray-500">Add equipment items to configure pricing.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="font-bold text-blue-600 text-2xl">
                {equipmentItems.length}
              </div>
              <div className="text-gray-600 text-sm">Total Items</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="font-bold text-green-600 text-2xl">
                R {equipmentItems.reduce((sum, item) => sum + item.costTotal, 0).toFixed(2)}
              </div>
              <div className="text-gray-600 text-sm">Total Value</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="font-bold text-orange-600 text-2xl">
                {equipmentItems.reduce((sum, item) => sum + item.numberOfUnits, 0)}
              </div>
              <div className="text-gray-600 text-sm">Total Units</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

