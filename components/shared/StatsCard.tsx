import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = "text-blue-600",
  subtitle 
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
        <CardTitle className="font-medium text-gray-600 text-sm">
          {title}
        </CardTitle>
        <Icon className={`w-5 h-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-gray-900 text-2xl">
          {value}
        </div>
        {change && (
          <p className="text-gray-600 text-xs">
            <span
              className={
                change.startsWith("+")
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {change}
            </span>{" "}
            from last month
          </p>
        )}
        {subtitle && (
          <p className="mt-1 text-gray-500 text-xs">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 