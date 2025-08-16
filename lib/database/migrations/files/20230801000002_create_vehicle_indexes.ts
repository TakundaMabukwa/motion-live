import { Migration } from '@/lib/database/migrations/migration-manager';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Migration: Create initial indexes for vehicles table
 * Filename: 20230801000002_create_vehicle_indexes.ts
 */
export const migration: Migration = {
  id: '20230801000002',
  name: 'Create initial indexes for vehicles table',
  
  /**
   * Run the migration
   */
  async up(client: SupabaseClient): Promise<void> {
    // Execute migration SQL
    const { error } = await client.rpc('run_sql', {
      sql: `
        -- Create index on VIN for faster lookups
        CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
        
        -- Create index on registration for faster lookups
        CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
        
        -- Create index on company_id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
        
        -- Create index on customer_id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
        
        -- Create index for full text search on vehicle data
        CREATE INDEX IF NOT EXISTS idx_vehicles_search ON vehicles
        USING gin(to_tsvector('english', 
          coalesce(make, '') || ' ' || 
          coalesce(model, '') || ' ' || 
          coalesce(registration, '') || ' ' || 
          coalesce(vin, '') || ' ' || 
          coalesce(color, '')
        ));
      `
    });
    
    if (error) throw error;
  },
  
  /**
   * Reverse the migration
   */
  async down(client: SupabaseClient): Promise<void> {
    // Execute rollback SQL
    const { error } = await client.rpc('run_sql', {
      sql: `
        -- Drop the indexes created in the up migration
        DROP INDEX IF EXISTS idx_vehicles_vin;
        DROP INDEX IF EXISTS idx_vehicles_registration;
        DROP INDEX IF EXISTS idx_vehicles_company_id;
        DROP INDEX IF EXISTS idx_vehicles_customer_id;
        DROP INDEX IF EXISTS idx_vehicles_search;
      `
    });
    
    if (error) throw error;
  }
};
