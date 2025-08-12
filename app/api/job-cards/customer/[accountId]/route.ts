import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;
    
    console.log('Fetching job cards for account ID:', accountId);

    // First, let's check if there are any job cards at all
    const { data: allJobCards, error: allError } = await supabase
      .from('job_cards')
      .select('*')
      .limit(5);

    console.log('All job cards sample:', allJobCards);
    console.log('Account ID type:', typeof accountId, 'Value:', accountId);

    // Since account_id expects UUID but we have a numeric ID, let's try different approaches
    
    // First, let's get the customer details to find the customer name
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('company, trading_name, legal_name')
      .eq('id', accountId)
      .single();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
    }

    console.log('Customer details:', customer);

    // Try to find job cards by customer name
    let jobCards = [];
    let error = null;

    if (customer) {
      // Try multiple name variations
      const customerNames = [
        customer.company,
        customer.trading_name,
        customer.legal_name
      ].filter(Boolean);

      console.log('Searching for customer names:', customerNames);

      for (const name of customerNames) {
        const { data: cardsByName, error: nameError } = await supabase
          .from('job_cards')
          .select('*')
          .ilike('customer_name', '%' + name + '%')
          .order('job_date', { ascending: false });

        if (nameError) {
          console.error('Error searching by name:', nameError);
          error = nameError;
        } else if (cardsByName && cardsByName.length > 0) {
          console.log(`Found ${cardsByName.length} job cards for customer name: ${name}`);
          jobCards = cardsByName;
          break;
        }
      }
    }

    // If still no job cards found, try a broader search
    if (!jobCards || jobCards.length === 0) {
      console.log('No job cards found by customer name, trying broader search...');
      
      // Get all job cards to see what's available
      const { data: allJobCards, error: allError } = await supabase
        .from('job_cards')
        .select('*')
        .limit(20);

      if (allError) {
        console.error('Error fetching all job cards:', allError);
        error = allError;
      } else {
        console.log('Available job cards:', allJobCards);
        // For now, return empty array but log what we found
        jobCards = [];
      }
    }

    return NextResponse.json({ jobCards: jobCards || [] });
  } catch (error) {
    console.error('Error in customer job cards GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 