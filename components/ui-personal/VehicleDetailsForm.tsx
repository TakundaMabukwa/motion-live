
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function VehicleDetailsForm({ vehicles, onVehiclesChange }) {
  const [newVehicle, setNewVehicle] = useState({
    registration: "",
    make: "",
    model: "",
  });

  const handleAddVehicle = () => {
    if (newVehicle.registration && newVehicle.make && newVehicle.model) {
      onVehiclesChange([...vehicles, newVehicle]);
      setNewVehicle({ registration: "", make: "", model: "" });
    }
  };

  const handleRemoveVehicle = (index) => {
    const updatedVehicles = vehicles.filter((_, i) => i !== index);
    onVehiclesChange(updatedVehicles);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVehicle((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Vehicle Details</CardTitle>
      </CardHeader>
      <CardContent>
        {vehicles.map((vehicle, index) => (
          <div key={index} className="flex items-center gap-4 mb-4">
            <Input value={vehicle.registration} readOnly className="bg-gray-100" />
            <Input value={vehicle.make} readOnly className="bg-gray-100" />
            <Input value={vehicle.model} readOnly className="bg-gray-100" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveVehicle(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-end gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="registration">Registration</Label>
            <Input
              type="text"
              id="registration"
              name="registration"
              placeholder="Registration"
              value={newVehicle.registration}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="make">Make</Label>
            <Input
              type="text"
              id="make"
              name="make"
              placeholder="Make"
              value={newVehicle.make}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              type="text"
              id="model"
              name="model"
              placeholder="Model"
              value={newVehicle.model}
              onChange={handleInputChange}
            />
          </div>
          <Button onClick={handleAddVehicle}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
