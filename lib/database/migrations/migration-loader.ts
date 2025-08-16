import fs from 'fs';
import path from 'path';
import { MigrationFactory } from './migration-factory';
import { Migration } from './migration-manager';
import { Logger } from '@/lib/logger';
import { dynamicImport } from '@/lib/utils/dynamic-import';

const MIGRATIONS_DIR = path.join(process.cwd(), 'lib', 'database', 'migrations', 'files');

/**
 * Migration loader for loading migrations from the filesystem
 */
export class MigrationLoader {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('MigrationLoader');
  }
  
  /**
   * Load all migrations from the migrations directory
   * @returns Array of migrations
   */
  async loadMigrations(): Promise<Migration[]> {
    this.logger.info('Loading migrations from filesystem');
    
    try {
      // Ensure migrations directory exists
      await this.ensureMigrationsDirectory();
      
      // Get all migration files
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
        .sort();
        
      this.logger.debug(`Found ${files.length} migration files`);
      
      // Load each migration
      const migrations: Migration[] = [];
      
      for (const file of files) {
        try {
          const filePath = path.join(MIGRATIONS_DIR, file);
          const migrationModule = await dynamicImport<{ migration: Migration }>(filePath);
          
          if (migrationModule.migration && 
              typeof migrationModule.migration.up === 'function' && 
              typeof migrationModule.migration.down === 'function') {
            
            migrations.push(migrationModule.migration);
            this.logger.debug(`Loaded migration: ${migrationModule.migration.name}`, { 
              id: migrationModule.migration.id,
              file 
            });
          } else {
            this.logger.warn(`Invalid migration file: ${file}`);
          }
        } catch (error) {
          this.logger.error(`Failed to load migration file: ${file}`, error as Error);
        }
      }
      
      this.logger.info(`Loaded ${migrations.length} migrations`);
      return migrations;
    } catch (error) {
      this.logger.error('Failed to load migrations', error as Error);
      return [];
    }
  }
  
  /**
   * Create a new migration file
   * @param name Name of the migration
   * @returns Path to the created migration file
   */
  async createMigrationFile(name: string): Promise<string> {
    await this.ensureMigrationsDirectory();
    
    const template = MigrationFactory.createMigrationFileTemplate(name);
    const id = MigrationFactory.generateMigrationId();
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${id}_${sanitizedName}.ts`;
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    fs.writeFileSync(filePath, template);
    
    this.logger.info(`Created migration file: ${filename}`);
    return filePath;
  }
  
  /**
   * Ensure the migrations directory exists
   */
  private async ensureMigrationsDirectory(): Promise<void> {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      this.logger.info(`Creating migrations directory: ${MIGRATIONS_DIR}`);
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }
  }
}
