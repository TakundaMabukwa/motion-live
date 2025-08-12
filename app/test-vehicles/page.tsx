'use client';

import { useState, useEffect } from 'react';

export default function TestVehicles() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies);
        console.log('Companies loaded:', data.companies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async (accountNumber: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${accountNumber}`);
      const data = await response.json();
      if (data.success) {
        setVehicles(data.vehicles);
        console.log('Vehicles loaded:', data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-4 font-bold text-2xl">Test Vehicles</h1>
      
      <div className="mb-6">
        <h2 className="mb-2 font-semibold text-xl">Companies</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {companies.map((company: any) => (
              <div key={company.id} className="p-2 border rounded">
                <p><strong>{company.company}</strong></p>
                <p>Account: {company.new_account_number}</p>
                <p>Vehicles: {company.vehicle_count}</p>
                <button 
                  onClick={() => fetchVehicles(company.new_account_number)}
                  className="bg-blue-500 mt-2 px-4 py-2 rounded text-white"
                >
                  Load Vehicles
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-xl">Vehicles</h2>
        {vehicles.length > 0 ? (
          <div className="space-y-2">
            {vehicles.map((vehicle: any) => (
              <div key={vehicle.id} className="p-2 border rounded">
                <p><strong>Registration:</strong> {vehicle.registration}</p>
                <p><strong>Company:</strong> {vehicle.company}</p>
                <p><strong>Account:</strong> {vehicle.new_account_number}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No vehicles loaded</p>
        )}
      </div>
    </div>
  );
}









