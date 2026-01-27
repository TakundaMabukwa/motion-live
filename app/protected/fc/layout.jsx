'use client';

import { usePathname } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';
import { ClientsProvider } from '@/contexts/ClientsContext';
import UniversalLayout from '@/components/shared/UniversalLayout';
import { 
  Building2, 
  FileText,
  ExternalLink,
  Package,
  Car,
  Wrench,
  User,
  Map,
  CheckCircle
} from 'lucide-react';

export default function Layout({ children }) {
  const pathname = usePathname();
  
  // Check if we're viewing a specific account
  const isAccountView = pathname.includes('/protected/fc/accounts/') && pathname.split('/').length > 4;
  
  let fcSidebarItems = [];

  if (isAccountView) {
    // When viewing an account, show account-specific options
    const accountId = pathname.split('/')[4]; // Get the account ID from the URL
    fcSidebarItems = [
      { name: 'Dashboard', href: `/protected/fc/accounts/${accountId}?tab=dashboard`, icon: Building2 },
      { name: 'Vehicles', href: `/protected/fc/accounts/${accountId}?tab=vehicles`, icon: Car },
      { name: 'Jobs', href: `/protected/fc/accounts/${accountId}?tab=jobs`, icon: Wrench },
      { name: 'Client Quotes', href: `/protected/fc/accounts/${accountId}?tab=client-quotes`, icon: User },
      { name: 'Map', href: `/protected/fc/accounts/${accountId}?tab=map`, icon: Map },
    ];
  } else {
    // Default FC sidebar items - these will be moved to top bar
    fcSidebarItems = [
      { name: 'Accounts', href: '/protected/fc', icon: Building2 },
      { name: 'Quotes', href: '/protected/fc/quotes', icon: FileText },
      { name: 'External Quotation', href: '/protected/fc/external-quotation', icon: ExternalLink },
      { name: 'Completed Jobs', href: '/protected/fc/completed-jobs', icon: CheckCircle },
    ];
  }

  return (
    <UniversalLayout currentRole="fc">
      <AppLayout
        title="Field Coordinator"
        subtitle="CUSTOMER RELATIONSHIP MANAGEMENT"
        sidebarItems={fcSidebarItems}
        userRole="field_coordinator"
        userName="FC User"
        showSidebar={false}
      >
        <ClientsProvider>
          {children}
        </ClientsProvider>
      </AppLayout>
    </UniversalLayout>
  );
}
