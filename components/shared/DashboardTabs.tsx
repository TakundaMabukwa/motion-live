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

  return (
    <Tabs 
      defaultValue={activeTab || tabs[0]?.value || ''} 
      onValueChange={onTabChange}
      className="w-full"
    >
      <TabsList className="grid grid-cols-4 bg-white border w-full">
        {tabs.map((item) => (
          <TabsTrigger 
            key={item.value}
            value={item.value} 
            className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span>{item.label}</span>
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