#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateAccountCode(companyName) {
  if (!companyName) return 'UNKN';
  
  // Remove common words and extract meaningful parts
  const cleanName = companyName
    .replace(/\(PTY\)\s*LTD/gi, '')
    .replace(/\(PTY\)/gi, '')
    .replace(/\sLTD$/gi, '')
    .replace(/\sCC$/gi, '')
    .replace(/\sLIMITED$/gi, '')
    .replace(/\sTRADING\s\d+/gi, '')
    .replace(/\sFAMILY\s*TRUST/gi, '')
    .replace(/\sHOLDINGS/gi, '')
    .replace(/\sPROPERTIES/gi, '')
    .replace(/\sSERVICES/gi, '')
    .replace(/\sPROJECTS/gi, '')
    .replace(/\sGROUP/gi, '')
    .replace(/\s-\s.*$/gi, '') // Remove everything after " - "
    .trim();

  // Split into words and take first 4 characters of meaningful words
  const words = cleanName.split(/\s+/).filter(word => 
    word.length > 2 && 
    !['THE', 'AND', 'FOR', 'WITH'].includes(word.toUpperCase())
  );

  let code = '';
  if (words.length >= 2) {
    // Take first 2 chars from first 2 words
    code = words[0].substring(0, 2) + words[1].substring(0, 2);
  } else if (words.length === 1) {
    // Take first 4 chars from single word
    code = words[0].substring(0, 4);
  } else {
    // Fallback: take first 4 chars from original name
    code = companyName.replace(/[^A-Z]/g, '').substring(0, 4);
  }

  return code.toUpperCase().padEnd(4, 'X');
}

async function generateNewAccountCodes() {
  try {
    console.log('📖 Reading customers.json...');
    const customersData = JSON.parse(fs.readFileSync('customers.json', 'utf8'));
    
    console.log(`📊 Found ${customersData.length} customer records`);

    const updates = [];
    const usedCodes = new Set();

    customersData.forEach(customer => {
      if (!customer.company_group) {
        console.log(`⚠️ Skipping customer ${customer.id} - no company_group`);
        return;
      }
      
      let baseCode = generateAccountCode(customer.company_group);
      
      // Ensure uniqueness
      let counter = 1;
      let finalCode = `${baseCode}-${counter.toString().padStart(4, '0')}`;
      
      while (usedCodes.has(finalCode)) {
        counter++;
        finalCode = `${baseCode}-${counter.toString().padStart(4, '0')}`;
      }
      
      usedCodes.add(finalCode);
      
      updates.push({
        id: customer.id,
        company_group: customer.company_group,
        new_code: finalCode,
        old_code: customer.all_new_account_numbers
      });
    });

    console.log('🔄 Generated new account codes:');
    updates.slice(0, 10).forEach(update => {
      console.log(`  ${update.company_group} → ${update.new_code}`);
    });

    // Update customers_grouped table
    console.log('\n📤 Updating customers_grouped table...');
    let updated = 0;

    for (const update of updates) {
      const { error } = await supabase
        .from('customers_grouped')
        .update({ 
          all_new_account_numbers: update.new_code,
          cost_code: update.new_code
        })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Error updating ${update.company_group}:`, error.message);
      } else {
        updated++;
      }
    }

    console.log(`🎉 Successfully updated ${updated} customer records`);

    // Save mapping to file
    const mapping = updates.map(u => ({
      company: u.company_group,
      old_code: u.old_code,
      new_code: u.new_code
    }));

    fs.writeFileSync('account-code-mapping.json', JSON.stringify(mapping, null, 2));
    console.log('💾 Saved mapping to account-code-mapping.json');

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateNewAccountCodes();
}