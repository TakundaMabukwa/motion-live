# Backend Architecture Guide

## Overview

This document describes the new backend architecture implemented for the Motion Live application. The architecture follows best practices for maintainability, scalability, and testability.

## Directory Structure

```
app/
├── api/                  # API Routes (thin controllers)
│   └── [resource]/
│       └── route.ts      # Only HTTP handling, validation and calling services
lib/
├── api/                  # API utilities
├── auth/                 # Authentication utilities
├── cache/                # Caching system
├── config/               # Configuration files
├── database/             # Database utilities
│   └── migrations/       # Database migrations
├── errors/               # Error handling
├── jobs/                 # Background job system
├── logger/               # Logging system
├── repositories/         # Data access layer
│   └── [resource]/       # Repository for each resource
├── services/             # Business logic layer
│   └── [resource]/       # Service for each resource
├── supabase/             # Supabase client and utilities
├── types/                # Type definitions
│   ├── api/              # API request/response types
│   ├── database/         # Database entity types
│   └── domain/           # Domain model types
└── utils/                # Utility functions
```

## Layers

### 1. API Routes (`app/api/`)

API routes act as thin controllers that:
- Parse request data
- Validate inputs
- Call appropriate services
- Format and return responses
- Handle errors

Example:
```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const validation = safeValidateRequest({ id }, SomeSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const result = await someService.getSomething(id);
    return NextResponse.json(result);
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
```

### 2. Services (`lib/services/`)

Services contain business logic and:
- Coordinate between repositories
- Implement domain rules
- Perform validations
- Transform data between layers
- Handle caching
- Log operations

Example:
```typescript
export class VehicleService {
  private repository: VehicleRepository;
  private logger: Logger;
  private cache: MemoryCache;
  
  constructor() {
    this.repository = new VehicleRepository();
    this.logger = new Logger('VehicleService');
    this.cache = MemoryCache.getInstance();
  }
  
  async searchVehicle(params) {
    this.logger.info('Searching for vehicle', params);
    
    // Try cache first
    const cacheKey = `vehicle:${params.vin || ''}:${params.registration || ''}`;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      this.logger.debug('Vehicle found in cache', { cacheKey });
      return cachedResult;
    }
    
    // Business logic
    const result = await this.repository.findByVin(params.vin);
    
    // Cache result
    this.cache.set(cacheKey, result, 300); // 5 minutes
    
    return result;
  }
}
```

### 3. Repositories (`lib/repositories/`)

Repositories handle data access and:
- Interact with the database
- Execute queries
- Map data to/from database entities
- Hide database implementation details

Example:
```typescript
export class VehicleRepository {
  async findByVin(vin: string) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('vin_number', vin)
      .single();
      
    if (error) {
      throw new DatabaseError('Failed to fetch vehicle', error);
    }
    
    return data as Vehicle;
  }
}
```

### 4. Types (`lib/types/`)

Types provide structure and type safety:
- `database/`: Database entity types
- `api/`: API request/response types
- `domain/`: Domain model types

### 5. Validation (`lib/api/validation.ts`)

Validation ensures data integrity:
- Schemas define expected shapes of data
- Utility functions validate against schemas
- Error messages for invalid data

Example:
```typescript
export const SearchVehicleSchema = z.object({
  vin: z.string().optional(),
  registration: z.string().optional(),
}).refine(data => data.vin || data.registration, {
  message: 'Either VIN or registration number must be provided',
});
```

### 6. Error Handling (`lib/errors/`)

Centralized error handling:
- Custom error classes
- Error translation for API responses
- Consistent error formats

## Cross-Cutting Concerns

### Authentication (`lib/auth/`)

Authentication utilities provide:
- User authentication
- Role-based access control
- Consistent auth patterns across routes

### Caching (`lib/cache/`)

Caching system for improved performance:
- In-memory cache with TTL
- Cache invalidation patterns
- Service-level caching

### Logging (`lib/logger/`)

Structured logging throughout the application:
- Context-based logging
- Log levels (debug, info, warn, error)
- Metadata for better debugging

### Database Migrations (`lib/database/migrations/`)

Database schema management:
- Versioned migrations
- Up/down migration support
- CLI and API interfaces

### Background Jobs (`lib/jobs/`)

Background task processing:
- Job queue implementation
- Scheduled tasks
- Error handling and retries

## Migration Progress

### Core Entities
- ✅ Vehicles
- ✅ Vehicle Logs
- ✅ Technicians
- ✅ Job Cards
- ✅ Products/Inventory

### API Routes
- ✅ `/api/vehicles/search`
- ✅ `/api/vehicles-by-company`
- ✅ `/api/vehicle-logs`
- ✅ `/api/job-cards`
- ✅ `/api/job-cards/[id]`
- ✅ `/api/product-items`
- ✅ `/api/product-items/[id]`
- ✅ `/api/product-items/[id]/stock`
- ✅ `/api/vehicles-ip`
- ✅ `/api/technicians`
- ✅ `/api/tech-user-info`
- ✅ `/api/technicians/jobs`
- ✅ `/api/vehicles-by-account`
- ⬜ Remaining vehicle endpoints
- ⬜ Remaining job card endpoints

## Best Practices

- Keep API routes thin
- Put business logic in services
- Data access only in repositories
- Always validate inputs
- Use type definitions
- Implement caching strategically
- Log operations consistently
- Handle errors properly
- Document public interfaces

## Adding New Features

When adding new features:

1. Define types in `lib/types/`
2. Create validation schemas
3. Implement repository in `lib/repositories/`
4. Implement service in `lib/services/`
5. Create API route in `app/api/`

## Migration Strategy

Existing API routes are being migrated to the new architecture incrementally. Each entity is migrated as a complete vertical slice (types, repositories, services, and API routes). This ensures that the functionality is preserved while improving the code structure.

## Benefits of the New Architecture

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Each layer can be tested in isolation
3. **Scalability**: Business logic is decoupled from data access and presentation
4. **Performance**: Strategic caching and optimization
5. **Error Handling**: Centralized error handling improves reliability
6. **Type Safety**: Comprehensive type definitions for all entities
