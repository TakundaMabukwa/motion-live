import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export default function DashboardHeader({ 
  title, 
  subtitle, 
  icon: Icon,
  actionButton 
}: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="flex items-center space-x-3 font-bold text-gray-900 text-3xl">
          {Icon && <Icon className="w-8 h-8 text-blue-600" />}
          <span>{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-1 text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
      {actionButton && (
        <Button 
          className="space-x-2 bg-blue-600 hover:bg-blue-700 px-6 h-11"
          onClick={actionButton.onClick}
        >
          {actionButton.icon && <actionButton.icon className="w-4 h-4" />}
          <span>{actionButton.label}</span>
        </Button>
      )}
    </div>
  );
} 