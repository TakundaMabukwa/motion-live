"use client";

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "../logout-button";

export default function Header({ sidebarOpen, setSidebarOpen }) {
  return (
    <header className="bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/20 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full"></div>
            </div>
            <h1 className="text-xl font-bold text-white">SolTrack</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-white text-sm">
            Good evening, Accounts Skyflow
          </div>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-white text-blue-600">
              AS
            </AvatarFallback>
          </Avatar>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
