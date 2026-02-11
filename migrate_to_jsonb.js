require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateDataToJSON() {
  console.log('🔄 Migrating customer data to JSONB format...\n');
  
  try {
    // Step 1: Get all customers_grouped records
    const { data: groups, error: groupsError } = await supabase
      .from('customers_grouped')
      .select('*');
      
    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError);
      return;
    }
    
    console.log(`📊 Found ${groups.length} customer groups to migrate`);

    // Step 2: For each group, find corresponding customers data and migrate
    let migratedCount = 0;
    for (const group of groups) {
      const accounts = group.all_new_account_numbers ? 
        group.all_new_account_numbers.split(',').map(a => a.trim()) : [];
      
      if (accounts.length === 0) continue;
      
      console.log(`\n🔍 Processing group ${group.id}: ${group.legal_names}`);
      console.log(`   Accounts: ${accounts.join(', ')}`);
      
      // Find customers data for these accounts
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*')
        .in('new_account_number', accounts);
        
      if (custError) {
        console.error(`❌ Error fetching customers for group ${group.id}:`, custError);
        continue;
      }
      
      if (customers.length === 0) {
        console.log(`⚠️  No customer data found for accounts: ${accounts.join(', ')}`);
        continue;
      }
      
      // Use the first customer's data as primary, but merge contact info from all
      const primaryCustomer = customers[0];
      const allEmails = customers.map(c => c.email).filter(e => e).join(', ');
      const allPhones = customers.map(c => c.cell_no).filter(p => p).join(', ');
      
      // Build contact_details JSON object
      const contactDetails = {
        // Basic Info
        company: primaryCustomer.company || group.legal_names,
        legal_name: primaryCustomer.legal_name || group.legal_names,
        trading_name: primaryCustomer.trading_name || group.legal_names,
        
        // Contact Info
        email: allEmails || primaryCustomer.email,
        cell_no: allPhones || primaryCustomer.cell_no,
        switchboard: primaryCustomer.switchboard,
        
        // Address Info
        physical_address_1: primaryCustomer.physical_address_1,
        physical_address_2: primaryCustomer.physical_address_2,
        physical_address_3: primaryCustomer.physical_address_3,
        physical_area: primaryCustomer.physical_area,
        physical_province: primaryCustomer.physical_province,
        physical_code: primaryCustomer.physical_code,
        physical_country: primaryCustomer.physical_country,
        
        postal_address_1: primaryCustomer.postal_address_1,
        postal_address_2: primaryCustomer.postal_address_2,
        postal_area: primaryCustomer.postal_area,
        postal_province: primaryCustomer.postal_province,
        postal_code: primaryCustomer.postal_code,
        postal_country: primaryCustomer.postal_country,
        
        // Additional Info
        vat_number: primaryCustomer.vat_number,
        registration_number: primaryCustomer.registration_number,
        payment_terms: primaryCustomer.payment_terms,
        category: primaryCustomer.category,
        
        // Validation Status
        customer_validated: primaryCustomer.customer_validated || false,
        validated_by: primaryCustomer.validated_by,
        validated_at: primaryCustomer.validated_at,
        
        // Metadata
        migrated_from_customers_table: true,
        migration_date: new Date().toISOString(),
        source_customer_ids: customers.map(c => c.id)
      };
      
      // Update the customers_grouped record
      const { error: updateError } = await supabase
        .from('customers_grouped')
        .update({ contact_details: contactDetails })
        .eq('id', group.id);
        
      if (updateError) {
        console.error(`❌ Error updating group ${group.id}:`, updateError);
        continue;
      }
      
      migratedCount++;
      console.log(`✅ Migrated ${customers.length} customer records to group ${group.id}`);
      console.log(`   Company: ${contactDetails.company}`);
      console.log(`   Email: ${contactDetails.email || 'None'}`);
      console.log(`   Phone: ${contactDetails.cell_no || 'None'}`);
    }
    
    console.log(`\n🎉 Migration complete! ${migratedCount}/${groups.length} groups migrated successfully`);
    
    // Step 3: Verify migration
    console.log('\n🔍 Verifying migration...');
    const { data: updatedGroups, error: verifyError } = await supabase
      .from('customers_grouped')
      .select('id, legal_names, contact_details')
      .not('contact_details', 'is', null)
      .limit(3);
      
    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
      return;
    }
    
    console.log(`✅ ${updatedGroups.length} groups now have contact_details`);
    
    if (updatedGroups.length > 0) {
      console.log('\n📋 Sample migrated record:');
      const sample = updatedGroups[0];
      console.log(`Group: ${sample.legal_names}`);
      console.log(`Contact Details Keys: ${Object.keys(sample.contact_details).join(', ')}`);
      
      // Show a few key fields
      const cd = sample.contact_details;
      console.log(`  Company: ${cd.company}`);
      console.log(`  Email: ${cd.email || 'None'}`);
      console.log(`  Phone: ${cd.cell_no || 'None'}`);
      console.log(`  Validated: ${cd.customer_validated}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateDataToJSON().catch(console.error);