"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, Car } from "lucide-react";

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

interface BranchCardProps {
  companyName: string;
  branch: Branch;
}

export default function BranchCard({ companyName, branch }: BranchCardProps) {
  const router = useRouter();

  const handleViewVehicles = () => {
    // Encode the branch data to pass to the vehicles page
    const branchData = encodeURIComponent(JSON.stringify({
      companyName,
      branch
    }));
    router.push(`/vehicles?data=${branchData}`);
  };

  return (
    <Card className="hover:shadow-lg mx-auto w-full max-w-md transition-all hover:-translate-y-1 duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="font-semibold text-gray-900 text-lg">
              {branch.name}
            </CardTitle>
            <p className="mt-1 font-medium text-gray-600 text-sm">
              {companyName}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-gray-500 text-sm">
              <MapPin className="mr-1 w-4 h-4" />
              Location
            </div>
            <p className="mt-1 font-medium text-gray-700 text-sm">
              {branch.location}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-600" />
            <span className="text-gray-600 text-sm">
              {branch.vehicleCount} Vehicle{branch.vehicleCount !== 1 ? "s" : ""}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewVehicles}
            className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          >
            <Eye className="mr-2 w-4 h-4" />
            View Vehicles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}