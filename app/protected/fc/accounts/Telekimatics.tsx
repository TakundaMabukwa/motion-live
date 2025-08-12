"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Gauge, 
  BarChart3, 
  FileText, 
  Map, 
  Droplets, 
  TrendingUp, 
  AlertTriangle,
  MapPin,
  Download,
  Calendar,
  Filter,
  LineChart,
  PieChart
} from "lucide-react"

export default function Telekimatics() {
  const [selectedCostCentre, setSelectedCostCentre] = useState("airgass")
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const costCentres = [
    { value: "airgass", label: "AIRGASS COMPRESSORS (PTY) LTD" },
    { value: "industrial", label: "INDUSTRIAL SOLUTIONS LTD" },
    { value: "marine", label: "MARINE FUEL SERVICES" }
  ]

  // Fuel Probe Data
  const probeData = [
    {
      id: "FP001",
      location: "Tank A - North",
      currentLevel: 85.2,
      capacity: 10000,
      status: "Normal",
      temperature: 18.5,
      lastUpdate: "2 minutes ago"
    },
    {
      id: "FP002", 
      location: "Tank B - South",
      currentLevel: 42.7,
      capacity: 8000,
      status: "Low",
      temperature: 19.2,
      lastUpdate: "1 minute ago"
    },
    {
      id: "FP003",
      location: "Tank C - East",
      currentLevel: 91.8,
      capacity: 12000,
      status: "High",
      temperature: 17.8,
      lastUpdate: "3 minutes ago"
    }
  ]

  // Graph Data
  const consumptionData = [
    { day: "Mon", consumption: 245 },
    { day: "Tue", consumption: 198 },
    { day: "Wed", consumption: 267 },
    { day: "Thu", consumption: 234 },
    { day: "Fri", consumption: 289 },
    { day: "Sat", consumption: 156 },
    { day: "Sun", consumption: 178 }
  ]

  const tankDistribution = [
    { tank: "Tank A", percentage: 35 },
    { tank: "Tank B", percentage: 25 },
    { tank: "Tank C", percentage: 40 }
  ]

  // Reports Data
  const reports = [
    {
      id: "RPT001",
      title: "Weekly Consumption Report",
      date: "2024-01-15",
      type: "Consumption",
      status: "Generated",
      size: "2.3 MB"
    },
    {
      id: "RPT002", 
      title: "Tank Maintenance Log",
      date: "2024-01-14",
      type: "Maintenance",
      status: "Generated",
      size: "1.8 MB"
    },
    {
      id: "RPT003",
      title: "Fuel Quality Analysis",
      date: "2024-01-13",
      type: "Quality",
      status: "Processing",
      size: "3.1 MB"
    },
    {
      id: "RPT004",
      title: "Cost Analysis Report",
      date: "2024-01-12",
      type: "Financial",
      status: "Generated",
      size: "1.5 MB"
    },
    {
      id: "RPT005",
      title: "Environmental Compliance",
      date: "2024-01-11",
      type: "Compliance",
      status: "Generated",
      size: "4.2 MB"
    }
  ]

  // Map Data
  const tankLocations = [
    {
      id: "Tank A",
      coordinates: [-74.006, 40.7128],
      level: 85.2,
      status: "Normal",
      address: "North Facility - Block A"
    },
    {
      id: "Tank B", 
      coordinates: [-74.008, 40.7118],
      level: 42.7,
      status: "Low",
      address: "South Facility - Block B"
    },
    {
      id: "Tank C",
      coordinates: [-74.004, 40.7138],
      level: 91.8,
      status: "High", 
      address: "East Facility - Block C"
    }
  ]

  // Utility Functions
  const getStatusColor = (status) => {
    switch (status) {
      case "Normal": return "bg-green-500"
      case "Low": return "bg-yellow-500"
      case "High": return "bg-blue-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case "Normal": return "default"
      case "Low": return "destructive"
      case "High": return "secondary"
      default: return "outline"
    }
  }

  const getReportStatusColor = (status) => {
    switch (status) {
      case "Generated": return "text-green-600 bg-green-50"
      case "Processing": return "text-yellow-600 bg-yellow-50"
      case "Failed": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  // Map initialization
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      try {
        const mapDiv = mapContainer.current
        mapDiv.style.background = `
          linear-gradient(45deg, #e3f2fd 25%, transparent 25%),
          linear-gradient(-45deg, #e3f2fd 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e3f2fd 75%),
          linear-gradient(-45deg, transparent 75%, #e3f2fd 75%)
        `
        mapDiv.style.backgroundSize = '20px 20px'
        mapDiv.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px'
        mapDiv.style.backgroundColor = '#f5f5f5'
        
        setMapLoaded(true)
      } catch (error) {
        console.log('Map initialization simulated')
        setMapLoaded(true)
      }
    }
  }, [])

  // Fuel Probe Component
  const FuelProbeSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Gauge className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Fuel Probe Monitoring</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {probeData.map((probe) => (
          <Card key={probe.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{probe.id}</CardTitle>
                <Badge variant={getStatusVariant(probe.status)}>
                  {probe.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{probe.location}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Fuel Level</span>
                  <span className="font-semibold">{probe.currentLevel}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${getStatusColor(probe.status)}`}
                    style={{ width: `${probe.currentLevel}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((probe.currentLevel / 100) * probe.capacity).toLocaleString()}L / {probe.capacity.toLocaleString()}L
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">Temperature</div>
                    <div className="text-muted-foreground">{probe.temperature}°C</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">Updated</div>
                    <div className="text-muted-foreground">{probe.lastUpdate}</div>
                  </div>
                </div>
              </div>

              {probe.status === "Low" && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">Refill recommended</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // Fuel Graphs Component
  const FuelGraphsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Fuel Analytics & Graphs</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Daily Consumption
              </CardTitle>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {consumptionData.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${(item.consumption / 300) * 100}%` }}
                  />
                  <span className="text-xs mt-2 text-muted-foreground">{item.day}</span>
                  <span className="text-xs font-medium">{item.consumption}L</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tank Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Tank Usage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tankDistribution.map((tank, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{tank.tank}</span>
                    <span className="font-medium">{tank.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${tank.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Capacity:</span>
                  <div className="font-medium">30,000L</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Total:</span>
                  <div className="font-medium">21,450L</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Average:</span>
                  <div className="font-medium">238L</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Efficiency:</span>
                  <div className="font-medium text-green-600">92.3%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">1,664L</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <div className="text-sm text-muted-foreground">vs Last Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">89.2%</div>
            <div className="text-sm text-muted-foreground">Avg Tank Level</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">3.2 days</div>
            <div className="text-sm text-muted-foreground">Estimated Refill</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // Fuel Reports Component
  const FuelReportsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Fuel Reports</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-sm text-muted-foreground">Total Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">22</div>
            <div className="text-sm text-muted-foreground">Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">2</div>
            <div className="text-sm text-muted-foreground">Processing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">45.2 MB</div>
            <div className="text-sm text-muted-foreground">Total Size</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{report.title}</h4>
                    <div className="text-sm text-muted-foreground">
                      {report.id} • {report.type} • {report.size}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${getReportStatusColor(report.status)}`}>
                      {report.status}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {report.date}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={report.status !== "Generated"}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option>Consumption Analysis</option>
                <option>Tank Status</option>
                <option>Maintenance Log</option>
                <option>Cost Analysis</option>
                <option>Environmental Report</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last 3 Months</option>
                <option>Custom Range</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
          </div>
          <Button className="mt-4">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // Map View Component
  const MapViewSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Map className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Tank Locations Map</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Fuel Tank Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapContainer}
                className="w-full h-96 rounded-lg border relative overflow-hidden"
              >
                {mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-1 gap-4 p-8">
                      {tankLocations.map((tank, index) => (
                        <div 
                          key={tank.id}
                          className="absolute bg-white p-3 rounded-lg shadow-lg border"
                          style={{
                            left: `${20 + index * 25}%`,
                            top: `${30 + index * 15}%`
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(tank.status)}`} />
                            <span className="font-medium text-sm">{tank.id}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {tank.level}% Full
                          </div>
                        </div>
                      ))}
                      
                      {/* Map Legend */}
                      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border">
                        <h4 className="font-medium text-sm mb-2">Legend</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Normal Level</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span>Low Level</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>High Level</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <div className="text-gray-500">Loading map...</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tank Status Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Tank Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tankLocations.map((tank) => (
                <div key={tank.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{tank.id}</h4>
                    <Badge variant={tank.status === "Normal" ? "default" : tank.status === "Low" ? "destructive" : "secondary"}>
                      {tank.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Level</span>
                      <span className="font-medium">{tank.level}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getStatusColor(tank.status)}`}
                        style={{ width: `${tank.level}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 {tank.address}
                  </div>
                  
                  {tank.status === "Low" && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-yellow-700 bg-yellow-50 p-1 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Needs refill</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50">
                📊 View All Tank Levels
              </button>
              <button className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50">
                🚚 Schedule Refill
              </button>
              <button className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50">
                ⚠️ Set Level Alerts
              </button>
              <button className="w-full p-2 text-left text-sm border rounded hover:bg-gray-50">
                📱 Send Status Report
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuel Management System</h1>
          <p className="text-gray-600">Monitor and manage fuel consumption across all facilities</p>
        </div>

        {/* Cost Centre Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Cost Centre <Badge variant="secondary" className="ml-1">1</Badge>
            </label>
            <Select value={selectedCostCentre} onValueChange={setSelectedCostCentre}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {costCentres.map((centre) => (
                  <SelectItem key={centre.value} value={centre.value}>
                    {centre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="fuel-probe" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="fuel-probe" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Fuel Probe
            </TabsTrigger>
            <TabsTrigger value="fuel-graphs" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Fuel Probe Graphs
            </TabsTrigger>
            <TabsTrigger value="fuel-reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Fuel Reports
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fuel-probe" className="space-y-6">
            <FuelProbeSection />
          </TabsContent>

          <TabsContent value="fuel-graphs" className="space-y-6">
            <FuelGraphsSection />
          </TabsContent>

          <TabsContent value="fuel-reports" className="space-y-6">
            <FuelReportsSection />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <MapViewSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}