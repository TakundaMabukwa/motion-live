"use client";

import { useEffect, useState } from "react";
import { AuthButton } from "./auth-button";
import { Skeleton } from "./ui/skeleton";

export function AuthButtonClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    );
  }

  return <AuthButton />;
}