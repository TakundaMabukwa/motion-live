'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  Search, 
  RefreshCw,
  Package,
  Wrench,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import AssignPartsModal from './assign-parts-modal';
import JobQRCode from './job-qr-code';

export default function CustomerJobCards({ customerId, customerName }) {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showAssignPartsModal, setShowAssignPartsModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  // Helper function to check if job has parts and IP assigned
  const hasPartsAndIPAssigned = (job) => {
    return job.parts_required && 
           Array.isArray(job.parts_required) && 
           job.parts_required.length > 0 && 
           job.ip_address;
  };

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      console.log('Fetching job cards for customer ID:', customerId, 'Type:', typeof customerId);
      const response = await fetch(`/api/job-cards/customer/${customerId}`);
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error('Failed to fetch job cards');
      }
      const data = await response.json();
      console.log('Job cards response:', data);
      setJobCards(data.jobCards || []);
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchJobCards();
    }
  }, [customerId]);

  const handleAssignParts = (jobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignPartsModal(true);
  };

  const handleViewQRCode = (jobCard) => {
    if (!hasPartsAndIPAssigned(jobCard)) {
      toast.error('QR Code is only available after parts and IP address have been assigned');
      return;
    }
    setSelectedJobCard(jobCard);
    setShowQRCodeModal(true);
  };

  const handlePartsAssigned = (updatedJobCard) => {
    // Update the job card in the list
    setJobCards(prev => 
      prev.map(job => 
        job.id === updatedJobCard.data.id ? { ...job, ...updatedJobCard.data } : job
      )
    );
    toast.success('Parts assigned successfully');
  };

  const handleRefresh = () => {
    fetchJobCards();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      case 'cancelled':
        return 'Cancelled';
      case 'on_hold':
        return 'On Hold';
      default:
        return status || 'Unknown';
    }
  };

  const getJobTypeText = (jobType) => {
    switch (jobType) {
      case 'installation':
        return 'Installation';
      case 'deinstall':
        return 'De-installation';
      default:
        return jobType || 'Unknown';
    }
  };

  const filteredJobCards = jobCards.filter(job =>
    job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.job_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-2xl">Job Cards</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading job cards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-2xl">Job Cards</h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/job-cards/test');
                const data = await response.json();
                console.log('Test endpoint response:', data);
                toast.success(`Found ${data.total} job cards total`);
              } catch (error) {
                console.error('Test error:', error);
                toast.error('Test failed');
              }
            }} 
            variant="outline" 
            size="sm"
          >
            Test
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search jobs by job number, type, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Job Cards */}
      {filteredJobCards.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No job cards found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'No job cards match your search criteria.' : 'This customer has no job cards yet.'}
          </p>
        </div>
      ) : (
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobCards.map((job) => (
            <Card key={job.id} className="hover:shadow-lg overflow-hidden transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {job.job_number}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusColor(job.job_status)}>
                        {getStatusText(job.job_status)}
                      </Badge>
                      <Badge variant="outline">
                        {getJobTypeText(job.job_type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAssignParts(job)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Wrench className="mr-1 w-4 h-4" />
                      Assign Parts
                    </Button>
                    {hasPartsAndIPAssigned(job) && (
                      <Button
                        size="sm"
                        onClick={() => handleViewQRCode(job)}
                        variant="outline"
                      >
                        <QrCode className="mr-1 w-4 h-4" />
                        QR Code
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Customer Information */}
                <div className="flex items-start gap-2 text-sm">
                  <User className="flex-shrink-0 mt-0.5 w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">Customer:</span>
                    <span className="ml-1 text-gray-700 break-words">{job.customer_name || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="flex-shrink-0 mt-0.5 w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">Address:</span>
                    <span className="ml-1 text-gray-700 break-words">
                      {job.customer_address || 'No address provided'}
                    </span>
                  </div>
                </div>

                {/* Job Description */}
                {job.job_description && (
                  <div className="pt-2 border-t">
                    <p className="text-gray-600 text-sm break-words line-clamp-2">
                      {job.job_description}
                    </p>
                  </div>
                )}

                {/* Job Metadata */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-gray-500 text-xs">
                                         <div className="flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       <span>
                         {job.job_date ? new Date(job.job_date).toLocaleDateString() : 'No date'}
                       </span>
                     </div>
                    
                    {job.quotation_number && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="max-w-24 truncate">{job.quotation_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                {(job.customer_email || job.customer_phone) && (
                  <div className="pt-2 border-t">
                    <div className="space-y-1 text-gray-500 text-xs">
                      {job.customer_email && (
                        <div className="break-all">📧 {job.customer_email}</div>
                      )}
                      {job.customer_phone && (
                        <div className="break-all">📞 {job.customer_phone}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Parts Modal */}
      <AssignPartsModal
        isOpen={showAssignPartsModal}
        onClose={() => {
          setShowAssignPartsModal(false);
          setSelectedJobCard(null);
        }}
        jobCard={selectedJobCard}
        onPartsAssigned={handlePartsAssigned}
      />

      {/* QR Code Modal */}
      <JobQRCode
        isOpen={showQRCodeModal}
        onClose={() => {
          setShowQRCodeModal(false);
          setSelectedJobCard(null);
        }}
        jobCard={selectedJobCard}
      />
    </div>
  );
} 