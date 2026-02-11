'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserRole } from '@/lib/auth-utils';
import RoleSwitcher from './RoleSwitcher';
import { LogoutButton } from '@/components/logout-button';
import { Bell, Settings, Lock } from 'lucide-react';

interface SystemHeaderProps {
  title?: string;
  currentRole: string;
}

export default function SystemHeader({ title, currentRole }: SystemHeaderProps) {
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const isValidationMode = pathname?.includes('/validate');

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const roleData = await getUserRole(user.id);
        if (roleData) {
          setUserRole(roleData.role);
        }
      }
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
          {isValidationMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Validation Mode</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Role Switcher - only visible for master users */}
          <RoleSwitcher currentRole={currentRole} userRole={userRole} />
          
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Bell className="w-5 h-5" />
          </button>
          
          {/* Settings */}
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5" />
          </button>
          
          {/* Logout */}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}