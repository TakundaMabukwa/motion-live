#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignMultiBranchCodes() {
  try {
    console.log('🏢 Assigning multi-branch codes...');
    
    // Define company patterns and their base codes
    const companyPatterns = [
      { keyword: 'WATERFORD', baseCode: 'WACA', customer: 'WATERFORD CARRIERS (PTY) LTD' },
      { keyword: 'KARGO', baseCode: 'KARG', customer: 'KARGO' },
      { keyword: 'LTS', baseCode: 'LTSX', customer: 'LTS' },
      { keyword: 'SPAR', baseCode: 'SPAR', customer: 'THE SPAR GROUP LIMITED' },
      { keyword: 'TYRE SOLUTIONS', baseCode: 'TYSO', customer: 'TYRE SOLUTIONS - (SG MOBILITY)' },
      { keyword: 'AVIS VAN', baseCode: 'AVVA', customer: 'AVIS VAN' },
      { keyword: 'EDGE', baseCode: 'EDGE', customer: 'EDGE - MY CITI' }
    ];
    
    for (const pattern of companyPatterns) {
      console.log(`\n🔍 Processing ${pattern.keyword} companies...`);
      
      // Find all vehicles containing the keyword
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, company')
        .ilike('company', `%${pattern.keyword}%`);
        
      if (error) {
        console.error(`❌ Error fetching ${pattern.keyword} vehicles:`, error.message);
        continue;
      }
      
      if (vehicles.length === 0) {
        console.log(`   No vehicles found for ${pattern.keyword}`);
        continue;
      }
      
      console.log(`   Found ${vehicles.length} vehicles`);
      
      // Group vehicles by unique company names
      const uniqueCompanies = [...new Set(vehicles.map(v => v.company))];
      console.log(`   Unique companies: ${uniqueCompanies.length}`);
      
      const allCodes = [];
      let counter = 1;
      
      // Assign codes to each unique company
      for (const companyName of uniqueCompanies) {
        const code = `${pattern.baseCode}-${counter.toString().padStart(4, '0')}`;
        allCodes.push(code);
        
        // Update vehicles for this specific company
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: code })
          .eq('company', companyName);
          
        if (!updateError) {
          const companyVehicles = vehicles.filter(v => v.company === companyName);
          console.log(`   ✅ ${companyName} → ${code} (${companyVehicles.length} vehicles)`);
        }
        
        counter++;
      }
      
      // Update customer record with all codes
      const allCodesString = allCodes.join(',');
      const { error: customerError } = await supabase
        .from('customers_grouped')
        .update({ all_new_account_numbers: allCodesString })
        .eq('company_group', pattern.customer);
        
      if (!customerError) {
        console.log(`   ✅ Updated customer ${pattern.customer} with codes: ${allCodesString}`);
      } else {
        console.log(`   ⚠️  Customer ${pattern.customer} not found in customers_grouped`);
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignMultiBranchCodes();
}