import { JobPhoto, VehicleDataForUpload, JobPhotoUpload } from '@/lib/types/api/job-photo';

/**
 * Repository for job photo operations
 */
export class JobPhotoRepository {
  /**
   * Upload job photos to storage and update job card with photo metadata
   * @param jobId The job card ID
   * @param jobNumber The job card number
   * @param photos Array of photos to upload
   * @param vehicleRegistration Optional vehicle registration to update
   * @param vehicleData Optional vehicle data to create or update
   * @returns Uploaded photos and metadata
   */
  async saveJobPhotos(
    jobId: string,
    jobNumber: string,
    photos: JobPhotoUpload[],
    vehicleRegistration?: string,
    vehicleData?: VehicleDataForUpload
  ): Promise<{ 
    photos: JobPhoto[]; 
    totalPhotos: number; 
    vehicleId: number | null 
  }> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // First, save vehicle data if it's new
    let vehicleId: number | null = null;
    if (vehicleData && !vehicleData.id) {
      // This is a new vehicle, save it to vehicles_ip table
      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles_ip')
        .insert({
          products: vehicleData.products || [],
          active: vehicleData.active !== undefined ? vehicleData.active : true,
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
        throw new Error(`Failed to save vehicle data: ${vehicleError.message}`);
      }

      vehicleId = newVehicle.id;
    } else if (vehicleData?.id) {
      vehicleId = vehicleData.id;
    }

    // Get existing photos from the job card
    const { data: existingJobCard, error: fetchError } = await supabase
      .from('job_cards')
      .select('before_photos, vehicle_registration, vehicle_id')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch existing job card: ${fetchError.message}`);
    }

    // Upload photos to Supabase storage bucket
    const uploadedPhotos: JobPhoto[] = [];
    
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
        const photoMetadata: JobPhoto = {
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
      throw new Error('Failed to upload any photos');
    }

    // Merge with existing photos and update job_cards table
    const existingPhotos = existingJobCard?.before_photos || [];
    const updatedPhotos = [...existingPhotos, ...uploadedPhotos];
    
    const updateData: Record<string, any> = {
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
      throw new Error(`Failed to update job card with photos: ${updateError.message}`);
    }

    return {
      photos: uploadedPhotos,
      totalPhotos: updatedPhotos.length,
      vehicleId
    };
  }
  
  /**
   * Get photos for a specific job
   * @param jobId Optional job ID to filter by
   * @param jobNumber Optional job number to filter by
   * @returns Job photos
   */
  async getJobPhotos(jobId?: string, jobNumber?: string): Promise<JobPhoto[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    if (!jobId && !jobNumber) {
      return [];
    }
    
    let query = supabase.from('job_cards').select('id, job_number, before_photos, after_photos');
    
    if (jobId) {
      query = query.eq('id', jobId);
    } else if (jobNumber) {
      query = query.eq('job_number', jobNumber);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return [];
      }
      throw error;
    }
    
    // Combine before and after photos
    const beforePhotos = (data?.before_photos || []) as JobPhoto[];
    const afterPhotos = (data?.after_photos || []) as JobPhoto[];
    
    return [...beforePhotos, ...afterPhotos];
  }
  
  /**
   * Check health of the job photos API
   * @returns Health check results
   */
  async checkHealth(): Promise<{ supabaseConnection: boolean; storageConnection: boolean }> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Check database connection
    let supabaseConnection = false;
    try {
      const { data, error } = await supabase
        .from('job_cards')
        .select('id')
        .limit(1);
      
      supabaseConnection = !error;
    } catch (error) {
      console.error('Health check - Supabase connection error:', error);
    }
    
    // Check storage connection
    let storageConnection = false;
    try {
      const { data, error } = await supabase.storage.getBucket('invoices');
      storageConnection = !error;
    } catch (error) {
      console.error('Health check - Storage connection error:', error);
    }
    
    return {
      supabaseConnection,
      storageConnection
    };
  }
}
