'use client';

import React, { useState } from 'react';
import VehicleVerificationForm from '@/components/ui-personal/vehicle-verification-form';
import { getPhotoDisplayUrl, formatPhotoTimestamp } from '@/lib/photo-utils';

// Sample job data for testing - NO vehicle registration (manual mode)
const sampleJobDataManual = {
  job_number: "TEST-JOB-1754616856245-elb2hdkwd",
  customer_name: "Test Customer",
  customer_address: "123 Test Street, Test City",
  vehicle_registration: "", // Empty for testing manual mode
  job_type: "installation",
  job_description: "Test installation job for inventory testing",
  ip_address: "78.89",
  assigned_parts: [
    {
      description: "10 METER 4 PIN AVIATION CABLE",
      quantity: 1,
      code: "VW-EC-10",
      supplier: "VUEWO",
      cost_per_unit: 95.5,
      total_cost: 95.5
    },
    {
      description: "SKY - EXTERNAL GPS",
      quantity: 1,
      code: "PR08",
      supplier: "ITURAN",
      cost_per_unit: 229.2,
      total_cost: 229.2
    }
  ],
  assigned_date: "2025-08-08T01:36:18.115Z",
  assigned_by: "00000000-0000-0000-0000-000000000000",
  total_parts: 2,
  total_cost: 324.7
};

// Sample job data for testing - WITH vehicle registration (scan mode)
const sampleJobDataScan = {
  job_number: "TEST-JOB-1754616856246-scanmode",
  customer_name: "Test Customer 2",
  customer_address: "456 Test Avenue, Test City",
  vehicle_registration: "ABC123GP", // Has registration for testing scan mode
  job_type: "deinstall",
  job_description: "Test deinstallation job for inventory testing",
  ip_address: "192.168.1.100",
  assigned_parts: [
    {
      description: "GPS TRACKER REMOVAL KIT",
      quantity: 1,
      code: "GPS-RM-001",
      supplier: "TRACKER",
      cost_per_unit: 150.0,
      total_cost: 150.0
    }
  ],
  assigned_date: "2025-08-08T01:36:18.115Z",
  assigned_by: "00000000-0000-0000-0000-000000000000",
  total_parts: 1,
  total_cost: 150.0
};

export default function TestVehicleVerificationPage() {
  const [showForm, setShowForm] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selectedJobData, setSelectedJobData] = useState<any>(null);

  const handleVerificationComplete = (vehicleData: any) => {
    setVerificationResult(vehicleData);
    setShowForm(false);
    console.log('Verification completed:', vehicleData);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const startVerification = (jobData: any) => {
    setSelectedJobData(jobData);
    setShowForm(true);
    setVerificationResult(null);
  };

  return (
    <div className="bg-gray-50 py-8 min-h-screen">
      <div className="mx-auto px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">
            Vehicle Verification Test
          </h1>
          <p className="text-gray-600">
            Test the vehicle verification form with different scenarios
          </p>
        </div>

        {!showForm && !verificationResult && (
          <div className="gap-6 grid md:grid-cols-2 mx-auto max-w-4xl">
            {/* Manual Mode Test */}
            <div className="bg-white shadow-md p-6 rounded-lg">
              <h2 className="mb-4 font-semibold text-gray-900 text-xl">
                Manual Entry Mode
              </h2>
              <p className="mb-4 text-gray-600">
                Test when vehicle_registration is empty - opens manual entry form
              </p>
              <div className="space-y-2 mb-4 text-gray-700 text-sm">
                <p><strong>Job:</strong> {sampleJobDataManual.job_number}</p>
                <p><strong>Type:</strong> {sampleJobDataManual.job_type}</p>
                <p><strong>Vehicle:</strong> <span className="text-red-600">No registration</span></p>
              </div>
              <button
                onClick={() => startVerification(sampleJobDataManual)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full text-white transition-colors"
              >
                Test Manual Entry
              </button>
            </div>

            {/* Scan Mode Test */}
            <div className="bg-white shadow-md p-6 rounded-lg">
              <h2 className="mb-4 font-semibold text-gray-900 text-xl">
                VIN Scan Mode
              </h2>
              <p className="mb-4 text-gray-600">
                Test when vehicle_registration exists - opens VIN scanner
              </p>
              <div className="space-y-2 mb-4 text-gray-700 text-sm">
                <p><strong>Job:</strong> {sampleJobDataScan.job_number}</p>
                <p><strong>Type:</strong> {sampleJobDataScan.job_type}</p>
                <p><strong>Vehicle:</strong> <span className="text-green-600">{sampleJobDataScan.vehicle_registration}</span></p>
              </div>
              <button
                onClick={() => startVerification(sampleJobDataScan)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full text-white transition-colors"
              >
                Test VIN Scanner
              </button>
            </div>
          </div>
        )}

        {showForm && selectedJobData && (
          <VehicleVerificationForm
            jobData={selectedJobData}
            onVerificationComplete={handleVerificationComplete}
            onCancel={handleCancel}
          />
        )}

        {verificationResult && (
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="mb-4 font-semibold text-gray-900 text-xl">
              Verification Complete! ✅
            </h2>
            
            {/* Vehicle Data */}
            <div className="bg-green-50 mb-4 p-4 border border-green-200 rounded-md">
              <h3 className="mb-2 font-medium text-green-800">Vehicle Data:</h3>
              <pre className="bg-green-100 p-3 rounded overflow-auto text-green-700 text-sm">
                {JSON.stringify(verificationResult, null, 2)}
              </pre>
            </div>

            {/* Before Photos */}
            {verificationResult.beforePhotos && verificationResult.beforePhotos.length > 0 && (
              <div className="bg-blue-50 mb-4 p-4 border border-blue-200 rounded-md">
                <h3 className="mb-2 font-medium text-blue-800">
                  Before Photos ({verificationResult.beforePhotos.length})
                </h3>
                <div className="gap-4 grid grid-cols-2 md:grid-cols-3">
                  {verificationResult.beforePhotos.map((photo: any) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={getPhotoDisplayUrl(photo)}
                        alt={photo.description}
                        className="border rounded-lg w-full h-24 object-cover"
                      />
                      <div className="mt-2">
                        <p className="text-gray-600 text-xs truncate">
                          {photo.description}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatPhotoTimestamp(photo.timestamp)}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {photo.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setVerificationResult(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-colors"
              >
                Verify Another Vehicle
              </button>
              <button
                onClick={() => {
                  setVerificationResult(null);
                  setShowForm(false);
                  setSelectedJobData(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
