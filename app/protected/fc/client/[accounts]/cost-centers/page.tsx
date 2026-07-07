"use client";

import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Loader2 } from "lucide-react";
import FCCostCentersSection from "@/components/fc/FCCostCentersSection";

export default function FCCostCentersPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const isAll = selectedCostCenter?.cost_code === "all";
  const costCode = isAll ? accounts : selectedCostCenter?.cost_code || accounts;

  if (!selectedCostCenter) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return <FCCostCentersSection costCodes={costCode} />;
}
