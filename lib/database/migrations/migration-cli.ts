import { MigrationManager } from './migration-manager';
import { createClient } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';

/**
 * CLI for running migrations
 */
export async function runMigrationsCli(command: string, options: Record<string, string | number | boolean> = {}) {
  const logger = new Logger('MigrationCLI');
  const supabase = createClient();
  const migrationManager = new MigrationManager(supabase);
  
  // Create the migrations table function if needed
  if (command === 'init') {
    logger.info('Initializing migrations system');
    await migrationManager.createMigrationsTableFunction();
    await migrationManager.initMigrationsTable();
    logger.info('Migrations system initialized');
    return;
  }
  
  // Run migrations
  if (command === 'up' || command === 'migrate') {
    logger.info('Running migrations');
    await migrationManager.migrateUp();
    return;
  }
  
  // Rollback migrations
  if (command === 'down' || command === 'rollback') {
    const stepsOption = options.steps;
    const steps = typeof stepsOption === 'string' ? parseInt(stepsOption, 10) : 
                  typeof stepsOption === 'number' ? stepsOption : 1;
                  
    logger.info(`Rolling back ${steps} migrations`);
    await migrationManager.migrateDown(steps);
    return;
  }
  
  // Unknown command
  logger.error(`Unknown command: ${command}`);
  console.log(`
Available commands:
  init              Initialize the migrations system
  up, migrate       Run all pending migrations
  down, rollback    Rollback the last migration (or specify steps with --steps=N)
  `);
}
