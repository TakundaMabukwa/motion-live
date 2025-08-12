'use client';

import { Menu, Bell, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/logout-button';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  return (
    <header className="z-50 relative bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg text-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden hover:bg-white/10 text-white"
            >
              <Menu className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="flex justify-center items-center bg-white rounded-full w-8 h-8">
                <div className="flex justify-center items-center bg-blue-600 rounded-full w-6 h-6">
                  <div className="bg-cyan-400 rounded-full w-3 h-3"></div>
                </div>
              </div>
              <span className="hidden sm:block font-bold text-xl">soltrack</span>
            </div>
          </div>

          {/* Center tabs - hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-1">
            <div className="flex items-center space-x-1 bg-white/10 p-1 rounded-lg">
              <button className="hover:bg-white/10 px-4 py-2 rounded-md font-medium text-white/80 hover:text-white text-sm transition-colors">
                👥 Drivers
              </button>
              <button className="hover:bg-white/10 px-4 py-2 rounded-md font-medium text-white/80 hover:text-white text-sm transition-colors">
                📊 Utilisation Dashboard
              </button>
              <button className="hover:bg-white/10 px-4 py-2 rounded-md font-medium text-white/80 hover:text-white text-sm transition-colors">
                ⏰ Start Time
              </button>
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            <span className="hidden lg:block text-sm">Good morning, Admin Macsteel</span>
            
            <div className="flex items-center space-x-2">
                <LogoutButton />
              
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}