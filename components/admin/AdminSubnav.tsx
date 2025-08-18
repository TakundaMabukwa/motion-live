'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, FileText, CheckCircle, BarChart3 } from 'lucide-react';

export default function AdminSubnav() {
  const pathname = usePathname();

  const links = [
    { href: '/protected/admin', label: 'Dashboard', Icon: BarChart3 },
    { href: '/protected/admin/schedule', label: 'Schedule', Icon: Calendar },
    { href: '/protected/admin/all-job-cards', label: 'All Job Cards', Icon: FileText },
    { href: '/protected/admin/completed-jobs', label: 'Completed Jobs', Icon: CheckCircle },
  ];

  return (
    <nav className="bg-white p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-6">
        {links.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 ${
                isActive ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


