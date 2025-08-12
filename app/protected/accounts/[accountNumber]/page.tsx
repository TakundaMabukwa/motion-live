'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  FileText,
  TrendingUp,
  Users,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import AccountDashboard from '@/components/accounts/AccountDashboard';

export default function AccountPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accountNumber = params.accountNumber as string;
  const [activeSection, setActiveSection] = useState('dashboard');
  
  console.log('AccountPage rendered with accountNumber:', accountNumber);
  console.log('Active section:', activeSection);
  
  // Initialize section from URL params
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      console.log('Setting section from URL:', section);
      setActiveSection(section);
    }
  }, [searchParams]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="flex">
        {/* Sidebar */}
        <div className="bg-white shadow-lg w-64 min-h-screen">
          <div className="p-6">
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Accounts
              </Button>
            </div>
            
            <div className="mb-6">
              <h1 className="font-bold text-gray-900 text-xl">Account</h1>
              <p className="text-gray-600 text-sm">#{accountNumber}</p>
            </div>

            <nav className="space-y-2">
              {[
                { name: 'Dashboard', icon: 'Building2', key: 'dashboard' },
                { name: 'Vehicles', icon: 'Car', key: 'vehicles' },
                { name: 'Settings', icon: 'Settings', key: 'settings' },
              ].map((item) => (
                <Button
                  key={item.key}
                  variant={activeSection === item.key ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 hover:translate-x-1 ${
                    activeSection === item.key 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    console.log('Changing section to:', item.key);
                    setActiveSection(item.key);
                    // Update URL without navigation
                    const url = new URL(window.location.href);
                    url.searchParams.set('section', item.key);
                    window.history.replaceState({}, '', url.toString());
                  }}
                >
                  {item.icon === 'Building2' && <svg className="mr-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>}
                  {item.icon === 'Car' && <svg className="mr-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>}
                  {item.icon === 'Settings' && <svg className="mr-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>}
                  {item.name}
                </Button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <main className="p-6">
            <AccountDashboard activeSection={activeSection} />
          </main>
        </div>
      </div>
    </div>
  );
}
