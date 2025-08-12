import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    console.log('Fetching products for vehicle:', vehicleId);

    // For now, return mock data since we don't have a vehicle_products table yet
    // In a real implementation, you would query a vehicle_products table
    const mockProducts = [
      {
        id: `product-${vehicleId}-1`,
        name: "Skylink Pro",
        description: "Telematics Unit with Accelerometer and 4x inputs",
        type: "FMS",
        category: "HARDWARE",
        installation_price: 550,
        de_installation_price: 550,
        price: 1200,
        rental: 150,
      },
      {
        id: `product-${vehicleId}-2`,
        name: "GPS Tracker",
        description: "Real-time GPS tracking device",
        type: "FMS",
        category: "HARDWARE",
        installation_price: 300,
        de_installation_price: 300,
        price: 800,
        rental: 100,
      }
    ];

    return NextResponse.json({ 
      products: mockProducts,
      vehicle_id: vehicleId 
    });

  } catch (error) {
    console.error('Error in vehicle products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
