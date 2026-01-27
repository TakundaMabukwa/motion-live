'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, Crown } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: string;
  userRole: string;
}

const AVAILABLE_ROLES = [
  { value: 'master', label: 'Master Role' },
  { value: 'admin', label: 'Administrator' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'fc', label: 'Fleet Consultant' },
  { value: 'inv', label: 'Inventory' },
  { value: 'tech', label: 'Technician' },
];

export default function RoleSwitcher({ currentRole, userRole }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  // Only show for master users
  if (userRole !== 'master') return null;

  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === currentRole || switching) return;

    setSwitching(true);
    setIsOpen(false);

    try {
      router.push(`/protected/${newRole}`);
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setSwitching(false);
    }
  };

  const currentRoleData = AVAILABLE_ROLES.find(r => r.value === currentRole);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Crown className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium">
          {currentRoleData?.icon} {currentRoleData?.label || currentRole}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Switch Role View
              </div>
              {AVAILABLE_ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSwitch(role.value)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${role.value === currentRole
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >                 <span className="text-base">{role.icon}</span>
                  <span>{role.label}</span>
                  {role.value === currentRole && (
                    <span className="ml-auto text-xs text-blue-500">Current</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}