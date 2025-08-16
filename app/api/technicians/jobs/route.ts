import { NextRequest, NextResponse } from 'next/server';
import { TechnicianService } from '@/lib/services/technician-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const technicianService = new TechnicianService();

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let user;
    try {
      user = await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId') || user.id;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;
    const detailed = searchParams.get('detailed');
    const format = searchParams.get('format');

    // Get user details
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, tech_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get jobs for technician using service
    const { jobs, count } = await technicianService.getTechnicianJobs({
      technicianId,
      startDate,
      endDate,
      status
    });

    if (detailed === 'true' || format === 'json') {
      // Return detailed job information with all fields
      return NextResponse.json({ 
        jobs: jobs || [],
        userRole: userData.tech_admin ? 'tech_admin' : 'technician',
        userEmail: userData.email,
        totalJobs: count,
        timestamp: new Date().toISOString(),
        fields: {
          basic: ['id', 'job_number', 'job_type', 'status', 'job_status', 'priority', 'job_description'],
          customer: ['customer_name', 'customer_email', 'customer_phone', 'customer_address', 'job_location'],
          vehicle: ['vehicle_registration', 'vehicle_make', 'vehicle_model', 'vin_numer', 'vehicle_year'],
          financial: ['estimated_cost', 'quotation_total_amount', 'actual_cost', 'quotation_subtotal'],
          timeline: ['created_at', 'due_date', 'start_time', 'completion_date', 'updated_at'],
          technical: ['technician_name', 'technician_phone', 'ip_address', 'qr_code', 'special_instructions'],
          additional: ['before_photos', 'after_photos', 'products_required', 'parts_required', 'equipment_used']
        }
      });
    }

    // Return standard response
    return NextResponse.json({ 
      jobs: jobs || [],
      userRole: userData.tech_admin ? 'tech_admin' : 'technician',
      userEmail: userData.email,
      count
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
