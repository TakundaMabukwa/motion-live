import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Endpoint disabled. Invoice numbers are now allocated only during invoice creation.',
      action_required:
        'Call an invoice create endpoint (job-card, account, or bulk account) and use the returned invoice_number.',
    },
    { status: 410 },
  );
}
