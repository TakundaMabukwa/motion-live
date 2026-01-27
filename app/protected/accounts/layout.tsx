'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AccountsTopBar from '@/components/accounts/AccountsTopBar';
import AccountsContent from '@/components/accounts/AccountsContent';
import { AccountsProvider } from '@/contexts/AccountsContext';
import UniversalLayout from '@/components/shared/UniversalLayout';

function AccountsLayoutContent() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Bar Navigation */}
      <AccountsTopBar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="p-4 sm:p-6">
          <AccountsContent activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
}

export default function AccountsLayout() {
  return (
    <UniversalLayout currentRole="accounts">
      <Suspense fallback={<div>Loading...</div>}>
        <AccountsProvider>
          <AccountsLayoutContent />
        </AccountsProvider>
      </Suspense>
    </UniversalLayout>
  );
}
