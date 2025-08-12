"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Truck, Bus, MapPin } from "lucide-react";

interface Vehicle {
  id: string;
  name: string;
  type: "car" | "truck" | "bus";
  plateNumber: string;
  status: "active" | "maintenance" | "inactive";
}

interface Branch {
  id: string;
  name: string;
  location: string;
  vehicleCount: number;
  vehicles: Vehicle[];
}

interface BranchData {
  companyName: string;
  branch: Branch;
}

const VehicleIcon = ({ type }: { type: Vehicle["type"] }) => {
  switch (type) {
    case "car":
      return <Car className="w-5 h-5" />;
    case "truck":
      return <Truck className="w-5 h-5" />;
    case "bus":
      return <Bus className="w-5 h-5" />;
    default:
      return <Car className="w-5 h-5" />;
  }
};

const StatusBadge = ({ status }: { status: Vehicle["status"] }) => {
  const variants = {
    active: "bg-green-100 text-green-800 border-green-200",
    maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
    inactive: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    active: "Active",
    maintenance: "Maintenance",
    inactive: "Inactive",
  };

  return (
    <Badge variant="outline" className={`${variants[status]} font-medium`}>
      {labels[status]}
    </Badge>
  );
};

function VehiclesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const dataParam = searchParams.get("data");
  
  if (!dataParam) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
        <div className="text-center">
          <h1 className="mb-4 font-bold text-gray-900 text-2xl">No Data Found</h1>
          <p className="mb-6 text-gray-600">Unable to load branch information.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Branches
          </Button>
        </div>
      </div>
    );
  }

  let branchData: BranchData;
  try {
    branchData = JSON.parse(decodeURIComponent(dataParam));
  } catch (error) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
        <div className="text-center">
          <h1 className="mb-4 font-bold text-gray-900 text-2xl">Invalid Data</h1>
          <p className="mb-6 text-gray-600">Unable to parse branch information.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Branches
          </Button>
        </div>
      </div>
    );
  }

  const { companyName, branch } = branchData;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
      <div className="mx-auto px-4 py-8 container">
        {/* Header Section */}
        <div className="mb-8">
          <Button 
            onClick={() => router.push("/")} 
            variant="outline" 
            className="hover:bg-blue-50 mb-6 hover:border-blue-300"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Branches
          </Button>
          
          <div className="bg-white shadow-sm mb-8 p-6 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="mb-2 font-bold text-gray-900 text-3xl">
                  {branch.name}
                </h1>
                <p className="mb-2 font-medium text-gray-600 text-lg">
                  {companyName}
                </p>
                <div className="flex items-center text-gray-500">
                  <MapPin className="mr-2 w-4 h-4" />
                  <span>{branch.location}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-1 font-bold text-blue-600 text-3xl">
                  {branch.vehicleCount}
                </div>
                <div className="text-gray-600">
                  Vehicle{branch.vehicleCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="mb-6">
          <h2 className="mb-6 font-bold text-gray-900 text-2xl">Branch Vehicles</h2>
          
          {branch.vehicles.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Car className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-600 text-xl">
                  No Vehicles Found
                </h3>
                <p className="text-gray-500">
                  This branch currently has no vehicles assigned.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {branch.vehicles.map((vehicle) => (
                <Card 
                  key={vehicle.id} 
                  className="hover:shadow-md transition-all hover:-translate-y-0.5 duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="flex justify-center items-center bg-blue-100 rounded-full w-12 h-12">
                          <VehicleIcon type={vehicle.type} />
                        </div>
                        
                        <div>
                          <h3 className="mb-1 font-semibold text-gray-900 text-lg">
                            {vehicle.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-gray-600 text-sm">
                            <div className="flex items-center">
                              <span className="font-medium">Plate:</span>
                              <span className="bg-gray-100 ml-2 px-2 py-1 rounded font-mono text-gray-800">
                                {vehicle.plateNumber}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium">Type:</span>
                              <span className="ml-2 capitalize">
                                {vehicle.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <StatusBadge status={vehicle.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mt-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="mb-2 font-bold text-green-600 text-2xl">
                {branch.vehicles.filter(v => v.status === 'active').length}
              </div>
              <div className="text-gray-600">Active Vehicles</div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <div className="mb-2 font-bold text-yellow-600 text-2xl">
                {branch.vehicles.filter(v => v.status === 'maintenance').length}
              </div>
              <div className="text-gray-600">In Maintenance</div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <div className="mb-2 font-bold text-red-600 text-2xl">
                {branch.vehicles.filter(v => v.status === 'inactive').length}
              </div>
              <div className="text-gray-600">Inactive Vehicles</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    }>
      <VehiclesContent />
    </Suspense>
  );
}