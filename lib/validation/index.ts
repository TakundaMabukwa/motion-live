import { ZodSchema } from 'zod';
import { ValidationError } from '@/lib/errors';

/**
 * Validate request data against a schema
 * @param data The data to validate
 * @param schema The zod schema to validate against
 * @returns Validated data or throws ValidationError
 */
export function validateRequest<T>(data: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  const errorMessage = result.error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
    
  throw new ValidationError(errorMessage);
}

/**
 * Safely validate request data without throwing
 * @param data The data to validate
 * @param schema The zod schema to validate against
 * @returns Object with success flag and data or error
 */
export function safeValidateRequest<T>(data: unknown, schema: ZodSchema<T>): 
  { success: true; data: T; } | { success: false; error: string; } {
  
  try {
    const validatedData = validateRequest(data, schema);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}
