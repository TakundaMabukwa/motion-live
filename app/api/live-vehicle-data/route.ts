import { NextRequest, NextResponse } from 'next/server';

interface LiveVehicleData {
  Plate: string;
  Speed: number | null;
  Latitude: number;
  Longitude: number;
  LocTime: string;
  Quality: string;
  Mileage: number;
  Pocsagstr: string;
  Head: string;
  Geozone: string;
  DriverName: string;
  NameEvent: string;
  Temperature: string;
  Address: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching live vehicle data...');
    
    // Fetch live data from external API
    const response = await fetch('http://64.227.138.235:8000/latest');
    
    if (!response.ok) {
      console.error('Error fetching live data:', response.status);
      return NextResponse.json({ error: 'Failed to fetch live data' }, { status: 500 });
    }
    
    const liveData: LiveVehicleData = await response.json();
    console.log('Live data received:', liveData);

    return NextResponse.json({
      success: true,
      liveData: liveData
    });

  } catch (error) {
    console.error('Error in live vehicle data GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
