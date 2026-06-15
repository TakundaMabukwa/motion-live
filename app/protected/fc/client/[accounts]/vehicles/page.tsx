"use client";

import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Loader2 } from "lucide-react";
import VehicleValidationEditor from "@/components/fc/VehicleValidationEditor";

export default function FCVehiclesPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const isAll = selectedCostCenter?.cost_code === "all";
  const costCode = isAll ? accounts : selectedCostCenter?.cost_code || accounts;

  if (!selectedCostCenter) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <VehicleValidationEditor costCode={costCode} />
      </div>
    </div>
  );
}
