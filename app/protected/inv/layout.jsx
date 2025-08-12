'use client';

import AppLayout from '@/components/shared/AppLayout';
import { 
  Package, 
  BarChart3,
  Settings,
  ClipboardList
} from 'lucide-react';

const invSidebarItems = [
  { name: 'Inventory', href: '/protected/inv', icon: Package },
  { name: 'Stock Take', href: '/protected/inv/stock-take', icon: ClipboardList },
  // { name: 'Reports', href: '/protected/inv/reports', icon: BarChart3 },
  // { name: 'Settings', href: '/protected/inv/settings', icon: Settings },
];

export default function Layout({ children }) {
  return (
    <AppLayout
      title="Inventory Management"
      subtitle="STOCK CONTROL SYSTEM"
      sidebarItems={invSidebarItems}
      userRole="inventory"
      userName="Inventory User"
    >
      {children}
    </AppLayout>
  );
}
