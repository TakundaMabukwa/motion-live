/**
 * Dynamically imports a module at runtime
 * Used for loading migration files
 * 
 * @param modulePath Path to the module to import
 * @returns The imported module
 */
export async function dynamicImport<T = unknown>(modulePath: string): Promise<T> {
  try {
    return await import(modulePath) as T;
  } catch (error) {
    console.error(`Failed to import module: ${modulePath}`, error);
    throw error;
  }
}
