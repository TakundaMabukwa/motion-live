import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Execute a function within a database transaction
 * @param client Supabase client
 * @param callback Function to execute within the transaction
 * @returns Result of the callback function
 */
export async function withTransaction<T>(
  client: SupabaseClient, 
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Start transaction
  await client.rpc('begin_transaction');
  
  try {
    // Execute the callback
    const result = await callback(client);
    
    // Commit transaction
    await client.rpc('commit_transaction');
    
    return result;
  } catch (error) {
    // Rollback transaction on error
    await client.rpc('rollback_transaction');
    throw error;
  }
}

/**
 * Create a stored procedure in Supabase for transaction handling
 * This function should be run once to set up the transaction helpers
 */
export async function setupTransactionHelpers(client: SupabaseClient): Promise<void> {
  // Create begin_transaction function
  await client.rpc('create_or_replace_function', {
    function_name: 'begin_transaction',
    function_definition: `
      BEGIN;
      RETURN TRUE;
    `
  });
  
  // Create commit_transaction function
  await client.rpc('create_or_replace_function', {
    function_name: 'commit_transaction',
    function_definition: `
      COMMIT;
      RETURN TRUE;
    `
  });
  
  // Create rollback_transaction function
  await client.rpc('create_or_replace_function', {
    function_name: 'rollback_transaction',
    function_definition: `
      ROLLBACK;
      RETURN TRUE;
    `
  });
}
