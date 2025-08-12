'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TestMapboxTokenPage() {
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [tokenTestResult, setTokenTestResult] = useState<string>('Not tested');

  // Mapbox token - hardcoded for testing
  const MAPBOX_TOKEN = 'eyJ1IjoicmVuZGVuaS1kZXYiLCJhIjoiY21kM2c3OXQ4MDJqczlqbzNwcDZvaCJ9.6skTnPcXqD7h24o9mfuQnw';

  const environmentInfo = {
    NEXT_PUBLIC_MAPBOX_TOKEN: MAPBOX_TOKEN ? 'Set (Hardcoded)' : 'Not set',
    TokenLength: MAPBOX_TOKEN?.length || 0,
    TokenValid: MAPBOX_TOKEN?.startsWith('pk.') || false,
    TokenPreview: MAPBOX_TOKEN ? `${MAPBOX_TOKEN.substring(0, 20)}...` : 'None',
    MapboxGLInstalled: typeof window !== 'undefined' && 'mapboxgl' in window,
  };

  const testMapboxToken = async () => {
    try {
      setTokenTestResult('Testing...');
      
      // Test the token with a simple Mapbox API call
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/Johannesburg.json?access_token=${MAPBOX_TOKEN}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setTokenTestResult('✅ Valid - API call successful');
        } else {
          setTokenTestResult('⚠️ Token works but no data returned');
        }
      } else {
        setTokenTestResult(`❌ Invalid - HTTP ${response.status}`);
      }
    } catch (error) {
      setTokenTestResult(`❌ Error: ${error.message}`);
    }
  };

  const initializeMap = async () => {
    try {
      setLoading(true);
      setError(null);

      // Import mapbox-gl dynamically
      const mapboxModule = await import('mapbox-gl');
      const mapboxglInstance = mapboxModule.default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      setMapboxgl(mapboxglInstance);
      mapboxglInstance.accessToken = MAPBOX_TOKEN;
      
      console.log('Initializing Mapbox map...');
      
      if (!mapContainer) {
        throw new Error('Map container not available');
      }
      
      const newMap = new mapboxglInstance.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [24.9916, -28.8166], // Center of South Africa
        zoom: 6 // Zoom level to show most of South Africa
      });

      newMap.on('load', () => {
        console.log('Map loaded successfully');
        setMap(newMap);
        setLoading(false);
      });

      newMap.on('error', (e) => {
        console.error('Map error:', e);
        setError(`Map error: ${e.error}`);
        setLoading(false);
      });

      newMap.addControl(new mapboxglInstance.NavigationControl(), 'top-right');

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map: ' + (error as Error).message);
      setLoading(false);
    }
  };

  const addTestMarker = () => {
    if (!map || !mapboxgl) return;

    try {
      const markerEl = document.createElement('div');
      markerEl.style.width = '20px';
      markerEl.style.height = '20px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = '#ef4444';
      markerEl.style.border = '2px solid white';
      markerEl.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([28.179211, -26.263278])
        .addTo(map);

      console.log('Test marker added successfully');
    } catch (error) {
      console.error('Error adding test marker:', error);
    }
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-3xl">Mapbox Token Test</h1>
        <p className="mb-6 text-gray-600">Test page to verify Mapbox integration</p>
      </div>

      {/* Environment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-2">
            {Object.entries(environmentInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <Badge variant={value === 'Not set' ? 'destructive' : 'default'}>
                  {value}
                </Badge>
              </div>
            ))}
          </div>
          
          {/* Token Test Section */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-700 text-sm">Token Test:</p>
                <p className="text-gray-500 text-sm">{tokenTestResult}</p>
              </div>
              <Button 
                onClick={testMapboxToken}
                variant="outline"
                size="sm"
              >
                Test Token
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Map Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button 
              onClick={initializeMap} 
              disabled={loading || !!map}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Initializing...' : map ? 'Map Loaded' : 'Initialize Map'}
            </Button>
            
            {map && (
              <Button 
                onClick={addTestMarker}
                variant="outline"
              >
                Add Test Marker
              </Button>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 p-4 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardHeader>
          <CardTitle>Map Display</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <div 
              ref={setMapContainer}
              className="bg-gray-100 rounded-lg w-full h-[500px]"
            />
            {loading && (
              <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                  <span>Loading map...</span>
                </div>
              </div>
            )}
            {!map && !loading && (
              <div className="absolute inset-0 flex justify-center items-center">
                <div className="text-center">
                  <p className="text-gray-500">Click "Initialize Map" to load the map</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-gray-600 text-sm list-decimal list-inside">
            <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root</li>
            <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN=eyJ1IjoicmVuZGVuaS1kZXYiLCJhIjoiY21kM2c3OXQ4MDJqczlqbzNwcDZvaCJ9.6skTnPcXqD7h24o9mfuQnw</code></li>
            <li>Restart your development server</li>
            <li>Click "Initialize Map" to test the integration</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
} 