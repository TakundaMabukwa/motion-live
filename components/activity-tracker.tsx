'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logActivity, updateActivity } from '@/lib/activity-tracking';

export function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    logActivity({
      actionType: 'PAGE_VIEW',
      actionDescription: `Viewed ${pathname}`,
      pageUrl: pathname
    });
  }, [pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateActivity();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return null;
}
