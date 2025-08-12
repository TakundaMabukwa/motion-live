'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/accounts/Sidebar';
import AccountsContent from '@/components/accounts/AccountsContent';

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
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="flex-shrink-0 bg-white shadow-lg w-64 min-h-screen">
          <Sidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="p-6">
            <AccountsContent activeSection={activeSection} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsLayoutContent />
    </Suspense>
  );
}
