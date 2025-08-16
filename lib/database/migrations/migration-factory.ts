import { SupabaseClient } from '@supabase/supabase-js';
import { Migration } from './migration-manager';
import { formatDate } from '@/lib/utils/date-utils';

/**
 * Migration factory for creating new migrations
 */
export class MigrationFactory {
  /**
   * Create a new migration
   * 
   * @param name Name of the migration
   * @param up Function to run when migrating up
   * @param down Function to run when migrating down
   * @returns A new Migration
   */
  static create(
    name: string, 
    up: (client: SupabaseClient) => Promise<void>,
    down: (client: SupabaseClient) => Promise<void>
  ): Migration {
    // Generate an ID based on timestamp
    const id = this.generateMigrationId();
    
    return {
      id,
      name,
      up,
      down
    };
  }
  
  /**
   * Generate a new migration ID based on the current timestamp
   * Format: YYYYMMDDHHMMSS
   */
  static generateMigrationId(): string {
    const now = new Date();
    return formatDate(now, 'yyyyMMddHHmmss');
  }
  
  /**
   * Create a migration file template
   * 
   * @param name Name of the migration
   * @returns Migration file content
   */
  static createMigrationFileTemplate(name: string): string {
    const id = this.generateMigrationId();
    // Format the name for potential filename use
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `import { Migration } from '@/lib/database/migrations/migration-manager';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Migration: ${name}
 * Filename: ${id}_${sanitizedName}.ts
 */
export const migration: Migration = {
  id: '${id}',
  name: '${name}',
  
  /**
   * Run the migration
   */
  async up(client: SupabaseClient): Promise<void> {
    // Execute migration SQL
    const { error } = await client.rpc('run_sql', {
      sql: \`
        -- Add your SQL here
        
      \`
    });
    
    if (error) throw error;
  },
  
  /**
   * Reverse the migration
   */
  async down(client: SupabaseClient): Promise<void> {
    // Execute rollback SQL
    const { error } = await client.rpc('run_sql', {
      sql: \`
        -- Add your rollback SQL here
        
      \`
    });
    
    if (error) throw error;
  }
};
`;
  }
}
