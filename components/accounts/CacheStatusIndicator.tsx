'use client';

import { useAccounts } from '@/contexts/AccountsContext';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CacheStatusIndicator() {
  const { cacheMetadata, isDataLoaded, markDataAsStale } = useAccounts();

  const getCacheStatusInfo = () => {
    if (!isDataLoaded) {
      return {
        text: 'No data loaded',
        color: 'bg-gray-100 text-gray-800',
        icon: Clock,
        description: 'Initial data fetch needed'
      };
    }

    if (cacheMetadata.isStale) {
      return {
        text: 'Data is stale',
        color: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
        description: 'Data needs refresh'
      };
    }

    const minutesAgo = Math.floor((Date.now() - cacheMetadata.lastUpdated) / 60000);
    if (minutesAgo < 1) {
      return {
        text: 'Just updated',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        description: 'Data is fresh'
      };
    }

    if (minutesAgo < 5) {
      return {
        text: `${minutesAgo} minutes ago`,
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        description: 'Data is fresh'
      };
    }

    if (minutesAgo < 15) {
      return {
        text: `${minutesAgo} minutes ago`,
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        description: 'Data is getting old'
      };
    }

    const hoursAgo = Math.floor(minutesAgo / 60);
    return {
      text: `${hoursAgo} hours ago`,
      color: 'bg-orange-100 text-orange-800',
      icon: AlertTriangle,
      description: 'Data is old'
    };
  };

  const statusInfo = getCacheStatusInfo();
  const IconComponent = statusInfo.icon;

  const handleRefresh = () => {
    markDataAsStale();
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={`${statusInfo.color} cursor-pointer hover:opacity-80`}
        onClick={handleRefresh}
        title="Click to mark data as stale and force refresh"
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {statusInfo.text}
      </Badge>
      <span className="text-xs text-gray-500 hidden sm:inline">
        {statusInfo.description}
      </span>
    </div>
  );
}
