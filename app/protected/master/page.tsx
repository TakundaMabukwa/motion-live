"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MasterDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/protected/master/fc-annuity");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}
