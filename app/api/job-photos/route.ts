import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { jobNumber, vehicleRegistration, photos, vehicleData } = await request.json();

    if (!jobNumber || !photos || !Array.isArray(photos)) {
      return NextResponse.json(
        { error: 'Missing required fields: jobNumber and photos array' },
        { status: 400 }
      );
    }

    const supabase = createClient();

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

    // Update job_cards table with before_photos JSONB and vehicle info
    const { error: updateError } = await supabase
      .from('job_cards')
      .update({
        before_photos: uploadedPhotos,
        vehicle_registration: vehicleRegistration || vehicleData?.new_registration,
        vehicle_id: vehicleId,
        updated_at: new Date().toISOString()
      })
      .eq('job_number', jobNumber);

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
    const jobNumber = searchParams.get('jobNumber');

    if (!jobNumber) {
      return NextResponse.json(
        { error: 'Job number parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get photos from job_cards before_photos field
    const { data: jobCard, error } = await supabase
      .from('job_cards')
      .select('before_photos, after_photos')
      .eq('job_number', jobNumber)
      .single();

    if (error) {
      throw error;
    }

    const photos = {
      before: jobCard?.before_photos || [],
      after: jobCard?.after_photos || []
    };

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching job photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job photos' },
      { status: 500 }
    );
  }
}
