"use client";

import Link from 'next/link';
import { Home, Users, FileText } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

interface Props {
  invoiceBadgeCount?: number;
  stockPendingCount?: number;
}

export default function MasterSidebar({ invoiceBadgeCount, stockPendingCount }: Props) {
  return (
    <div className="bg-white shadow-lg w-64">
      <div className="p-6 border-b">
        <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
      </div>
      <nav className="mt-6">
        <div className="space-y-2 px-4">
          <Link href="/protected/master" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
            <Home className="mr-3 w-5 h-5" />
            Home
          </Link>

          <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
            <Users className="mr-3 w-5 h-5" />
            Users
          </Link>

          <Link href="/protected/master/invoices" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
            <FileText className="mr-3 w-5 h-5" />
            Invoices
            {invoiceBadgeCount && invoiceBadgeCount > 0 && (
              <span className="bg-orange-100 ml-auto px-2 py-1 rounded-full font-medium text-orange-800 text-xs">
                {invoiceBadgeCount}
              </span>
            )}
          </Link>

          <Link href="/protected/master/stock-orders" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
            <FileText className="mr-3 w-5 h-5" />
            Stock Orders
            {stockPendingCount && stockPendingCount > 0 && (
              <span className="bg-orange-100 ml-auto px-2 py-1 rounded-full font-medium text-orange-800 text-xs">
                {stockPendingCount}
              </span>
            )}
          </Link>

          <Link href="/protected/master/pricing" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
            <FileText className="mr-3 w-5 h-5" />
            Pricing
          </Link>

          <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
            <LogoutButton />
          </div>
        </div>
      </nav>
    </div>
  );
}
