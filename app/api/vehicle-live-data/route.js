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
    const accountNumber = searchParams.get('account_number');
    const getAllVehicles = searchParams.get('all') === 'true' || request.url.includes('/all');

    console.log('Fetching vehicles:', { accountNumber, getAllVehicles });

    let vehicles = [];

    if (getAllVehicles) {
      // Fetch all vehicles from external feed only
      try {
        console.log('Attempting to fetch from external API...');
        const liveResponse = await fetch('http://64.227.138.235:8000/latest', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          console.log('All live data fetched:', liveData);
          
          // Handle both single object and array responses
          const vehiclesArray = Array.isArray(liveData) ? liveData : [liveData];
          console.log('Processed vehicles array:', vehiclesArray.length, 'vehicles');
          
          vehicles = vehiclesArray.map((vehicle, index) => ({
            id: `live-${index}`,
            plate: vehicle.Plate || 'Unknown',
            speed: vehicle.Speed || 0,
            latitude: vehicle.Latitude || 0,
            longitude: vehicle.Longitude || 0,
            last_update: vehicle.LocTime || new Date().toISOString(),
            quality: vehicle.Quality || '',
            mileage: vehicle.Mileage || 0,
            head: vehicle.Head || '',
            geozone: vehicle.Geozone || '',
            driver_name: vehicle.DriverName || '',
            address: vehicle.Address || '',
            live_data: {
              plate: vehicle.Plate,
              speed: vehicle.Speed || 0,
              latitude: vehicle.Latitude || 0,
              longitude: vehicle.Longitude || 0,
              last_update: vehicle.LocTime || new Date().toISOString(),
              quality: vehicle.Quality || '',
              mileage: vehicle.Mileage || 0,
              head: vehicle.Head || '',
              geozone: vehicle.Geozone || '',
              driver_name: vehicle.DriverName || '',
              address: vehicle.Address || ''
            }
          }));
        } else {
          console.warn('External API returned error status:', liveResponse.status, liveResponse.statusText);
          // Return empty array with error message instead of failing completely
          return NextResponse.json({
            vehicles: [],
            total: 0,
            active: 0,
            error: `External vehicle API is currently unavailable (Status: ${liveResponse.status})`,
            message: 'Vehicle tracking service is temporarily down. Please try again later.'
          });
        }
      } catch (error) {
        console.warn('Error fetching live data:', error.message);
        // Return empty array with error message instead of failing completely
        return NextResponse.json({
          vehicles: [],
          total: 0,
          active: 0,
          error: 'External vehicle API is currently unavailable',
          message: 'Vehicle tracking service is temporarily down. Please try again later.',
          details: error.message
        });
      }
    } else {
      // Original logic for account-specific vehicles
      if (!accountNumber) {
        return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
      }

      console.log('Fetching vehicles for account:', accountNumber);

      // Fetch vehicles for this account
      const { data: dbVehicles, error: vehiclesError } = await supabase
        .from('vehicles_ip')
        .select('*')
        .eq('new_account_number', accountNumber);

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
      }

      console.log('Vehicles found:', dbVehicles?.length || 0);

      // Fetch live data from external API
      let liveData = [];
      try {
        console.log('Attempting to fetch live data from external API...');
        const liveResponse = await fetch('http://64.227.138.235:8000/latest', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (liveResponse.ok) {
          const rawLiveData = await liveResponse.json();
          // Handle both single object and array responses
          liveData = Array.isArray(rawLiveData) ? rawLiveData : [rawLiveData];
          console.log('Live data fetched:', liveData.length, 'vehicles');
        } else {
          console.warn('Failed to fetch live data:', liveResponse.status, liveResponse.statusText);
          // Continue with database vehicles only, without live data
        }
      } catch (error) {
        console.warn('Error fetching live data:', error.message);
        // Continue with database vehicles only, without live data
      }

      // Match vehicles with live data based on plate number
      vehicles = dbVehicles?.map(vehicle => {
        const plate = vehicle.group_name || vehicle.new_registration;
        const matchingLiveData = liveData.find(live =>
          live.Plate && plate && live.Plate.toLowerCase() === plate.toLowerCase()
        );

        return {
          id: vehicle.id || Math.random().toString(36).substr(2, 9),
          group_name: vehicle.group_name,
          new_registration: vehicle.new_registration,
          beame_1: vehicle.beame_1,
          beame_2: vehicle.beame_2,
          beame_3: vehicle.beame_3,
          company: vehicle.company,
          new_account_number: vehicle.new_account_number,
          live_data: matchingLiveData ? {
            plate: matchingLiveData.Plate,
            speed: matchingLiveData.Speed || 0,
            latitude: matchingLiveData.Latitude || 0,
            longitude: matchingLiveData.Longitude || 0,
            last_update: matchingLiveData.LocTime || new Date().toISOString(),
            quality: matchingLiveData.Quality || '',
            mileage: matchingLiveData.Mileage || 0,
            head: matchingLiveData.Head || '',
            geozone: matchingLiveData.Geozone || '',
            driver_name: matchingLiveData.DriverName || '',
            address: matchingLiveData.Address || ''
          } : null
        };
      }) || [];
    }

    console.log('Vehicles with live data:', vehicles.filter(v => v.live_data).length);

    return NextResponse.json({
      vehicles: vehicles,
      total: vehicles.length,
      active: vehicles.filter(v => v.live_data).length
    });

  } catch (error) {
    console.error('Error in vehicle live data GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching vehicle data',
      details: error.message
    }, { status: 500 });
  }
}
