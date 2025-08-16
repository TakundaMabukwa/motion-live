import { z } from 'zod';
import { BadRequestError } from '@/lib/errors';

/**
 * Validate a request against a Zod schema
 * @param data Data to validate
 * @param schema Zod schema to validate against
 * @returns Validated data
 * @throws BadRequestError if validation fails
 */
export function validateRequest<T>(data: unknown, schema: z.ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => {
        return `${err.path.join('.')}: ${err.message}`;
      }).join(', ');
      
      throw new BadRequestError(`Validation error: ${formattedErrors}`);
    }
    
    throw new BadRequestError('Invalid request data');
  }
}

/**
 * Safely validate a request against a Zod schema without throwing
 * @param data Data to validate
 * @param schema Zod schema to validate against
 * @returns Object with success flag and either parsed data or error
 */
export function safeValidateRequest<T>(data: unknown, schema: z.ZodType<T>): 
  { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => {
        return `${err.path.join('.')}: ${err.message}`;
      }).join(', ');
      
      return { success: false, error: `Validation error: ${formattedErrors}` };
    }
    
    return { success: false, error: 'Invalid request data' };
  }
}

/**
 * Validate a value against a Zod schema
 * @param data Data to validate
 * @param schema Zod schema to validate against
 * @returns Object with success flag and either parsed data or Zod error
 */
export function safeValidate<T>(data: unknown, schema: z.ZodType<T>): 
  { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
