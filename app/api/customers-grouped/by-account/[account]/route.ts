import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { account: string } }
) {
  try {
    const { account } = params;

    console.log('Looking for customer with account:', account);

    if (!account) {
      return NextResponse.json({ error: 'Account parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // First, let's try to find by exact match in comma-separated list
    const { data: customerGroups, error: searchError } = await supabase
      .from('customers_grouped')
      .select('*');

    if (searchError) {
      console.error('Error searching customer groups:', searchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`Found ${customerGroups.length} customer groups to search through`);

    // Find matching group by checking if account exists in comma-separated list
    const customerGroup = customerGroups.find(group => {
      const accounts = (group.all_new_account_numbers || '').split(',').map(a => a.trim());
      const hasMatch = accounts.some(acc => acc === account || account.includes(acc) || acc.includes(account));
      if (hasMatch) {
        console.log(`Match found in group ${group.id}: ${group.legal_names}`);
        console.log(`Group accounts: ${accounts.join(', ')}`);
      }
      return hasMatch;
    });

    if (!customerGroup) {
      console.log('No matching customer group found');
      console.log('Available accounts:', customerGroups.slice(0, 5).map(g => 
        `${g.legal_names}: ${g.all_new_account_numbers}`
      ));
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse contact_details JSON and merge with other fields
    const contactDetails = customerGroup.contact_details || {};
    
    const responseData = {
      id: customerGroup.id,
      company_group: customerGroup.company_group,
      legal_names: customerGroup.legal_names,
      all_new_account_numbers: customerGroup.all_new_account_numbers,
      
      // Contact details from JSONB field
      company: contactDetails.company || customerGroup.legal_names,
      legal_name: contactDetails.legal_name || customerGroup.legal_names,
      trading_name: contactDetails.trading_name || customerGroup.legal_names,
      email: contactDetails.email,
      cell_no: contactDetails.cell_no,
      switchboard: contactDetails.switchboard,
      
      // Address fields from JSONB
      physical_address_1: contactDetails.physical_address_1,
      physical_address_2: contactDetails.physical_address_2,
      physical_address_3: contactDetails.physical_address_3,
      physical_area: contactDetails.physical_area,
      physical_province: contactDetails.physical_province,
      physical_code: contactDetails.physical_code,
      physical_country: contactDetails.physical_country,
      
      postal_address_1: contactDetails.postal_address_1,
      postal_address_2: contactDetails.postal_address_2,
      postal_area: contactDetails.postal_area,
      postal_province: contactDetails.postal_province,
      postal_code: contactDetails.postal_code,
      postal_country: contactDetails.postal_country,
      
      // Validation fields from JSONB
      customer_validated: contactDetails.customer_validated || false,
      validated_by: contactDetails.validated_by,
      validated_at: contactDetails.validated_at,
      
      // Account number for display
      new_account_number: account
    };

    console.log('Returning customer data for:', responseData.company || responseData.legal_names);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in customers-grouped API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}