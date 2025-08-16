import { MigrationManager } from './migration-manager';
import { MigrationLoader } from './migration-loader';
import { createClient } from '@/lib/supabase/server';

/**
 * Initialize the migration system and register all migrations
 */
export async function initMigrationSystem() {
  const supabase = createClient();
  const migrationManager = new MigrationManager(supabase);
  const migrationLoader = new MigrationLoader();
  
  // Load all migrations from the filesystem
  const migrations = await migrationLoader.loadMigrations();
  
  // Register all migrations with the manager
  migrations.forEach(migration => {
    migrationManager.register(migration);
  });
  
  return migrationManager;
}
