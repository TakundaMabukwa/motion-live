import { NextRequest, NextResponse } from 'next/server';
import { runMigrationsCli } from '@/lib/database/migrations/migration-cli';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateRequest } from '@/lib/api/validation';
import { z } from 'zod';

// Define schema for migration request
const migrationSchema = z.object({
  command: z.enum(['init', 'up', 'migrate', 'down', 'rollback']),
  options: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
});

/**
 * POST /api/admin/migrations
 * Run database migrations
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Validate the request
  const body = await validateRequest(req, migrationSchema);
  
  // Run the migration command
  await runMigrationsCli(body.command, body.options || {});
  
  // Return success response
  return NextResponse.json({ 
    success: true, 
    message: `Migration command '${body.command}' executed successfully` 
  });
});
