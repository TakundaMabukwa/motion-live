'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileText, Package, Activity } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/protected/master', icon: Home },
    { name: 'Users', href: '/protected/master/users', icon: Users },
    { name: 'User Activity', href: '/protected/master/user-activity', icon: Activity },
    { name: 'Invoices', href: '/protected/master/invoices', icon: FileText },
    { name: 'Stock Orders', href: '/protected/master/stock-orders', icon: Package },
    { name: 'Pricing', href: '/protected/master/pricing', icon: FileText },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <div className="bg-white shadow-lg w-64">
        <div className="p-6 border-b">
          <h1 className="font-bold text-gray-900 text-xl">Master Dashboard</h1>
        </div>
        <nav className="mt-6">
          <div className="space-y-2 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <LogoutButton />
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}