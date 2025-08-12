'use client';

import { Home, Package, LogOut, BarChart3, ClipboardList, FileText, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', key: 'overview', icon: Home },
  { name: 'Job Cards', key: 'jobs', icon: ClipboardList },
  { name: 'Serial Number Report', key: 'serial-number-report', icon: BarChart3 },
  { name: 'Goods Received Voucher', key: 'goods-received-voucher', icon: FileText },
  { name: 'Stock Ledger', key: 'stock-ledger', icon: Package },
  { name: 'Stock Balance', key: 'stock-balance', icon: Scale },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Soltrack</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200",
                activeTab === item.key
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200">
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}