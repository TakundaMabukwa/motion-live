"use client";

import BranchCard from "../BranchCard";

// Sample data - in a real app, this would come from an API
const sampleBranches = [
  {
    id: "1",
    name: "Shoprite Sandton",
    location: "Sandton City, JHB",
    vehicleCount: 8,
    vehicles: [
      {
        id: "v1",
        name: "Delivery Truck A",
        type: "truck" as const,
        plateNumber: "GP-123-456",
        status: "active" as const,
      },
      {
        id: "v2",
        name: "Company Car 1",
        type: "car" as const,
        plateNumber: "GP-789-012",
        status: "active" as const,
      },
      {
        id: "v3",
        name: "Staff Shuttle",
        type: "bus" as const,
        plateNumber: "GP-345-678",
        status: "maintenance" as const,
      },
      {
        id: "v4",
        name: "Delivery Van B",
        type: "truck" as const,
        plateNumber: "GP-901-234",
        status: "active" as const,
      },
      {
        id: "v5",
        name: "Manager Vehicle",
        type: "car" as const,
        plateNumber: "GP-567-890",
        status: "inactive" as const,
      },
      {
        id: "v6",
        name: "Delivery Truck C",
        type: "truck" as const,
        plateNumber: "GP-111-222",
        status: "active" as const,
      },
      {
        id: "v7",
        name: "Security Patrol",
        type: "car" as const,
        plateNumber: "GP-333-444",
        status: "active" as const,
      },
      {
        id: "v8",
        name: "Maintenance Van",
        type: "truck" as const,
        plateNumber: "GP-555-666",
        status: "maintenance" as const,
      },
    ],
  },
  {
    id: "2",
    name: "Shoprite Rosebank",
    location: "Rosebank Mall, JHB",
    vehicleCount: 5,
    vehicles: [
      {
        id: "v9",
        name: "Delivery Truck D",
        type: "truck" as const,
        plateNumber: "GP-777-888",
        status: "active" as const,
      },
      {
        id: "v10",
        name: "Company Car 2",
        type: "car" as const,
        plateNumber: "GP-999-000",
        status: "active" as const,
      },
      {
        id: "v11",
        name: "Customer Shuttle",
        type: "bus" as const,
        plateNumber: "GP-222-333",
        status: "active" as const,
      },
      {
        id: "v12",
        name: "Delivery Van E",
        type: "truck" as const,
        plateNumber: "GP-444-555",
        status: "maintenance" as const,
      },
      {
        id: "v13",
        name: "Executive Car",
        type: "car" as const,
        plateNumber: "GP-666-777",
        status: "active" as const,
      },
    ],
  },
  {
    id: "3",
    name: "Shoprite Menlyn",
    location: "Menlyn Park, PTA",
    vehicleCount: 6,
    vehicles: [
      {
        id: "v14",
        name: "Delivery Truck F",
        type: "truck" as const,
        plateNumber: "GP-888-999",
        status: "active" as const,
      },
      {
        id: "v15",
        name: "Staff Vehicle",
        type: "car" as const,
        plateNumber: "GP-123-789",
        status: "active" as const,
      },
      {
        id: "v16",
        name: "Large Delivery Truck",
        type: "truck" as const,
        plateNumber: "GP-456-012",
        status: "active" as const,
      },
      {
        id: "v17",
        name: "Emergency Vehicle",
        type: "car" as const,
        plateNumber: "GP-789-345",
        status: "maintenance" as const,
      },
      {
        id: "v18",
        name: "Staff Transport",
        type: "bus" as const,
        plateNumber: "GP-012-678",
        status: "active" as const,
      },
      {
        id: "v19",
        name: "Utility Van",
        type: "truck" as const,
        plateNumber: "GP-345-901",
        status: "inactive" as const,
      },
    ],
  },
  {
    id: "4",
    name: "Shoprite Centurion",
    location: "Centurion Mall, PTA",
    vehicleCount: 3,
    vehicles: [
      {
        id: "v20",
        name: "Delivery Truck G",
        type: "truck" as const,
        plateNumber: "GP-678-234",
        status: "active" as const,
      },
      {
        id: "v21",
        name: "Branch Manager Car",
        type: "car" as const,
        plateNumber: "GP-901-567",
        status: "active" as const,
      },
      {
        id: "v22",
        name: "Maintenance Truck",
        type: "truck" as const,
        plateNumber: "GP-234-890",
        status: "maintenance" as const,
      },
    ],
  },
];

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
      <div className="mx-auto px-4 py-8 container">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-bold text-gray-900 text-4xl">
            Branch Management System
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600 text-lg">
            Manage and view all company branches and their assigned vehicles in one centralized location
          </p>
        </div>

        {/* Stats Section */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-12">
          <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
            <div className="text-center">
              <div className="mb-2 font-bold text-blue-600 text-3xl">
                {sampleBranches.length}
              </div>
              <div className="text-gray-600">Total Branches</div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
            <div className="text-center">
              <div className="mb-2 font-bold text-green-600 text-3xl">
                {sampleBranches.reduce((acc, branch) => acc + branch.vehicleCount, 0)}
              </div>
              <div className="text-gray-600">Total Vehicles</div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
            <div className="text-center">
              <div className="mb-2 font-bold text-purple-600 text-3xl">
                {sampleBranches.reduce((acc, branch) => 
                  acc + branch.vehicles.filter(v => v.status === 'active').length, 0
                )}
              </div>
              <div className="text-gray-600">Active Vehicles</div>
            </div>
          </div>
        </div>

        {/* Branch Cards Grid */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sampleBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              companyName="Shoprite Holdings"
              branch={branch}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-gray-500 text-sm text-center">
          <p>Branch Management System - Built with Next.js and shadcn/ui</p>
        </div>
      </div>
    </div>
  );
}