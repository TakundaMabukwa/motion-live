'use client';

import AppLayout from '@/components/shared/AppLayout';
import UniversalLayout from '@/components/shared/UniversalLayout';
import { 
  BarChart3, 
  Calendar,
  Briefcase,
  Package,
  Camera
} from 'lucide-react';

const techSidebarItems = [
  { name: 'Dashboard', href: '/protected/tech', icon: BarChart3 },
  { name: 'Schedule', href: '/protected/tech/schedule', icon: Calendar },
  { name: 'Jobs', href: '/protected/tech/job', icon: Briefcase },
  { name: 'Boot Stock', href: '/protected/tech/boot-stock', icon: Package },
  // { name: 'VIN Scanner', href: '/protected/tech/test-vin', icon: Camera },
];

export default function TechLayout({ children }) {
  return (
    <UniversalLayout currentRole="tech">
      <AppLayout
        title="Technician Portal"
        subtitle="VEHICLE TRACKING SERVICES"
        sidebarItems={techSidebarItems}
        userRole="technician"
        userName="Tech Skyflow"
      >
        {children}
      </AppLayout>
    </UniversalLayout>
  );
}
