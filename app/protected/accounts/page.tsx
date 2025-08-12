'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AccountsPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect if we're exactly at /protected/accounts (not at /protected/accounts/[accountNumber])
    if (pathname === '/protected/accounts') {
      router.replace('/protected/accounts?section=dashboard');
    }
  }, [router, pathname]);

  return (
    <div className="flex justify-center items-center py-12">
      <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
      <span className="ml-2">Redirecting to accounts dashboard...</span>
    </div>
  );
}
