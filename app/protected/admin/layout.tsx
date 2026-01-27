'use client';

import AppLayout from '@/components/shared/AppLayout';
import UniversalLayout from '@/components/shared/UniversalLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UniversalLayout currentRole="admin">
      <AppLayout
        title="Admin Dashboard"
        subtitle="VEHICLE TRACKING SERVICES"
        sidebarItems={[]}
        userRole="admin"
        userName="Admin Skyflow"
        showSidebar={false}
      >
        {children}
      </AppLayout>
    </UniversalLayout>
  );
}