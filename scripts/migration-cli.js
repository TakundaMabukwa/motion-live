#!/usr/bin/env node

/**
 * Migration command line tool
 * 
 * This script provides a CLI for managing database migrations.
 * 
 * Usage:
 *   node migration-cli.js <command> [options]
 * 
 * Commands:
 *   init              Initialize the migrations system
 *   up, migrate       Run all pending migrations
 *   down, rollback    Rollback the last migration (or specify steps with --steps=N)
 *   create            Create a new migration file (requires --name=<migration-name>)
 * 
 * Options:
 *   --steps=N         Number of migrations to rollback (for down/rollback command)
 *   --name=NAME       Name of the migration to create (for create command)
 */

// Set up environment
require('dotenv').config();

const { runMigrationsCli } = require('../lib/database/migrations/migration-cli');
const { MigrationLoader } = require('../lib/database/migrations/migration-loader');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.error('No command specified');
  printUsage();
  process.exit(1);
}

// Parse options
const options = {};
args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value;
  }
});

// Handle create command separately
if (command === 'create') {
  if (!options.name) {
    console.error('Migration name is required for create command');
    console.error('Usage: node migration-cli.js create --name=<migration-name>');
    process.exit(1);
  }
  
  const migrationLoader = new MigrationLoader();
  migrationLoader.createMigrationFile(options.name)
    .then(filePath => {
      console.log(`Created migration file: ${filePath}`);
    })
    .catch(err => {
      console.error('Failed to create migration file:', err);
      process.exit(1);
    });
} else {
  // Run other migration commands
  runMigrationsCli(command, options)
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

function printUsage() {
  console.log(`
Migration CLI - Manage database migrations

Usage:
  node migration-cli.js <command> [options]

Commands:
  init              Initialize the migrations system
  up, migrate       Run all pending migrations
  down, rollback    Rollback the last migration (or specify steps with --steps=N)
  create            Create a new migration file (requires --name=<migration-name>)

Options:
  --steps=N         Number of migrations to rollback (for down/rollback command)
  --name=NAME       Name of the migration to create (for create command)
`);
}
