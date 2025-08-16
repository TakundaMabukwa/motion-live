import { Migration } from '@/lib/database/migrations/migration-manager';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Migration: Create RPC function for running SQL directly
 * Filename: 20230801000001_create_run_sql_function.ts
 */
export const migration: Migration = {
  id: '20230801000001',
  name: 'Create RPC function for running SQL directly',
  
  /**
   * Run the migration
   */
  async up(client: SupabaseClient): Promise<void> {
    // Execute migration SQL
    const { error } = await client.rpc('create_or_replace_function', {
      function_name: 'run_sql',
      function_definition: `
        BEGIN
          EXECUTE sql;
          RETURN TRUE;
        END;
      `,
      return_type: 'boolean',
      parameters: 'sql text'
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
        DROP FUNCTION IF EXISTS run_sql(text);
      `
    });
    
    if (error) throw error;
  }
};
