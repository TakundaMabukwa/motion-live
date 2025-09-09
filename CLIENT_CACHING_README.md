# Client Caching System for Accounts

## Overview

This document describes the enhanced client caching system implemented for the accounts section, which provides improved performance and user experience through intelligent data caching and context management. The system now includes **navigation-aware caching** that prevents unnecessary API calls when returning to the accounts page.

## Features

### 1. Enhanced AccountsContext
- **Contact Info Caching**: Automatically fetches and caches contact information for all company groups
- **Vehicle Amounts Caching**: Caches vehicle amounts data to avoid repeated API calls
- **Local Storage Persistence**: Data persists across browser sessions
- **Automatic Data Synchronization**: Ensures data consistency across components
- **Navigation-Aware Caching**: Prevents unnecessary API calls when returning to the page
- **Smart Cache Invalidation**: Automatically marks data as stale after 30 minutes

### 2. Client Data Management
- **Company Groups**: Cached company group information with legal names and account numbers
- **Contact Details**: Phone, email, and address information for each client
- **Vehicle Information**: Monthly amounts, overdue amounts, and vehicle counts
- **Search Functionality**: Real-time search with cached results
- **Cache Metadata**: Tracks when data was last updated and freshness status

### 3. Performance Optimizations
- **Lazy Loading**: Contact info is fetched only when company groups are loaded
- **Debounced Search**: Reduces API calls during user typing
- **Smart Caching**: Avoids redundant API requests for already fetched data
- **Background Updates**: Data refreshes happen in the background without blocking UI
- **Navigation Detection**: Detects page visibility and focus to optimize data fetching

## Architecture

### Context Structure
```typescript
interface AccountsContextType {
  companyGroups: CompanyGroup[];
  vehicleAmounts: Record<string, VehicleAmounts>;
  contactInfo: Record<string, ContactInfo>;
  loading: boolean;
  loadingAmounts: boolean;
  loadingContacts: boolean;
  totalCount: number;
  fetchCompanyGroups: (search?: string, forceRefresh?: boolean) => Promise<void>;
  fetchVehicleAmounts: (prefix: string, forceRefresh?: boolean) => Promise<VehicleAmounts | null>;
  fetchContactInfo: (groups: CompanyGroup[], forceRefresh?: boolean) => Promise<void>;
  clearData: () => void;
  isDataLoaded: boolean;
  cacheMetadata: CacheMetadata;
  shouldFetchData: () => boolean;
  markDataAsStale: () => void;
}

interface CacheMetadata {
  lastUpdated: number;
  dataVersion: string;
  isStale: boolean;
}
```

### Data Flow
1. **Initial Load**: `fetchCompanyGroups()` is called to load company groups
2. **Contact Fetching**: Automatically triggers `fetchContactInfo()` for each group
3. **Caching**: All data is stored in context state and localStorage
4. **Component Updates**: Components automatically re-render with cached data
5. **Search**: Search queries use cached data or fetch new results as needed
6. **Navigation Detection**: Page visibility and focus events trigger cache validation

## Navigation-Aware Caching

### How It Works
The system now intelligently prevents unnecessary API calls when users return to the accounts page:

1. **Cache Validation**: On page load, checks if cached data is still fresh (< 30 minutes old)
2. **Navigation Detection**: Listens for page visibility and window focus events
3. **Smart Fetching**: Only fetches new data if:
   - No cached data exists
   - Cached data is marked as stale
   - Cached data is older than 30 minutes
   - User explicitly requests a refresh

### Event Listeners
- **`visibilitychange`**: Detects when user switches back to the tab
- **`focus`**: Detects when window regains focus
- **`online`**: Detects when network connection is restored

### Cache Freshness Rules
- **Fresh (0-5 minutes)**: Green status, no API calls needed
- **Recent (5-15 minutes)**: Yellow status, consider refresh
- **Old (15-30 minutes)**: Orange status, refresh recommended
- **Stale (30+ minutes)**: Red status, automatic refresh on next interaction

## Usage

### Basic Usage in Components
```typescript
import { useAccounts } from '@/contexts/AccountsContext';

function MyComponent() {
  const { 
    companyGroups, 
    contactInfo, 
    loading, 
    fetchCompanyGroups,
    shouldFetchData,
    cacheMetadata 
  } = useAccounts();

  useEffect(() => {
    // Only fetch if we don't have data or if data is stale
    if (!isDataLoaded || companyGroups.length === 0) {
      console.log('Initial data fetch needed');
      fetchCompanyGroups('');
    } else {
      console.log('Using cached data, no initial fetch needed');
    }
  }, [fetchCompanyGroups, isDataLoaded, companyGroups.length]);

  // Use cached data
  return (
    <div>
      {companyGroups.map(group => (
        <div key={group.id}>
          <h3>{group.company_group}</h3>
          <p>Contact: {contactInfo[group.id]?.email || 'N/A'}</p>
        </div>
      ))}
    </div>
  );
}
```

### Force Refresh
```typescript
const { fetchCompanyGroups, markDataAsStale } = useAccounts();

const handleForceRefresh = async () => {
  markDataAsStale(); // Mark data as stale
  await fetchCompanyGroups('', true); // Force refresh
};
```

