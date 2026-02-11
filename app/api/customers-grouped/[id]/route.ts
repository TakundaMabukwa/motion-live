import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const updateData = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Customer group ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // First, get the current contact_details
    const { data: currentData, error: fetchError } = await supabase
      .from('customers_grouped')
      .select('contact_details, legal_names')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current contact details:', fetchError);
      return NextResponse.json({ error: 'Customer group not found' }, { status: 404 });
    }

    // Merge existing contact_details with new data
    const existingContactDetails = currentData.contact_details || {};
    const updatedContactDetails = {
      ...existingContactDetails,
      ...updateData,
      // Always update the modified timestamp
      last_updated: new Date().toISOString()
    };

    // Update the contact_details JSONB field
    const { data, error } = await supabase
      .from('customers_grouped')
      .update({ 
        contact_details: updatedContactDetails 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer group:', error);
      return NextResponse.json({ error: 'Failed to update customer data' }, { status: 500 });
    }

    // Return the updated data in standard format
    const contactDetails = data.contact_details || {};
    
    const responseData = {
      id: data.id,
      company_group: data.company_group,
      legal_names: data.legal_names,
      all_new_account_numbers: data.all_new_account_numbers,
      
      // Contact details from updated JSONB field
      company: contactDetails.company || data.legal_names,
      legal_name: contactDetails.legal_name || data.legal_names,
      trading_name: contactDetails.trading_name || data.legal_names,
      email: contactDetails.email,
      cell_no: contactDetails.cell_no,
      switchboard: contactDetails.switchboard,
      
      // Address fields
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
      
      // Validation fields
      customer_validated: contactDetails.customer_validated || false,
      validated_by: contactDetails.validated_by,
      validated_at: contactDetails.validated_at,
      
      // Metadata
      last_updated: contactDetails.last_updated
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in customers-grouped update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
