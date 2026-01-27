'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserRole } from '@/lib/auth-utils';
import RoleSwitcher from './RoleSwitcher';

interface UniversalLayoutProps {
  children: React.ReactNode;
  currentRole: string;
}

export default function UniversalLayout({ children, currentRole }: UniversalLayoutProps) {
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const roleData = await getUserRole(user.id);
        if (roleData) setUserRole(roleData.role);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {userRole === 'master' && (
        <div className="fixed top-4 right-4 z-50">
          <RoleSwitcher currentRole={currentRole} userRole={userRole} />
        </div>
      )}
      {children}
    </div>
  );
}