import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LucideIcon } from 'lucide-react';

interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  content: React.ReactNode;
}

interface DashboardTabsProps {
  tabs: TabItem[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export default function DashboardTabs({ 
  tabs, 
  activeTab,
  onTabChange 
}: DashboardTabsProps) {
  // Add safety checks for undefined or empty tabs
  if (!tabs || tabs.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-gray-500">No tabs available</p>
      </div>
    );
  }

  // Dynamically calculate grid columns based on number of tabs
  const getGridCols = (tabCount: number) => {
    if (tabCount <= 4) return 'grid-cols-4';
    if (tabCount <= 5) return 'grid-cols-5';
    if (tabCount <= 6) return 'grid-cols-6';
    return 'grid-cols-7'; // For 7+ tabs
  };

  return (
    <Tabs 
      defaultValue={activeTab || tabs[0]?.value || ''} 
      onValueChange={onTabChange}
      className="w-full"
    >
      <TabsList className={`grid ${getGridCols(tabs.length)} bg-white border w-full`}>
        {tabs.map((item) => (
          <TabsTrigger 
            key={item.value}
            value={item.value} 
            className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span className={tabs.length > 4 ? 'text-xs' : ''}>{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
} 