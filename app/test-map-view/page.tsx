'use client';

import React, { useState } from 'react';
import VehicleMapView from '@/components/ui-personal/vehicle-map-view';

export default function TestMapViewPage() {
  const [mapboxToken] = useState(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '');

  // Mock vehicles data
  const mockVehicles = [
    {
      id: 1,
      company: 'ABC Manufacturing',
      group_name: 'ABC Manufacturing',
      new_registration: 'ABC123GP',
      registration_number: 'ABC123GP',
      products: ['GPS Tracker'],
      active: true,
      make: 'Toyota',
      model: 'Hilux',
      manufactured_year: 2020,
      color: 'White'
    },
    {
      id: 2,
      company: 'ABC Manufacturing',
      group_name: 'ABC Manufacturing',
      new_registration: 'ABC456GP',
      registration_number: 'ABC456GP',
      products: ['GPS Tracker'],
      active: true,
      make: 'Ford',
      model: 'Ranger',
      manufactured_year: 2021,
      color: 'Blue'
    },
    {
      id: 3,
      company: 'ABC Manufacturing',
      group_name: 'ABC Manufacturing',
      new_registration: 'ABC789GP',
      registration_number: 'ABC789GP',
      products: ['GPS Tracker'],
      active: true,
      make: 'Isuzu',
      model: 'KB',
      manufactured_year: 2022,
      color: 'Red'
    }
  ];

  return (
    <div className="mx-auto p-6 container">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">Test Map View</h1>
        <p className="text-gray-600">Testing the vehicle map view with live tracking</p>
      </div>

      <VehicleMapView 
        companyName="ABC Manufacturing"
        vehicles={mockVehicles}
        mapboxToken={mapboxToken}
      />
    </div>
  );
} 