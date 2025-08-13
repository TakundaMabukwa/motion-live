import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { jobId, jobNumber, vehicleRegistration, photos, vehicleData } = await request.json();

    if (!jobId || !photos || !Array.isArray(photos)) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId and photos array' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First, save vehicle data if it's new
    let vehicleId = null;
    if (vehicleData && !vehicleData.id) {
      // This is a new vehicle, save it to vehicles_ip table
      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles_ip')
        .insert({
          products: vehicleData.products || [],
          active: vehicleData.active || true,
          group_name: vehicleData.group_name,
          new_registration: vehicleData.new_registration,
          beame_1: vehicleData.beame_1,
          beame_2: vehicleData.beame_2,
          beame_3: vehicleData.beame_3,
          ip_address: vehicleData.ip_address,
          new_account_number: vehicleData.new_account_number,
          vin_number: vehicleData.vin_number,
          company: vehicleData.company,
          comment: vehicleData.comment
        })
        .select('id')
        .single();

      if (vehicleError) {
        console.error('Error saving vehicle:', vehicleError);
        return NextResponse.json(
          { error: 'Failed to save vehicle data' },
          { status: 500 }
        );
      }

      vehicleId = newVehicle.id;
    }

    // Get existing photos from the job card
    const { data: existingJobCard, error: fetchError } = await supabase
      .from('job_cards')
      .select('before_photos, vehicle_registration, vehicle_id')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.error('Error fetching existing job card:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing job card' },
        { status: 500 }
      );
    }

    // Upload photos to Supabase storage bucket
    const uploadedPhotos = [];
    
    for (const photo of photos) {
      try {
        // Convert data URL to blob
        const response = await fetch(photo.url);
        const blob = await response.blob();
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const filename = `job_${jobNumber}_before_${timestamp}_${randomId}.jpg`;
        
        // Upload to invoices bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(`job-photos/${filename}`, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(`job-photos/${filename}`);

        // Store photo metadata
        const photoMetadata = {
          id: photo.id,
          filename: filename,
          storage_path: `job-photos/${filename}`,
          public_url: urlData.publicUrl,
          description: photo.description,
          timestamp: photo.timestamp,
          type: 'before',
          uploaded_at: new Date().toISOString()
        };

        uploadedPhotos.push(photoMetadata);
        
      } catch (error) {
        console.error('Error processing photo:', error);
        continue;
      }
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any photos' },
        { status: 500 }
      );
    }

    // Merge with existing photos and update job_cards table
    const existingPhotos = existingJobCard?.before_photos || [];
    const updatedPhotos = [...existingPhotos, ...uploadedPhotos];
    
    const updateData: any = {
      before_photos: updatedPhotos,
      updated_at: new Date().toISOString()
    };

    // Update vehicle info if provided
    if (vehicleRegistration) {
      updateData.vehicle_registration = vehicleRegistration;
    }
    if (vehicleId) {
      updateData.vehicle_id = vehicleId;
    }

    const { error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job card with photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      totalPhotos: updatedPhotos.length,
      vehicleId,
      message: `${uploadedPhotos.length} photos uploaded and saved successfully`
    });

  } catch (error) {
    console.error('Error saving job photos:', error);
    return NextResponse.json(
      { error: 'Failed to save job photos' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const jobNumber = searchParams.get('jobNumber');

    console.log('GET /api/job-photos - Params:', { jobId, jobNumber });

    // Health check endpoint
    if (!jobId && !jobNumber) {
      try {
        const supabase = await createClient();
        const { data: testData, error: testError } = await supabase
          .from('job_cards')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.error('Health check failed:', testError);
          return NextResponse.json(
            { error: 'Health check failed', details: testError.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ 
          status: 'healthy', 
          message: 'Job photos API is working',
          database: 'connected',
          timestamp: new Date().toISOString()
        });
      } catch (healthError) {
        console.error('Health check error:', healthError);
        return NextResponse.json(
          { error: 'Health check error', details: healthError instanceof Error ? healthError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Validate UUID format if jobId is provided
    if (jobId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      console.error('Invalid jobId format:', jobId);
      return NextResponse.json(
        { error: 'Invalid jobId format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    console.log('Supabase client created successfully');

    // Test Supabase connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('job_cards')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        return NextResponse.json(
          { error: 'Database connection failed', details: testError.message },
          { status: 500 }
        );
      }
      console.log('Supabase connection test successful');
    } catch (testError) {
      console.error('Supabase connection test error:', testError);
      return NextResponse.json(
        { error: 'Database connection test failed' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('job_cards')
      .select('id, before_photos, after_photos, vehicle_registration');

    if (jobId) {
      query = query.eq('id', jobId);
      console.log('Querying by jobId:', jobId);
    } else if (jobNumber) {
      query = query.eq('job_number', jobNumber);
      console.log('Querying by jobNumber:', jobNumber);
    }

    const { data: jobCard, error } = await query.single();
    console.log('Query result:', { jobCard: !!jobCard, error: error?.message });

    if (error) {
      console.error('Error fetching job card:', error);
      
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found', details: 'No job card found with the provided ID or number' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch job card', details: error.message },
        { status: 500 }
      );
    }

    if (!jobCard) {
      console.log('No job card found for:', { jobId, jobNumber });
      return NextResponse.json({ 
        photos: { before: [], after: [] },
        jobId: null,
        vehicleRegistration: null
      });
    }

    const photos = {
      before: jobCard?.before_photos || [],
      after: jobCard?.after_photos || []
    };

    console.log('Returning photos:', { 
      beforeCount: photos.before.length, 
      afterCount: photos.after.length 
    });

    return NextResponse.json({ 
      photos,
      jobId: jobCard?.id,
      vehicleRegistration: jobCard?.vehicle_registration
    });
  } catch (error) {
    console.error('Error fetching job photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
