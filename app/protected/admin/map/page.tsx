"use client";

import React, { useState } from 'react';
import { MapPin, Navigation, Search, Filter, Clock, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Sample location data
const LOCATIONS = [
  {
    id: 1,
    name: 'Tech Solutions Inc',
    address: '123 Business Ave, Downtown',
    lat: 40.7589,
    lng: -73.9851,
    type: 'client',
    status: 'active',
    contact: 'John Smith',
    phone: '+1 (555) 123-4567',
    email: 'john@techsolutions.com',
    nextVisit: '2025-01-20 09:00',
    priority: 'high'
  },
  {
    id: 2,
    name: 'Digital Corp',
    address: '456 Innovation Blvd, Business Park',
    lat: 40.7505,
    lng: -73.9934,
    type: 'client',
    status: 'pending',
    contact: 'Sarah Wilson',
    phone: '+1 (555) 234-5678',
    email: 'sarah@digitalcorp.com',
    nextVisit: '2025-01-18 14:00',
    priority: 'medium'
  },
  {
    id: 3,
    name: 'Main Warehouse',
    address: '789 Storage St, Industrial District',
    lat: 40.7614,
    lng: -73.9776,
    type: 'warehouse',
    status: 'active',
    contact: 'Mike Johnson',
    phone: '+1 (555) 345-6789',
    email: 'mike@warehouse.com',
    nextVisit: '2025-01-19 10:00',
    priority: 'low'
  },
  {
    id: 4,
    name: 'Regional Office',
    address: '321 Corporate Plaza, Midtown',
    lat: 40.7549,
    lng: -73.9840,
    type: 'office',
    status: 'active',
    contact: 'Lisa Chen',
    phone: '+1 (555) 456-7890',
    email: 'lisa@regional.com',
    nextVisit: '2025-01-21 11:00',
    priority: 'high'
  },
  {
    id: 5,
    name: 'Service Center North',
    address: '654 Service Rd, Uptown',
    lat: 40.7700,
    lng: -73.9800,
    type: 'service',
    status: 'maintenance',
    contact: 'David Brown',
    phone: '+1 (555) 567-8901',
    email: 'david@servicecenter.com',
    nextVisit: '2025-01-22 08:30',
    priority: 'medium'
  },
  {
    id: 6,
    name: 'Innovation Hub',
    address: '987 Tech Way, Silicon Alley',
    lat: 40.7480,
    lng: -73.9860,
    type: 'client',
    status: 'active',
    contact: 'Emma Davis',
    phone: '+1 (555) 678-9012',
    email: 'emma@innovationhub.com',
    nextVisit: '2025-01-23 15:30',
    priority: 'high'
  }
];

export default function MapPage() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getLocationTypeColor = (type) => {
    switch (type) {
      case 'client': return 'bg-blue-500';
      case 'warehouse': return 'bg-green-500';
      case 'office': return 'bg-purple-500';
      case 'service': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-gray-800 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const filteredLocations = LOCATIONS.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || location.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Calculate map bounds based on locations
  const mapBounds = {
    minLat: Math.min(...LOCATIONS.map(l => l.lat)) - 0.01,
    maxLat: Math.max(...LOCATIONS.map(l => l.lat)) + 0.01,
    minLng: Math.min(...LOCATIONS.map(l => l.lng)) - 0.01,
    maxLng: Math.max(...LOCATIONS.map(l => l.lng)) + 0.01
  };

  const getMarkerPosition = (location) => {
    const latPercent = ((location.lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
    const lngPercent = ((location.lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
    
    return {
      top: `${100 - latPercent}%`,
      left: `${lngPercent}%`
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg h-[600px]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Navigation className="h-6 w-6" />
                    Location Map
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Navigation className="h-4 w-4 mr-2" />
                      Center Map
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Dummy Map Container */}
                <div className="relative w-full h-[500px] bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-gray-200 overflow-hidden">
                  {/* Map Grid Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-12 grid-rows-12 h-full">
                      {Array.from({ length: 144 }).map((_, i) => (
                        <div key={i} className="border border-gray-300"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Street Lines */}
                  <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-0 right-0 h-1 bg-gray-300 opacity-30"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 opacity-30"></div>
                    <div className="absolute top-3/4 left-0 right-0 h-1 bg-gray-300 opacity-30"></div>
                    <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-300 opacity-30"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-300 opacity-30"></div>
                    <div className="absolute left-3/4 top-0 bottom-0 w-1 bg-gray-300 opacity-30"></div>
                  </div>

                  {/* Location Markers */}
                  {filteredLocations.map((location) => {
                    const position = getMarkerPosition(location);
                    const isSelected = selectedLocation?.id === location.id;
                    
                    return (
                      <div
                        key={location.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                        style={position}
                        onClick={() => setSelectedLocation(location)}
                      >
                        <div className={`
                          relative transition-all duration-200 hover:scale-110
                          ${isSelected ? 'scale-125' : ''}
                        `}>
                          <div className={`
                            w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center
                            ${getLocationTypeColor(location.type)}
                            ${isSelected ? 'ring-4 ring-blue-300' : ''}
                          `}>
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          {isSelected && (
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap">
                              {location.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
                    <div className="text-xs font-medium mb-2">Location Types</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs">Client</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs">Warehouse</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-xs">Office</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-xs">Service</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Search and Filter */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Locations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === 'client' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('client')}
                  >
                    Clients
                  </Button>
                  <Button
                    variant={filterType === 'warehouse' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('warehouse')}
                  >
                    Warehouses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected Location Details */}
            {selectedLocation ? (
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{selectedLocation.name}</span>
                    <Badge className={getPriorityColor(selectedLocation.priority)}>
                      {selectedLocation.priority}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                      <span className="text-sm text-gray-600">{selectedLocation.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedLocation.status)}>
                        {selectedLocation.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {selectedLocation.type}
                      </Badge>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedLocation.contact}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedLocation.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedLocation.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Next visit: {selectedLocation.nextVisit}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1">
                        Schedule Visit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Get Directions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg">
                <CardContent className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Click on a location pin to view details</p>
                </CardContent>
              </Card>
            )}

            {/* Location List */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  All Locations ({filteredLocations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredLocations.map((location) => (
                    <div
                      key={location.id}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-colors
                        ${selectedLocation?.id === location.id 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{location.name}</h4>
                        <div className={`w-3 h-3 rounded-full ${getLocationTypeColor(location.type)}`}></div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{location.address}</p>
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(location.status)} variant="secondary">
                          {location.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{location.contact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}