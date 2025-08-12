'use client';

import AppLayout from '@/components/shared/AppLayout';
import { 
  BarChart3, 
  CalendarDays,
  FileText
} from 'lucide-react';

const adminSidebarItems = [
  { name: 'Dashboard', href: '/protected/admin', icon: BarChart3 },
  { name: 'Schedule', href: '/protected/admin/schedule', icon: CalendarDays },
  { name: 'All Job Cards', href: '/protected/admin/all-job-cards', icon: FileText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout
      title="Admin Dashboard"
      subtitle="VEHICLE TRACKING SERVICES"
      sidebarItems={adminSidebarItems}
      userRole="admin"
      userName="Admin Skyflow"
    >
      {children}
    </AppLayout>
  );
}