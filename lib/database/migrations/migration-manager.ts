import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logger';

/**
 * Migration interface
 */
export interface Migration {
  id: string;
  name: string;
  up: (client: SupabaseClient) => Promise<void>;
  down: (client: SupabaseClient) => Promise<void>;
}

/**
 * Migration manager for handling database migrations
 */
export class MigrationManager {
  private client: SupabaseClient;
  private migrations: Migration[] = [];
  private logger: Logger;
  
  /**
   * Create a new migration manager
   * @param client Supabase client
   */
  constructor(client: SupabaseClient) {
    this.client = client;
    this.logger = new Logger('MigrationManager');
  }
  
  /**
   * Register a migration
   * @param migration The migration to register
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    this.logger.debug(`Registered migration: ${migration.name}`, { id: migration.id });
  }
  
  /**
   * Initialize the migrations table if it doesn't exist
   */
  async initMigrationsTable(): Promise<void> {
    this.logger.info('Initializing migrations table');
    
    // Check if migrations table exists
    const { error: checkError } = await this.client.from('migrations').select('id').limit(1);
    
    // If the table doesn't exist, create it
    if (checkError && checkError.code === '42P01') { // relation does not exist
      this.logger.info('Creating migrations table');
      
      const { error } = await this.client.rpc('create_migrations_table');
      
      if (error) {
        this.logger.error('Failed to create migrations table', error);
        throw error;
      }
    }
  }
  
  /**
   * Run all pending migrations
   */
  async migrateUp(): Promise<void> {
    await this.initMigrationsTable();
    
    // Get all applied migrations
    const { data: appliedMigrations, error } = await this.client
      .from('migrations')
      .select('id')
      .order('applied_at', { ascending: true });
      
    if (error) {
      this.logger.error('Failed to get applied migrations', error);
      throw error;
    }
    
    const appliedIds = (appliedMigrations || []).map(m => m.id);
    
    // Sort migrations by ID (assuming sequential numbering)
    const pendingMigrations = this.migrations
      .filter(m => !appliedIds.includes(m.id))
      .sort((a, b) => a.id.localeCompare(b.id));
      
    this.logger.info(`Found ${pendingMigrations.length} pending migrations`);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      this.logger.info(`Applying migration: ${migration.name}`, { id: migration.id });
      
      try {
        await migration.up(this.client);
        
        // Record the migration
        await this.client.from('migrations').insert({
          id: migration.id,
          name: migration.name,
          applied_at: new Date().toISOString()
        });
        
        this.logger.info(`Migration applied: ${migration.name}`, { id: migration.id });
      } catch (error) {
        this.logger.error(`Failed to apply migration: ${migration.name}`, error as Error, { id: migration.id });
        throw error;
      }
    }
    
    this.logger.info('All migrations applied successfully');
  }
  
  /**
   * Rollback the last batch of migrations
   * @param steps Number of migrations to roll back (default: 1)
   */
  async migrateDown(steps: number = 1): Promise<void> {
    await this.initMigrationsTable();
    
    // Get the last 'steps' applied migrations
    const { data: appliedMigrations, error } = await this.client
      .from('migrations')
      .select('id, name')
      .order('applied_at', { ascending: false })
      .limit(steps);
      
    if (error) {
      this.logger.error('Failed to get applied migrations', error);
      throw error;
    }
    
    if (!appliedMigrations || appliedMigrations.length === 0) {
      this.logger.info('No migrations to roll back');
      return;
    }
    
    // Roll back each migration in reverse order
    for (const appliedMigration of appliedMigrations) {
      const migration = this.migrations.find(m => m.id === appliedMigration.id);
      
      if (!migration) {
        this.logger.warn(`Migration not found: ${appliedMigration.name}`, { id: appliedMigration.id });
        continue;
      }
      
      this.logger.info(`Rolling back migration: ${migration.name}`, { id: migration.id });
      
      try {
        await migration.down(this.client);
        
        // Remove the migration record
        await this.client
          .from('migrations')
          .delete()
          .eq('id', migration.id);
          
        this.logger.info(`Migration rolled back: ${migration.name}`, { id: migration.id });
      } catch (error) {
        this.logger.error(`Failed to roll back migration: ${migration.name}`, error as Error, { id: migration.id });
        throw error;
      }
    }
    
    this.logger.info(`Rolled back ${appliedMigrations.length} migrations`);
  }
  
  /**
   * Create a SQL function to set up the migrations table
   */
  async createMigrationsTableFunction(): Promise<void> {
    this.logger.info('Creating function to create migrations table');
    
    const { error } = await this.client.rpc('create_or_replace_function', {
      function_name: 'create_migrations_table',
      function_definition: `
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        RETURN TRUE;
      `
    });
    
    if (error) {
      this.logger.error('Failed to create function', error);
      throw error;
    }
    
    this.logger.info('Created function to create migrations table');
  }
}
