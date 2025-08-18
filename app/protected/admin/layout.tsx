'use client';

import AppLayout from '@/components/shared/AppLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}