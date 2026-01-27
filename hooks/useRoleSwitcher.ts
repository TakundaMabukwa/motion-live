import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserRole } from '@/lib/auth-utils';

export interface UseRoleSwitcherReturn {
  userRole: string;
  canSwitchRoles: boolean;
  switchToRole: (role: string) => Promise<void>;
  loading: boolean;
}

export function useRoleSwitcher(): UseRoleSwitcherReturn {
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const switchToRole = async (role: string) => {
    if (userRole !== 'master') {
      throw new Error('Only master users can switch roles');
    }
    
    router.push(`/protected/${role}`);
  };

  return {
    userRole,
    canSwitchRoles: userRole === 'master',
    switchToRole,
    loading,
  };
}