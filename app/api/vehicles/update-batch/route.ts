import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const body = await request.json();
    const { vehicles } = body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: 'Invalid vehicles data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Update each vehicle
    const updatePromises = vehicles.map(vehicle => {
      const { id, ...updateData } = vehicle;
      return supabase
        .from('vehicles_ip')
        .update(updateData)
        .eq('id', id);
    });

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const hasError = results.some(r => r.error);
    if (hasError) {
      throw new Error('One or more updates failed');
    }

    return NextResponse.json({
      success: true,
      updated: vehicles.length
    });
  } catch (error) {
    console.error('Error updating vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicles' },
      { status: 500 }
    );
  }
}
