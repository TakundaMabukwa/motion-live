"use client";

import { useState } from "react";
import EnhancedCustomerDetails from "@/components/ui-personal/EnhancedCustomerDetails";

export default function TestEnhancedCustomerDetails() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
  });

  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [selectedVehiclesDeinstall, setSelectedVehiclesDeinstall] = useState([]);

  // Mock account info for testing
  const mockAccountInfo = {
    new_account_number: "ACEA-0001",
    company: "Test Company",
    email: "test@company.com",
    landline_no: "0123456789",
    address: "123 Test Street, Test City"
  };

  const handleVehiclesSelected = (vehicles) => {
    setSelectedVehicles(vehicles);
    console.log("Selected vehicles (regular):", vehicles);
  };

  const handleVehiclesSelectedDeinstall = (vehicles) => {
    setSelectedVehiclesDeinstall(vehicles);
    console.log("Selected vehicles (de-install):", vehicles);
  };

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">
            Enhanced Customer Details Test
          </h1>
          <p className="text-gray-600">
            This page demonstrates the enhanced customer details component with vehicle selection from the vehicles_ip table.
          </p>
        </div>

        <div className="gap-8 grid grid-cols-1 lg:grid-cols-2">
          {/* Regular Mode */}
          <div>
            <h2 className="mb-4 font-semibold text-gray-900 text-xl">
              Regular Mode (Installation/Repair)
            </h2>
            <EnhancedCustomerDetails
              formData={formData}
              setFormData={setFormData}
              accountInfo={mockAccountInfo}
              onVehiclesSelected={handleVehiclesSelected}
              isDeinstall={false}
            />
          </div>

          {/* De-installation Mode */}
          <div>
            <h2 className="mb-4 font-semibold text-gray-900 text-xl">
              De-installation Mode
            </h2>
            <EnhancedCustomerDetails
              formData={formData}
              setFormData={setFormData}
              accountInfo={mockAccountInfo}
              onVehiclesSelected={handleVehiclesSelectedDeinstall}
              isDeinstall={true}
            />
          </div>
        </div>

        {/* Results Display */}
        <div className="gap-8 grid grid-cols-1 lg:grid-cols-2 mt-8">
          {/* Regular Mode Results */}
          <div>
            <h3 className="mb-3 font-medium text-gray-900 text-lg">
              Regular Mode - Selected Vehicles
            </h3>
            <div className="bg-white shadow p-4 rounded-lg">
              {selectedVehicles.length === 0 ? (
                <div className="py-4 text-gray-500 text-center">
                  No vehicles selected yet
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-gray-50 p-2 border border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {vehicle.group_name || 'Unknown Vehicle'}
                          {vehicle.ip_address && ` (${vehicle.ip_address})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* De-installation Mode Results */}
          <div>
            <h3 className="mb-3 font-medium text-gray-900 text-lg">
              De-installation Mode - Selected Vehicles
            </h3>
            <div className="bg-white shadow p-4 rounded-lg">
              {selectedVehiclesDeinstall.length === 0 ? (
                <div className="py-4 text-gray-500 text-center">
                  No vehicles selected yet
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedVehiclesDeinstall.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-gray-50 px-3 py-1.5 border border-gray-200 rounded text-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {vehicle.group_name || 'Unknown Vehicle'}
                          {vehicle.ip_address && ` (${vehicle.ip_address})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Data Display */}
        <div className="mt-8">
          <h3 className="mb-3 font-medium text-gray-900 text-lg">
            Form Data
          </h3>
          <div className="bg-white shadow p-4 rounded-lg">
            <pre className="overflow-auto text-gray-700 text-sm">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 mt-8 p-6 border border-blue-200 rounded-lg">
          <h3 className="mb-3 font-medium text-blue-900 text-lg">
            How to Use
          </h3>
          <div className="space-y-2 text-blue-800">
            <p>
              • <strong>Regular Mode:</strong> Shows vehicle selection cards for installation/repair jobs
            </p>
            <p>
              • <strong>De-installation Mode:</strong> Shows dropdown select for vehicle selection with add/remove functionality
            </p>
            <p>
              • Both modes automatically fetch vehicles from the vehicles_ip table based on the account number
            </p>
            <p>
              • De-installation mode hides the vehicle information section and uses a compact dropdown interface
            </p>
            <p>
              • Selected vehicles are displayed in a list below the selection interface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
