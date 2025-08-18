'use client';

import { 
  ShoppingCart, 
  Wrench, 
  LogOut,
  LayoutDashboard,
  Receipt,
  AlertTriangle,
  Car
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoutButton } from '../logout-button';

const getIcon = (name) => {
  switch (name) {
    case 'grid':
      return LayoutDashboard;
    case 'alert-triangle':
      return AlertTriangle;
    case 'shopping-cart':
      return ShoppingCart;
    case 'wrench':
      return Wrench;
    case 'receipt':
      return Receipt;
    case 'car':
      return Car;
    default:
      return null;
  }
};

export default function AccountsTopBar({ activeSection, onSectionChange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigation = (section) => {
    onSectionChange(section);
    router.push(`/protected/accounts?section=${section}`);
  };

  const navigation = [
    { name: 'Dashboard', icon: 'grid', key: 'dashboard' },
    { name: 'Overdue Accounts', icon: 'alert-triangle', key: 'overdue' },
    { name: 'Purchases', icon: 'shopping-cart', key: 'purchases' },
    { name: 'Completed Job Cards', icon: 'receipt', key: 'completed-jobs' },
    { name: 'Orders', icon: 'receipt', key: 'orders' },
    { name: 'Vehicles', icon: 'car', key: 'vehicles' },
  ];

  return (
    <div className="bg-white shadow-lg border-b border-gray-200">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accounts</h1>
              <p className="text-sm text-gray-600">Customer Management</p>
            </div>
            
            {/* Navigation Items */}
            <nav className="flex flex-wrap items-center gap-1">
              {navigation.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.key)}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 whitespace-nowrap ${
                      activeSection === item.key 
                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">{item.name}</span>
                    <span className="sm:hidden">{item.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="flex items-center justify-end">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