### Using the Custom Hook
```typescript
import { useClientCache } from '@/lib/hooks/useClientCache';

function MyComponent() {
  const clientCache = useClientCache('my-cache-key');
  
  // Use the hook methods
  const contact = clientCache.getContactForGroup('group-id');
  const group = clientCache.getCompanyGroupById('group-id');
}
```

### Cache Status Component
```typescript
import CacheStatusIndicator from '@/components/accounts/CacheStatusIndicator';

function MyComponent() {
  return (
    <div>
      <CacheStatusIndicator />
      {/* Your component content */}
    </div>
  );
}
```

## Cache Keys

The system uses different cache keys for different sections:
- **Accounts**: `accounts_company_groups`, `accounts_vehicle_amounts`, `accounts_contact_info`, `accounts_cache_metadata`
- **FC**: `fc_company_groups`, `fc_contact_info`
- **Custom**: Can be specified when using `useClientCache('custom-key')`

## Benefits

### 1. Performance
- **Instant Loading**: Cached data loads immediately on subsequent visits
- **Reduced API Calls**: Minimizes network requests through smart caching
- **Background Updates**: Data refreshes happen in the background without blocking UI
- **Navigation Optimization**: No unnecessary API calls when returning to the page

### 2. User Experience
- **Contact Information**: Users can see phone, email, and location at a glance
- **Consistent Data**: Same information across all components and page refreshes
- **Offline Capability**: Basic data available even without internet connection
- **Smart Refresh**: Data only refreshes when necessary

### 3. Development
- **Centralized State**: Single source of truth for all client data
- **Easy Integration**: Simple hook usage in any component
- **Debug Information**: Comprehensive logging for troubleshooting
- **Cache Monitoring**: Visual indicators for cache status

## Configuration

### Context Provider Setup
```typescript
// In layout.tsx
import { AccountsProvider } from '@/contexts/AccountsContext';

export default function Layout({ children }) {
  return (
    <AccountsProvider>
      {children}
    </AccountsProvider>
  );
}
```

### API Endpoints
The system expects these API endpoints:
- `/api/accounts/customers-grouped` - Company groups data
- `/api/accounts/vehicle-amounts` - Vehicle amounts by prefix
- `/api/customers/contact-info` - Contact information by prefix

## Best Practices

### 1. Data Fetching
- Always check `isDataLoaded` before fetching
- Use the context's fetch methods instead of direct API calls
- Handle loading states appropriately
- Use `forceRefresh` parameter when you need fresh data

### 2. Caching Strategy
- Let the system handle cache invalidation automatically
- Use `markDataAsStale()` when you know data is outdated
- Monitor cache status through the UI indicators
- Clear cache when data becomes stale

### 3. Error Handling
- Implement proper error boundaries
- Show user-friendly error messages
- Provide fallback data when possible
- Handle network connectivity issues gracefully

## Troubleshooting

### Common Issues

1. **Data Not Loading**
   - Check if context provider is properly wrapped
   - Verify API endpoints are accessible
   - Check browser console for errors
   - Verify cache keys are consistent

2. **Cache Not Persisting**
   - Ensure localStorage is enabled
   - Check for localStorage quota exceeded errors
   - Verify cache keys are consistent
   - Check if data is being marked as stale

3. **Performance Issues**
   - Monitor component re-renders
   - Check for unnecessary API calls
   - Verify data is being cached properly
   - Check cache status indicators

4. **Navigation Issues**
   - Verify event listeners are working
   - Check if page visibility API is supported
   - Monitor focus and visibility events in console

### Debug Information
The system provides console logs for:
- Data loading from localStorage
- Data saving to localStorage
- API responses and errors
- Cache operations
- Navigation events
- Cache freshness checks

## Future Enhancements

### Planned Features
- **Cache Expiration**: Automatic cache invalidation after time periods
- **Background Sync**: Periodic data updates in the background
- **Offline Support**: Enhanced offline capabilities with service workers
- **Data Compression**: Optimize localStorage usage for large datasets
- **Advanced Navigation**: Route-based cache invalidation
- **Cache Analytics**: Track cache hit rates and performance metrics

### Performance Monitoring
- **Cache Hit Rates**: Track how often cached data is used
- **API Call Reduction**: Measure reduction in network requests
- **User Experience Metrics**: Monitor loading times and responsiveness
- **Navigation Patterns**: Analyze user behavior for cache optimization

## Migration Guide

### From Old System
If you're migrating from the previous caching system:

1. **Update Context Usage**: Replace direct API calls with context methods
2. **Add Cache Status**: Include cache status indicators in your UI
3. **Update Refresh Logic**: Use the new force refresh capabilities
4. **Monitor Performance**: Watch for reduced API calls and faster loading

### Breaking Changes
- `fetchCompanyGroups()` now accepts a `forceRefresh` parameter
- `fetchVehicleAmounts()` now accepts a `forceRefresh` parameter
- `fetchContactInfo()` now accepts a `forceRefresh` parameter
- New `cacheMetadata`, `shouldFetchData()`, and `markDataAsStale()` methods
