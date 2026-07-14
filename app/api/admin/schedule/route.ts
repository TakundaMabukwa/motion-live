import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'day';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data: jobs, error: jobsError } = await supabase
      .from('job_cards')
      .select(`
        id,
        job_number,
        job_date,
        due_date,
        start_time,
        end_time,
        status,
        job_status,
        job_type,
        job_sub_type,
        job_description,
        priority,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        contact_person,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        assigned_technician_id,
        technician_name,
        technician_phone,
        job_location,
        estimated_duration_hours,
        actual_duration_hours,
        estimated_cost,
        actual_cost,
        quotation_total_amount,
        quotation_subtotal,
        quotation_vat_amount,
        quotation_products,
        work_notes,
        completion_notes,
        special_instructions,
        role,
        parts_required,
        created_at
      `)
      .or('start_time.not.is.null')
      .order('start_time', { ascending: true });

    if (jobsError) {
      console.error('Error fetching schedule jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, email, color_code')
      .order('name');

    if (techError) {
      console.error('Error fetching technicians:', techError);
    }

    const colorByName: Record<string, string> = {};
    const colorByEmail: Record<string, string> = {};
    (technicians || []).forEach(tech => {
      if (tech.name) colorByName[tech.name.toLowerCase()] = tech.color_code || 'gray';
      if (tech.email) colorByEmail[tech.email.toLowerCase()] = tech.color_code || 'gray';
    });

    const processedJobs = (jobs || []).map(job => {
      let color = 'gray';
      if (job.technician_phone) {
        color = colorByEmail[job.technician_phone.toLowerCase()] || color;
      }
      if (color === 'gray' && job.technician_name) {
        color = colorByName[job.technician_name.toLowerCase()] || color;
      }
      return { ...job, technician_color: color };
    });

    const jobsByDate: Record<string, typeof processedJobs> = {};
    processedJobs.forEach(job => {
      let dateKey = 'no-date';
      const source = job.start_time;
      if (source) {
        const raw = String(source);
        dateKey = raw.split('T')[0].split(' ')[0] || 'no-date';
      }
      if (!jobsByDate[dateKey]) jobsByDate[dateKey] = [];
      jobsByDate[dateKey].push(job);
    });

    const techSet = new Map<string, { id: string; name: string; email: string; color_code: string; total_jobs: number }>();
    processedJobs.forEach(job => {
      const matchKey = (job.technician_phone || job.technician_name || '').toLowerCase();
      if (!matchKey) return;
      if (techSet.has(matchKey)) {
        techSet.get(matchKey)!.total_jobs++;
      } else {
        const tech = (technicians || []).find(t =>
          t.email?.toLowerCase() === matchKey || t.name?.toLowerCase() === matchKey
        );
        techSet.set(matchKey, {
          id: matchKey,
          name: job.technician_name || tech?.name || matchKey,
          email: job.technician_phone || tech?.email || '',
          color_code: job.technician_color,
          total_jobs: 1,
        });
      }
    });

    return NextResponse.json({
      jobs: processedJobs,
      jobsByDate,
      technicians: Array.from(techSet.values()),
      view,
      date,
      total: processedJobs.length,
    });

  } catch (error) {
    console.error('Error in admin schedule GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
