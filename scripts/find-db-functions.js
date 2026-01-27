// Find all database functions and check for payments sync
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('========================================');
  console.log('FINDING DATABASE FUNCTIONS');
  console.log('========================================\n');

  try {
    // Query to get all functions from information_schema
    const { data: functions, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          routine_name,
          routine_definition,
          routine_type,
          data_type,
          routine_schema
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        ORDER BY routine_name;
      `
    });

    if (error) {
      console.log('Trying alternative method...');
      
      // Alternative: Direct query to pg_proc
      const { data: altFunctions, error: altError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          ORDER BY p.proname;
        `
      });

      if (altError) {
        console.error('Error fetching functions:', altError);
        return;
      }

      console.log(`Found ${altFunctions?.length || 0} functions:\n`);
      
      altFunctions?.forEach((func, idx) => {
        console.log(`${idx + 1}. ${func.function_name}`);
        
        const def = func.function_definition?.toLowerCase() || '';
        const isPaymentRelated = def.includes('payment') || def.includes('vehicle') || 
                                def.includes('sync') || def.includes('populate');
        
        if (isPaymentRelated) {
          console.log('   🎯 POTENTIALLY RELEVANT FOR PAYMENTS SYNC');
          console.log('   Definition preview:', func.function_definition?.substring(0, 200) + '...');
        }
        console.log('');
      });

      return;
    }

    console.log(`Found ${functions?.length || 0} functions:\n`);
    
    functions?.forEach((func, idx) => {
      console.log(`${idx + 1}. ${func.routine_name} (${func.routine_type})`);
      
      const def = func.routine_definition?.toLowerCase() || '';
      const isPaymentRelated = def.includes('payment') || def.includes('vehicle') || 
                              def.includes('sync') || def.includes('populate');
      
      if (isPaymentRelated) {
        console.log('   🎯 POTENTIALLY RELEVANT FOR PAYMENTS SYNC');
        console.log('   Definition preview:', func.routine_definition?.substring(0, 200) + '...');
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Fallback: Try to list functions using a simpler approach
    console.log('\nTrying simpler approach...');
    
    const { data, error: simpleError } = await supabase
      .from('pg_proc')
      .select('proname')
      .limit(10);
      
    if (simpleError) {
      console.log('Cannot access pg_proc directly. Checking for known function patterns...');
      
      // Check if we can call any known functions
      const knownFunctions = [
        'sync_payments_from_vehicles',
        'populate_payments_table', 
        'update_payments_from_vehicles',
        'refresh_payments_data',
        'calculate_payments'
      ];
      
      for (const funcName of knownFunctions) {
        try {
          const { error: testError } = await supabase.rpc(funcName);
          if (!testError || !testError.message.includes('function') || !testError.message.includes('does not exist')) {
            console.log(`✅ Found function: ${funcName}`);
          }
        } catch (e) {
          // Function doesn't exist
        }
      }
    }
  }
}

main().catch(console.error);