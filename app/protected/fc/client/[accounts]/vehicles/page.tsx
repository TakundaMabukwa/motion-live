"use client";

import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const VehicleValidationEditor = dynamic(
  () => import("@/components/fc/VehicleValidationEditor"),
  { loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>, ssr: false },
);

export default function FCVehiclesPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const costCode = selectedCostCenter?.cost_code || accounts.split(",")[0] || "";

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
