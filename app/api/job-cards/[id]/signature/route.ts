import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { signature, client_name, sign_off_date } = body;

    if (!signature) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `signatures/${id}/${Date.now()}_signature.png`;

    const { error: uploadError } = await serviceSupabase.storage
      .from('signatures')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload signature' }, { status: 500 });
    }

    const { data: urlData } = serviceSupabase.storage
      .from('signatures')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await serviceSupabase
      .from('job_cards')
      .update({
        client_signature: publicUrl,
        client_name: client_name || null,
        customer_signature_obtained: true,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Signature route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
