import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Package, 
  DollarSign,
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play
} from 'lucide-react';
import { QRCodeScanner } from './QRCodeScanner';
import { VehicleDetailsPopup } from './VehicleDetailsPopup';

interface JobDetailsPopupProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsPopup({ job, isOpen, onClose }: JobDetailsPopupProps) {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<any>(null);

  if (!job) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleStartJob = () => {
    setShowQRScanner(true);
  };

  const handleJobVerified = async (jobData: any) => {
    // Job number verified, now check for vehicle details
    try {
      // Check if vehicle exists in vehicles_ip table
      const response = await fetch(`/api/vehicles-ip?registration=${job.vehicle_registration || ''}&vin=${job.vin_number || ''}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.vehicles && data.vehicles.length > 0) {
          // Vehicle exists, proceed with VIN scanning
          setCurrentVehicle(data.vehicles[0]);
          // You can add VIN scanning logic here
          console.log('Vehicle found:', data.vehicles[0]);
        } else {
          // Vehicle not found, show vehicle details popup
          setShowVehicleDetails(true);
        }
      } else {
        // Error checking vehicle, show vehicle details popup
        setShowVehicleDetails(true);
      }
    } catch (error) {
      console.error('Error checking vehicle:', error);
      setShowVehicleDetails(true);
    }
  };

  const handleVehicleAdded = (vehicleData: any) => {
    setCurrentVehicle(vehicleData);
    console.log('Vehicle added:', vehicleData);
    // You can add VIN scanning logic here
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            Job Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Job Status */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="font-semibold text-base sm:text-lg">Job #{job.id}</h3>
            <Badge className={getStatusColor(job.jobStatus || 'pending')}>
              {getStatusIcon(job.jobStatus || 'pending')}
              <span className="ml-1">{job.jobStatus || 'Pending'}</span>
            </Badge>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Customer Name</label>
                  <p className="text-sm">{job.customerName || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <p className="text-sm break-all">{job.customerEmail || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <p className="text-sm">{job.customerPhone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Address</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <p className="text-sm">{job.customerAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Product/Service</label>
                  <p className="text-sm">{job.productName || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Quantity</label>
                  <p className="text-sm">{job.quantity || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Job Type</label>
                  <p className="text-sm">{job.jobType || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Technician</label>
                  <p className="text-sm">{job.technician || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                Schedule Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <p className="text-sm">{job.date || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Time</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <p className="text-sm">{job.time || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Subtotal</label>
                  <p className="font-semibold text-sm">
                    R {job.subtotal ? parseFloat(job.subtotal).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-xs sm:text-sm">Total Amount</label>
                  <p className="font-semibold text-sm">
                    R {job.totalAmount ? parseFloat(job.totalAmount).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
            <Button 
              onClick={handleStartJob}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              <Play className="w-3 h-3 sm:w-4 sm:h-4" />
              Start Job
            </Button>
            <Button className="w-full sm:w-auto">
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onJobVerified={handleJobVerified}
        expectedJobNumber={job.jobNumber || job.id}
      />

      {/* Vehicle Details Popup */}
      <VehicleDetailsPopup
        isOpen={showVehicleDetails}
        onClose={() => setShowVehicleDetails(false)}
        onVehicleAdded={handleVehicleAdded}
        jobData={job}
      />
    </Dialog>
  );
}
