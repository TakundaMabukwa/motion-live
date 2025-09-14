"use client";

import * as React from "react";
import { MoreHorizontal, Eye, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThreeDotsMenuProps {
  onViewDetails: () => void;
  onGiveAccess: () => void;
}

export function ThreeDotsMenu({ onViewDetails, onGiveAccess }: ThreeDotsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="p-0 w-8 h-8">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer">
          <Eye className="mr-2 w-4 h-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onGiveAccess} className="cursor-pointer">
          <UserPlus className="mr-2 w-4 h-4" />
          Give Access
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
