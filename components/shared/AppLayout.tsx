'use client';

import { useState, useEffect } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import { Bell, User, Menu, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  sidebarItems: SidebarItem[];
  userRole: string;
  userName?: string;
  showSidebar?: boolean;
}

export default function AppLayout({ 
  children, 
  title, 
  subtitle, 
  sidebarItems, 
  userRole, 
  userName = "User", 
  showSidebar = true 
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex bg-gray-100 h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden z-40 fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:w-20"
        )}>
          <div className="flex justify-between items-center px-4 border-gray-200 border-b h-16">
            {(sidebarOpen || window.innerWidth >= 1024) && (
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center bg-blue-500 rounded-full w-8 h-8">
                  <span className="font-bold text-white text-sm">S</span>
                </div>
                <span className="font-semibold text-gray-900">Soltrack</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex flex-col flex-1 space-y-2 py-4">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center transition-colors group relative mx-2 rounded-lg",
                  sidebarOpen || window.innerWidth >= 1024 ? "px-4 py-3" : "justify-center w-12 h-12 mx-auto",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                )}
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                title={!sidebarOpen && window.innerWidth >= 1024 ? item.name : undefined}
              >
                <item.icon className="w-6 h-6" />
                {(sidebarOpen || window.innerWidth >= 1024) && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
                {!sidebarOpen && window.innerWidth >= 1024 && (
                  <span className="left-16 z-50 absolute bg-gray-900 opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-white text-sm whitespace-nowrap transition-opacity">
                    {item.name}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-gray-200 border-t">
            <Button
              variant="ghost"
              className={cn(
                "w-full text-gray-600 hover:bg-gray-100",
                sidebarOpen || window.innerWidth >= 1024 ? "justify-start" : "justify-center"
              )}
              title={!sidebarOpen && window.innerWidth >= 1024 ? "Sign Out" : undefined}
            >
              <User className="w-5 h-5" />
              {(sidebarOpen || window.innerWidth >= 1024) && (
                <span className="ml-3">Sign Out</span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm text-white">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden hover:bg-blue-600 text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center bg-white rounded-full w-10 h-10">
                  <span className="font-bold text-blue-600 text-lg">S</span>
                </div>
                <div>
                  <h1 className="font-bold text-xl">{title}</h1>
                  {subtitle && <p className="opacity-90 text-blue-100 text-sm">{subtitle}</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-blue-100 text-sm">Good afternoon, {userName}</span>
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative hover:bg-blue-600 text-white">
                  <Bell className="w-5 h-5" />
                  <span className="-top-1 -right-1 absolute flex justify-center items-center bg-orange-500 rounded-full w-5 h-5 text-white text-xs">
                    1
                  </span>
                </Button>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 