'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Search, 
  Car, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  X,
  QrCode,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeDetector } from 'barcode-detector/ponyfill';

interface VinScannerProps {
  isOpen: boolean;
  onClose: () => void;
  scanMode?: 'vin' | 'license';
  jobId?: string; // Add jobId prop
  customerName?: string;
  customerEmail?: string;
}

interface VehicleData {
  registration_number: string;
  engine_number: string;
  vin_number: string;
  make: string;
  model: string;
  sub_model?: string;
  manufactured_year: number;
  vehicle_type: string;
  registration_date: string;
  license_expiry_date: string;
  fuel_type: string;
  transmission_type: string;
  service_intervals_km: number;
  color: string;
  // For new vehicles
  company?: string;
  new_registration?: string;
  group_name?: string;
}

interface LicenseData {
  LicenseNumber: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  BirthDate: string;
  LicenseExpiration: string;
  Address: {
    Address: string;
    City: string;
    State: string;
    Zip: string;
  };
  LicenseState: string;
}

export default function VinScanner({ 
  isOpen, 
  onClose, 
  scanMode = 'vin',
  jobId, // Add jobId parameter
  customerName = '',
  customerEmail = ''
}: VinScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [vinNumber, setVinNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [existingVehicle, setExistingVehicle] = useState<any>(null);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [barcodeDetector, setBarcodeDetector] = useState<BarcodeDetector | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newVehicleData, setNewVehicleData] = useState<VehicleData>({
    registration_number: '',
    engine_number: 'ENG' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    vin_number: '',
    make: '',
    model: '',
    manufactured_year: new Date().getFullYear(),
    vehicle_type: '',
    registration_date: new Date().toISOString().split('T')[0],
    license_expiry_date: new Date(new Date().getFullYear() + 5, 0, 1).toISOString().split('T')[0],
    fuel_type: '',
    transmission_type: '',
    service_intervals_km: 10000,
    color: '',
    company: customerName || '',
    new_registration: '',
    group_name: ''
  });

  // Initialize barcode detector
  useEffect(() => {
    const initBarcodeDetector = async () => {
      try {
        console.log('Initializing barcode detector...');
        
        // Check if BarcodeDetector is supported
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        console.log('Supported barcode formats:', supportedFormats);
        
        // Create barcode detector instance with all common formats
        const detector = new BarcodeDetector({
          formats: [
            'code_39',      // Common for VIN barcodes
            'code_128',     // Common for VIN barcodes
            'data_matrix',  // Sometimes used for VIN
            'qr_code',      // Sometimes used for VIN
            'pdf417',       // Used for driver's licenses
            'aztec',        // Sometimes used for VIN
            'codabar',      // Sometimes used for VIN
            'code_93',      // Sometimes used for VIN
            'ean_8',        // Sometimes used for VIN
            'ean_13',       // Sometimes used for VIN
            'itf',          // Sometimes used for VIN
            'upc_a',        // Sometimes used for VIN
            'upc_e'         // Sometimes used for VIN
          ]
        });
        
        setBarcodeDetector(detector);
        console.log('Barcode detector initialized successfully');
        toast.success('Barcode detection ready!');
      } catch (error) {
        console.error('Failed to initialize barcode detector:', error);
        toast.error('Barcode detection not available. You can still enter VIN manually.');
      }
    };

    if (isOpen) {
      initBarcodeDetector();
    }
  }, [isOpen]);

  // Initialize form with customer data
  useEffect(() => {
    if (customerName && customerEmail) {
      setNewVehicleData(prev => ({
        ...prev,
        company: customerName,
        new_registration: customerEmail,
        group_name: customerName
      }));
    }
  }, [customerName, customerEmail]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    try {
      console.log('Processing uploaded image:', file.name, file.size, file.type);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process with barcode detector
      if (barcodeDetector) {
        console.log('Detecting barcodes in image...');
        const barcodes = await barcodeDetector.detect(file);
        console.log('Detected barcodes:', barcodes);
        
        if (barcodes.length > 0) {
          const detectedVIN = barcodes[0].rawValue;
          console.log('Detected VIN from image:', detectedVIN);
          console.log('Barcode format:', barcodes[0].format);
          console.log('Barcode bounds:', barcodes[0].boundingBox);
          
          setVinNumber(detectedVIN);
          toast.success(`VIN detected: ${detectedVIN} (${barcodes[0].format})`);
          
          // Automatically search for the detected VIN
          await handleSearch(detectedVIN);
        } else {
          console.log('No barcodes detected in image');
          toast.warning('No barcode detected in the image. Please try a different image or enter VIN manually.');
        }
      } else {
        console.log('Barcode detector not available');
        toast.error('Barcode detection not available. Please enter VIN manually.');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again or enter VIN manually.');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      // Check if we're in a Cordova environment with GMV barcode scanner
      if (typeof window !== 'undefined' && (window as any).plugins?.GMVBarcodeScanner) {
        // Use GMV barcode scanner for VIN scanning
        const scanner = (window as any).plugins.GMVBarcodeScanner;
        
        if (scanMode === 'license') {
          // Scan driver's license
          scanner.scanLicense(
            (result: LicenseData) => {
              console.log('License scan result:', result);
              setLicenseData(result);
              setScanning(false);
              toast.success('Driver\'s license scanned successfully!');
            },
            (error: any) => {
              console.error('License scan error:', error);
              toast.error('License scanning failed. Please try again.');
              setScanning(false);
            },
            {
              width: 0.5,
              height: 0.7
            }
          );
        } else {
          // Use scanVIN method for VIN-specific scanning with validation
          scanner.scanVIN(
            (result: any) => {
              console.log('VIN scan result:', result);
              setVinNumber(result);
              setScanning(false);
              handleSearch(result);
            },
            (error: any) => {
              console.error('VIN scan error:', error);
              toast.error('VIN scanning failed. Please try again or enter VIN manually.');
              setScanning(false);
            },
            {
              width: 0.5,
              height: 0.7
            }
          );
        }
      } else if (typeof window !== 'undefined' && (window as any).cordova) {
        // Fallback to generic Cordova barcode scanner
        const scanner = (window as any).cordova.plugins.barcodeScanner;
        scanner.scan(
          (result: any) => {
            console.log('Generic scan result:', result);
            setVinNumber(result.text);
            setScanning(false);
            handleSearch(result.text);
          },
          (error: any) => {
            console.error('Generic scan error:', error);
            toast.error('Scanning failed. Please try again or enter VIN manually.');
            setScanning(false);
          },
          {
            preferFrontCamera: false,
            showFlipCameraButton: true,
            showTorchButton: true,
            torchOn: false,
            prompt: scanMode === 'license' ? 'Place driver\'s license inside the scan area' : 'Place VIN barcode inside the scan area',
            resultDisplayDuration: 500,
            formats: scanMode === 'license' ? 'PDF417' : 'CODE_39,DATA_MATRIX', // VIN-specific formats
            orientation: 'portrait'
          }
        );
      } else {
        // Fallback for web environment - show image upload option
        toast.info('Camera scanner not available. You can upload an image or enter VIN manually.');
        setScanning(false);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scanning failed. Please try again or enter VIN manually.');
      setScanning(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewVehicleData(prev => ({ ...prev, [field]: value }));
  };

  // VIN validation function - accept any VIN format
  const validateVIN = (vin: string): boolean => {
    if (!vin || vin.trim().length === 0) {
      return false;
    }
    
    // Accept any VIN format - just check it's not empty and contains valid characters
    const cleanVin = vin.trim().toUpperCase();
    const validChars = /^[A-Z0-9]+$/;
    
    if (!validChars.test(cleanVin)) {
      return false;
    }
    
    // Minimum length check (most VINs are at least 10 characters)
    if (cleanVin.length < 10) {
      return false;
    }
    
    return true;
  };

  const handleSearch = async (vin: string) => {
    if (!vin.trim()) {
      toast.error('Please enter a VIN number');
      return;
    }

    // Validate VIN format
    if (!validateVIN(vin.trim())) {
      toast.error('Invalid VIN format. VIN must be at least 10 characters long and contain only valid characters.');
      return;
    }

    setSearching(true);
    try {
      // Search for existing vehicle by VIN
      const response = await fetch(`/api/vehicles/search?vin=${encodeURIComponent(vin)}`);
      const data = await response.json();

      if (data.success && data.vehicles && data.vehicles.length > 0) {
        setExistingVehicle(data.vehicles[0]);
        toast.success('Vehicle found!');
      } else {
        // No existing vehicle found, show new vehicle form
        setNewVehicleData(prev => ({
          ...prev,
          vin_number: vin.trim().toUpperCase()
        }));
        setShowNewVehicleForm(true);
        toast.info('No existing vehicle found. Please add new vehicle details.');
      }
    } catch (error) {
      console.error('Search error:', error);
      // Show helpful message about database setup
      toast.error('Vehicle search failed. Please ensure the vehicles table is set up in the database.');
      // Still show the new vehicle form so user can add the vehicle
      setNewVehicleData(prev => ({
        ...prev,
        vin_number: vin.trim().toUpperCase()
      }));
      setShowNewVehicleForm(true);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateNewVehicle = async () => {
    try {
      setCreatingVehicle(true);
      
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVehicleData),
      });

      const result = await response.json();

      if (result.success) {
        const createdVehicle = result.vehicle;
        setFoundVehicle(createdVehicle);
        setShowVehicleDetails(true);
        setShowNewVehicleForm(false);
        
        // Assign created vehicle to job
        if (jobId) {
          assignVehicleToJob(createdVehicle, 'created');
        }
        
        toast.success('New vehicle created and assigned to job!');
        console.log('Vehicle created:', createdVehicle);
      } else {
        console.error('Failed to create vehicle:', result);
        toast.error(result.error || 'Failed to create vehicle');
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast.error('Error creating vehicle');
    } finally {
      setCreatingVehicle(false);
    }
  };

  const handleUseExistingVehicle = () => {
    if (existingVehicle) {
      onVehicleFound(existingVehicle);
      onClose();
    }
  };

  // Test barcode detection functionality
  const testBarcodeDetection = async () => {
    try {
      console.log('Testing barcode detection...');
      
      if (!barcodeDetector) {
        console.log('Barcode detector not initialized');
        toast.error('Barcode detector not available');
        return;
      }

      // Create a simple test image with a barcode
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a simple test pattern
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 300, 100);
        ctx.fillStyle = 'black';
        ctx.fillRect(10, 20, 280, 60);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'test-barcode.png', { type: 'image/png' });
            console.log('Testing with generated image...');
            await handleImageUpload({ target: { files: [file] } } as any);
          }
        }, 'image/png');
      }
    } catch (error) {
      console.error('Test barcode detection error:', error);
      toast.error('Test failed');
    }
  };

  // Add function to assign vehicle to job
  const assignVehicleToJob = async (vehicleData: any, action: 'found' | 'created') => {
    if (!jobId) {
      console.log('No jobId provided, skipping job assignment');
      return;
    }

    try {
      console.log(`Assigning vehicle to job ${jobId}:`, { action, vehicleData });

      const response = await fetch(`/api/jobs/${jobId}/assign-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleData,
          action
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Vehicle ${action === 'found' ? 'found and assigned' : 'created and assigned'} to job successfully!`);
        console.log('Vehicle assigned to job:', result);
      } else {
        console.error('Failed to assign vehicle to job:', result);
        toast.error('Failed to assign vehicle to job');
      }
    } catch (error) {
      console.error('Error assigning vehicle to job:', error);
      toast.error('Error assigning vehicle to job');
    }
  };

  const handleVehicleFound = (vehicle: Vehicle) => {
    setFoundVehicle(vehicle);
    setShowVehicleDetails(true);
    setShowNewVehicleForm(false);
    
    // Assign found vehicle to job
    if (jobId) {
      assignVehicleToJob(vehicle, 'found');
    }
    
    toast.success('Vehicle found!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            {scanMode === 'license' ? 'Driver\'s License Scanner' : 'Vehicle VIN Scanner'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* VIN Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {scanMode === 'license' ? 'Scan Driver\'s License' : 'Scan or Enter VIN'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-2"
                >
                  {scanning ? (
                    <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {scanning ? 'Scanning...' : scanMode === 'license' ? 'Scan License' : 'Scan VIN'}
                </Button>
                
                {/* Image Upload Button */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    disabled={processingImage}
                  />
                  <Button
                    variant="outline"
                    disabled={processingImage}
                    className="flex items-center gap-2"
                  >
                    {processingImage ? (
                      <div className="border-2 border-gray-600 border-t-transparent rounded-full w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {processingImage ? 'Processing...' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* Test Button (for debugging) */}
                <Button
                  onClick={testBarcodeDetection}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Test
                </Button>
                
                {scanMode === 'vin' && (
                  <>
                    <div className="flex-1">
                      <Input
                        placeholder="Enter VIN number (any format)"
                        value={vinNumber}
                        onChange={(e) => setVinNumber(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch(vinNumber)}
                      />
                    </div>
                    <Button
                      onClick={() => handleSearch(vinNumber)}
                      disabled={searching || !vinNumber.trim()}
                      className="flex items-center gap-2"
                    >
                      {searching ? (
                        <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Search
                    </Button>
                  </>
                )}
              </div>
              
              {/* Image Preview */}
              {selectedImage && (
                <div className="mt-4">
                  <Label className="font-medium text-sm">Uploaded Image:</Label>
                  <div className="relative mt-2">
                    <img 
                      src={selectedImage} 
                      alt="Uploaded VIN barcode" 
                      className="border rounded-lg max-w-full h-32 object-contain"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedImage(null)}
                      className="top-2 right-2 absolute"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* License Data Display */}
          {licenseData && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="gap-4 grid grid-cols-2 text-sm">
                  <div>
                    <Label className="text-green-700">License Number</Label>
                    <p className="font-medium">{licenseData.LicenseNumber}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Name</Label>
                    <p className="font-medium">{licenseData.FirstName} {licenseData.MiddleName} {licenseData.LastName}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Birth Date</Label>
                    <p className="font-medium">{licenseData.BirthDate}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Expiration</Label>
                    <p className="font-medium">{licenseData.LicenseExpiration}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">State</Label>
                    <p className="font-medium">{licenseData.LicenseState}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Address</Label>
                    <p className="font-medium">{licenseData.Address.Address}, {licenseData.Address.City}, {licenseData.Address.State} {licenseData.Address.Zip}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    // Use license data to pre-fill vehicle form
                    setNewVehicleData(prev => ({
                      ...prev,
                      company: `${licenseData.FirstName} ${licenseData.LastName}`,
                      new_registration: licenseData.LicenseNumber,
                      group_name: `${licenseData.FirstName} ${licenseData.LastName}`
                    }));
                    setShowNewVehicleForm(true);
                  }} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Vehicle with License Data
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setLicenseData(null)}
                  >
                    Clear License Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Vehicle Found */}
          {existingVehicle && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Vehicle Found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="gap-4 grid grid-cols-2 text-sm">
                  <div>
                    <Label className="text-green-700">Registration</Label>
                    <p className="font-medium">{existingVehicle.registration_number}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">VIN</Label>
                    <p className="font-medium">{existingVehicle.vin_number}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Make & Model</Label>
                    <p className="font-medium">{existingVehicle.make} {existingVehicle.model}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Year</Label>
                    <p className="font-medium">{existingVehicle.manufactured_year}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Color</Label>
                    <p className="font-medium">{existingVehicle.color}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Fuel Type</Label>
                    <p className="font-medium">{existingVehicle.fuel_type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUseExistingVehicle} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Use This Vehicle
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setExistingVehicle(null);
                      setShowNewVehicleForm(true);
                    }}
                  >
                    Add New Vehicle Instead
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Vehicle Form */}
          {showNewVehicleForm && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Plus className="w-5 h-5" />
                  Add New Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="gap-4 grid grid-cols-2">
                  <div>
                    <Label htmlFor="registration_number">Registration Number *</Label>
                    <Input
                      id="registration_number"
                      value={newVehicleData.registration_number}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      placeholder="e.g., LX 90 MH GP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vin_number">VIN Number *</Label>
                    <Input
                      id="vin_number"
                      value={newVehicleData.vin_number}
                      onChange={(e) => handleInputChange('vin_number', e.target.value)}
                      placeholder="Enter VIN (any format)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="make">Make *</Label>
                    <Select 
                      value={newVehicleData.make} 
                      onValueChange={(value) => handleInputChange('make', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toyota">Toyota</SelectItem>
                        <SelectItem value="ford">Ford</SelectItem>
                        <SelectItem value="chevrolet">Chevrolet</SelectItem>
                        <SelectItem value="suzuki">Suzuki</SelectItem>
                        <SelectItem value="nissan">Nissan</SelectItem>
                        <SelectItem value="volkswagen">Volkswagen</SelectItem>
                        <SelectItem value="bmw">BMW</SelectItem>
                        <SelectItem value="mercedes">Mercedes</SelectItem>
                        <SelectItem value="audi">Audi</SelectItem>
                        <SelectItem value="honda">Honda</SelectItem>
                        <SelectItem value="hyundai">Hyundai</SelectItem>
                        <SelectItem value="kia">Kia</SelectItem>
                        <SelectItem value="mazda">Mazda</SelectItem>
                        <SelectItem value="subaru">Subaru</SelectItem>
                        <SelectItem value="volvo">Volvo</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={newVehicleData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="e.g., Corolla, F-150"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manufactured_year">Year *</Label>
                    <Select 
                      value={newVehicleData.manufactured_year.toString()} 
                      onValueChange={(value) => handleInputChange('manufactured_year', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="color">Color *</Label>
                    <Select 
                      value={newVehicleData.color} 
                      onValueChange={(value) => handleInputChange('color', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="pink">Pink</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fuel_type">Fuel Type *</Label>
                    <Select 
                      value={newVehicleData.fuel_type} 
                      onValueChange={(value) => handleInputChange('fuel_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="lpg">LPG</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="transmission_type">Transmission *</Label>
                    <Select 
                      value={newVehicleData.transmission_type} 
                      onValueChange={(value) => handleInputChange('transmission_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="cvt">CVT</SelectItem>
                        <SelectItem value="semi-automatic">Semi-Automatic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                    <Select 
                      value={newVehicleData.vehicle_type} 
                      onValueChange={(value) => handleInputChange('vehicle_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="wagon">Wagon</SelectItem>
                        <SelectItem value="coupe">Coupe</SelectItem>
                        <SelectItem value="convertible">Convertible</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateNewVehicle} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Vehicle
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewVehicleForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 