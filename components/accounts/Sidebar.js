'use client';

import { 
  ShoppingCart, 
  Wrench, 
  LogOut,
  LayoutDashboard,
  Receipt,
  AlertTriangle,
  Users,
  CreditCard
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoutButton } from '../logout-button';

const getIcon = (name) => {
  switch (name) {
    case 'grid':
      return LayoutDashboard;
    case 'clients':
      return Users;
    case 'alert-triangle':
      return AlertTriangle;
    case 'shopping-cart':
      return ShoppingCart;
    case 'credit-card':
      return CreditCard;
    case 'wrench':
      return Wrench;
    case 'receipt':
      return Receipt;
    default:
      return null;
  }
};

export default function Sidebar({ activeSection, onSectionChange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigation = (section) => {
    onSectionChange(section);
    router.push(`/protected/accounts?section=${section}`);
  };

  const navigation = [
    { name: 'Dashboard', icon: 'grid', key: 'dashboard' },
    { name: 'Clients', icon: 'clients', key: 'clients' },
    { name: 'Overdue Accounts', icon: 'alert-triangle', key: 'overdue' },
    { name: 'Purchases', icon: 'credit-card', key: 'purchases' },
    // { name: 'Job Cards', icon: 'wrench', key: 'job-cards' },
    { name: 'Completed Job Cards', icon: 'receipt', key: 'completed-jobs' },
    { name: 'Orders', icon: 'shopping-cart', key: 'orders' },
    // { name: 'Logout', icon: 'log-out', key: 'logout' },
  ];

  return (
    <div className="h-full bg-white shadow-lg">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-600">Customer Management</p>
        </div>
        
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.key)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-all duration-200 hover:translate-x-1 ${
                  activeSection === item.key 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-6">
            <LogoutButton />
        </div>
      </div>
    </div>
  );
}