'use client';

import { LogoutButton } from '@/components/logout-button';
// import { Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-400 to-blue-600 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Soltrack</h1>
                <p className="text-sm text-blue-100">Inventory Management System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">Good morning, Inventory Skyflow</span>
            <div className="flex items-center space-x-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}