'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  Search,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  FileText,
  Car,
  QrCode,
  Printer,
  MapPin,
  User,
  Calendar,
  Receipt,
  Download
} from 'lucide-react';
import DashboardHeader from '@/components/shared/DashboardHeader';
import DashboardTabs from '@/components/shared/DashboardTabs';
import AssignPartsModal from '@/components/ui-personal/assign-parts-modal';
import StockOrderModal from '@/components/accounts/StockOrderModal';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showAssignParts, setShowAssignParts] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRJob, setSelectedQRJob] = useState(null);
  const [activeTab, setActiveTab] = useState('job-cards');
  const [stockOrders, setStockOrders] = useState([]);
  const [stockOrdersLoading, setStockOrdersLoading] = useState(false);
  const [stockOrdersSearchTerm, setStockOrdersSearchTerm] = useState('');
  const [selectedStockOrder, setSelectedStockOrder] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    fetchJobCards();
  }, []);

  useEffect(() => {
    if (activeTab === 'stock-orders') {
      fetchStockOrders();
    }
  }, [activeTab]);

  const fetchStockOrders = async () => {
    try {
      setStockOrdersLoading(true);
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase
        .from('stock_orders')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stock orders:', error);
        toast.error('Failed to fetch stock orders');
        return;
      }

      setStockOrders(data || []);
    } catch (error) {
      console.error('Error fetching stock orders:', error);
      toast.error('Failed to fetch stock orders');
    } finally {
      setStockOrdersLoading(false);
    }
  };

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      console.log('Fetching job cards...');
      const response = await fetch('/api/job-cards');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', errorText);
        throw new Error('Failed to fetch job cards');
      }
      
      const data = await response.json();
      console.log('Job cards data:', data);
      console.log('Job cards array:', data.job_cards);
      console.log('Job cards count:', data.job_cards?.length || 0);
      
      setJobCards(data.job_cards || []);
      console.log('Set job cards:', data.job_cards?.length || 0, 'records');
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobCards = jobCards.filter(job => {
    const matchesSearch = 
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only show jobs without assigned parts in the main job cards tab
    const hasNoParts = !job.parts_required || !Array.isArray(job.parts_required) || job.parts_required.length === 0;
    
    return matchesSearch && hasNoParts;
  });

  const jobCardsWithParts = jobCards.filter(job => 
    job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0
  );

  const completedJobs = jobCards.filter(job => 
    job.job_status === 'completed' || job.status === 'completed'
  );

  const filteredStockOrders = stockOrders.filter(order => {
    if (!stockOrdersSearchTerm) return true;
    
    const searchLower = stockOrdersSearchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.supplier?.toLowerCase().includes(searchLower) ||
      order.status?.toLowerCase().includes(searchLower) ||
      (order.order_items && Array.isArray(order.order_items) && 
       order.order_items.some(item => 
         item.description?.toLowerCase().includes(searchLower)
       ))
    );
  });

  const handleAssignParts = (jobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignParts(true);
  };

  const handlePartsAssigned = () => {
    fetchJobCards();
    setShowAssignParts(false);
    setSelectedJobCard(null);
  };

  const handleShowQRCode = (jobCard) => {
    setSelectedQRJob(jobCard);
    setShowQRCode(true);
  };

  const handlePrintQR = (jobCard) => {
    if (!jobCard.qr_code) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job QR Code - ${jobCard.job_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-container { max-width: 800px; margin: 0 auto; }
            .job-info { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .job-info h2 { color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .job-info p { margin: 5px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-code img { border: 2px solid #333; border-radius: 8px; }
            .job-details { margin-top: 20px; }
            .section { margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
            .section h3 { color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
            .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .section-grid p { margin: 5px 0; }
            .part-item { padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid #3498db; }
            .part-header { font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
            .total-section { margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; background: #e8f4fd; padding: 15px; border-radius: 5px; }
            .vehicle-info { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60; }
            .customer-info { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f39c12; }
            .quotation-info { background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
            @media print {
              body { margin: 10px; }
              .qr-code img { max-width: 250px; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="job-info">
              <h2>Job QR Code - ${jobCard.job_number}</h2>
              <div class="section-grid">
                <div>
                  <p><strong>Job Number:</strong> ${jobCard.job_number}</p>
                  <p><strong>Quotation Number:</strong> ${jobCard.quotation_number || 'N/A'}</p>
                  <p><strong>Job Type:</strong> ${jobCard.job_type || 'Not specified'}</p>
                  <p><strong>Status:</strong> ${jobCard.status || 'N/A'}</p>
                  <p><strong>Priority:</strong> ${jobCard.priority || 'N/A'}</p>
                  <p><strong>IP Address:</strong> ${jobCard.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Created:</strong> ${jobCard.created_at ? new Date(jobCard.created_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Updated:</strong> ${jobCard.updated_at ? new Date(jobCard.updated_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Job Location:</strong> ${jobCard.job_location || 'N/A'}</p>
                  <p><strong>Estimated Duration:</strong> ${jobCard.estimated_duration_hours || 'N/A'} hours</p>
                  <p><strong>Estimated Cost:</strong> ${jobCard.estimated_cost ? `R${jobCard.estimated_cost}` : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="qr-code">
              <img src="${jobCard.qr_code}" alt="Job QR Code" />
              <p style="margin-top: 10px; color: #666; font-size: 12px;">
                Scan this QR code to access complete job information
              </p>
            </div>

            <div class="customer-info">
              <h3>Customer Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Customer Name:</strong> ${jobCard.customer_name || 'N/A'}</p>
                  <p><strong>Email:</strong> ${jobCard.customer_email || 'N/A'}</p>
                  <p><strong>Phone:</strong> ${jobCard.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Address:</strong> ${jobCard.customer_address || 'N/A'}</p>
                  <p><strong>Site Contact:</strong> ${jobCard.site_contact_person || 'N/A'}</p>
                  <p><strong>Contact Phone:</strong> ${jobCard.site_contact_phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="vehicle-info">
              <h3>Vehicle Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Registration:</strong> ${jobCard.vehicle_registration || 'Not provided'}</p>
                  <p><strong>Make & Model:</strong> ${jobCard.vehicle_make && jobCard.vehicle_model ? `${jobCard.vehicle_make} ${jobCard.vehicle_model}` : (jobCard.vehicle_make || jobCard.vehicle_model || 'Not provided')}</p>
                  <p><strong>Year:</strong> ${jobCard.vehicle_year || 'Not provided'}</p>
                </div>
                <div>
                  <p><strong>VIN Number:</strong> ${jobCard.vin_numer || 'Not provided'}</p>
                  <p><strong>Odometer:</strong> ${jobCard.odormeter || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div class="quotation-info">
              <h3>Quotation Details</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Quote Status:</strong> ${jobCard.quote_status || 'N/A'}</p>
                  <p><strong>Quote Date:</strong> ${jobCard.quote_date ? new Date(jobCard.quote_date).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Quote Expiry:</strong> ${jobCard.quote_expiry_date ? new Date(jobCard.quote_expiry_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Total Amount:</strong> ${jobCard.quotation_total_amount ? `R${jobCard.quotation_total_amount}` : 'N/A'}</p>
                  <p><strong>Products:</strong> ${jobCard.quotation_products?.length || 0} items</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Job Description</h3>
              <p>${jobCard.job_description || 'No description provided'}</p>
            </div>

            ${jobCard.special_instructions ? `
            <div class="section">
              <h3>Special Instructions</h3>
              <p>${jobCard.special_instructions}</p>
            </div>
            ` : ''}

            ${jobCard.access_requirements ? `
            <div class="section">
              <h3>Access Requirements</h3>
              <p>${jobCard.access_requirements}</p>
            </div>
            ` : ''}

            <div class="section">
              <h3>Assigned Parts</h3>
              <div class="part-list">
                ${jobCard.parts_required?.map(part => `
                  <div class="part-item">
                    <strong>${part.description}</strong> (${part.code})<br>
                    Quantity: ${part.quantity} | Supplier: ${part.supplier || 'N/A'}<br>
                    Cost: R${part.cost_per_unit?.toFixed(2) || '0.00'} each | Total: R${part.total_cost || '0.00'}
                  </div>
                `).join('') || 'No parts assigned'}
              </div>
              ${jobCard.parts_required && jobCard.parts_required.length > 0 ? `
              <div class="total-section">
                <p><strong>Total Parts:</strong> ${jobCard.parts_required.length}</p>
                <p><strong>Total Cost:</strong> R${jobCard.parts_required.reduce((sum, part) => sum + (parseFloat(part.total_cost) || 0), 0).toFixed(2)}</p>
              </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Handle viewing stock order details or PDF
  const handleViewStockOrder = (order) => {
    setSelectedStockOrder(order);
    if (order.invoice_link) {
      setShowPdfViewer(true);
    } else {
      // If no PDF, show order details in a toast
      toast({
        title: "Order Details",
        description: `Order: ${order.order_number}\nSupplier: ${order.supplier || 'Custom'}\nAmount: R ${parseFloat(order.total_amount_ex_vat || 0).toFixed(2)}\nStatus: ${order.status || 'pending'}`,
      });
    }
  };

  // Handle downloading stock order invoice
  const handleDownloadStockOrderInvoice = (order) => {
    if (order.invoice_link) {
      const link = document.createElement('a');
      link.href = order.invoice_link;
      link.download = `invoice-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobTypeColor = (jobType) => {
    switch (jobType?.toLowerCase()) {
      case 'installation':
        return 'bg-blue-100 text-blue-800';
      case 'de-installation':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const handleRefresh = () => {
    fetchJobCards();
  };

  const createTestJobCard = async () => {
    try {
      const response = await fetch('/api/job-cards/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test job card');
      }
      
      const data = await response.json();
      console.log('Test job card created:', data);
      toast.success('Test job card created successfully');
      fetchJobCards(); // Refresh the list
    } catch (error) {
      console.error('Error creating test job card:', error);
      toast.error('Failed to create test job card');
    }
  };

  const createTestStockItems = async () => {
    try {
      const response = await fetch('/api/stock/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test stock items');
      }
      
      const data = await response.json();
      console.log('Test stock items created:', data);
      toast.success('Test stock items created successfully');
    } catch (error) {
      console.error('Error creating test stock items:', error);
      toast.error('Failed to create test stock items');
    }
  };

  // Tab content components
  const jobCardsContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search job cards by job number, customer, vehicle, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={fetchJobCards} variant="outline" size="sm">
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh
        </Button>
        <Button onClick={createTestJobCard} variant="outline" size="sm" className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800">
          <Plus className="mr-2 w-4 h-4" />
          Create Test Job
        </Button>
        <Button onClick={createTestStockItems} variant="outline" size="sm" className="bg-purple-100 hover:bg-purple-200 text-purple-800">
          <User className="mr-2 w-4 h-4" />
          Create Test Stock
        </Button>
        <Button 
          onClick={() => window.open('/test-vehicle-verification', '_blank')} 
          variant="outline" 
          size="sm"
          className="bg-blue-100 hover:bg-blue-200 text-blue-800"
        >
          <Car className="mr-2 w-4 h-4" />
          Test Vehicle Verification
        </Button>
      </div>

      {/* Job Cards */}
      {filteredJobCards.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No job cards found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'No job cards match your search criteria.' : 'No job cards available.'}
          </p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobCards.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.job_number}</CardTitle>
                    <p className="text-gray-600 text-sm">{job.customer_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={`text-xs ${getStatusColor(job.job_status || job.status)}`}>
                      {job.job_status || job.status || 'Not Started'}
                    </Badge>
                    {job.job_type && (
                      <Badge variant="outline" className={`text-xs ${getJobTypeColor(job.job_type)}`}>
                        {job.job_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span>{job.vehicle_registration || 'No vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{job.customer_address || 'No address'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Due: {formatDate(job.due_date)}</span>
                  </div>
                </div>

                {job.job_description && (
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {job.job_description}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowQRCode(job)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <QrCode className="mr-1 w-3 h-3" />
                        View QR
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssignParts(job)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="mr-1 w-3 h-3" />
                        Assign Parts
                      </Button>
                    )}
                    {job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignParts(job)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="mr-1 w-3 h-3" />
                        Reassign Parts
                      </Button>
                    )}
                  </div>
                  {job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0 && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                      <Package className="mr-1 w-3 h-3" />
                      {job.parts_required.length} parts
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const assignedPartsContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Jobs with Assigned Parts</h2>
        <Badge variant="outline">{jobCardsWithParts.length} jobs</Badge>
      </div>

      {jobCardsWithParts.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No jobs with assigned parts</h3>
          <p className="text-gray-500">Jobs will appear here once parts are assigned.</p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {jobCardsWithParts.map((job) => (
            <Card key={job.id} className="bg-green-50 hover:shadow-md border-green-200 transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.job_number}</CardTitle>
                    <p className="text-gray-600 text-sm">{job.customer_name}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <Package className="mr-1 w-3 h-3" />
                    Parts Assigned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span>{job.vehicle_registration || 'No vehicle'}</span>
                  </div>
                  {job.ip_address && (
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <span>IP: {job.ip_address}</span>
                    </div>
                  )}
                  {job.job_type && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${getJobTypeColor(job.job_type)}`}>
                        {job.job_type}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  <p className="font-medium text-gray-700">Assigned Parts:</p>
                  <div className="space-y-1 mt-1">
                    {job.parts_required?.slice(0, 3).map((part, index) => (
                      <div key={index} className="flex justify-between text-gray-600 text-xs">
                        <span>• {part.description}</span>
                        <span className="text-green-600">Qty: {part.quantity}</span>
                      </div>
                    ))}
                    {job.parts_required?.length > 3 && (
                      <div className="text-gray-500 text-xs">
                        +{job.parts_required.length - 3} more parts
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShowQRCode(job)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <QrCode className="mr-1 w-3 h-3" />
                    View QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintQR(job)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Printer className="mr-1 w-3 h-3" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const completedJobsContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Completed Jobs</h2>
        <Badge variant="outline">{completedJobs.length} jobs</Badge>
      </div>

      {completedJobs.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No completed jobs</h3>
          <p className="text-gray-500">Completed jobs will appear here.</p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {completedJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.job_number}</CardTitle>
                    <p className="text-gray-600 text-sm">{job.customer_name}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span>{job.vehicle_registration || 'No vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Completed: {formatDate(job.completion_date)}</span>
                  </div>
                </div>

                {job.completion_notes && (
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {job.completion_notes}
                  </p>
                )}

                {job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0 && (
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShowQRCode(job)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <QrCode className="mr-1 w-3 h-3" />
                      View QR
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {job.parts_required.length} parts used
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const stockOrdersContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Stock Orders</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredStockOrders.length} orders</Badge>
          <Button onClick={fetchStockOrders} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search stock orders by order number, supplier, status, or item description..."
            value={stockOrdersSearchTerm}
            onChange={(e) => setStockOrdersSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {stockOrdersLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span>Loading stock orders...</span>
        </div>
      ) : filteredStockOrders.length === 0 ? (
        <div className="py-12 text-center">
          <Receipt className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            {stockOrdersSearchTerm ? 'No stock orders match your search criteria.' : 'No stock orders found'}
          </h3>
          <p className="text-gray-500">
            {stockOrdersSearchTerm ? 'Try adjusting your search terms.' : 'Stock orders will appear here once submitted.'}
          </p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredStockOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <p className="text-gray-600 text-sm">{order.supplier || 'Custom'}</p>
                  </div>
                  <Badge className={`text-xs ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status || 'pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Ordered: {formatDate(order.order_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span>Total: R {parseFloat(order.total_amount_ex_vat || 0).toFixed(2)}</span>
                  </div>
                  {order.total_amount_usd && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <span>USD: ${parseFloat(order.total_amount_usd).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Order Items:</p>
                    <div className="space-y-1 mt-1">
                      {order.order_items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between text-gray-600 text-xs">
                          <span>• {item.description || 'Custom Item'}</span>
                          <span className="text-blue-600">Qty: {item.quantity}</span>
                        </div>
                      ))}
                      {order.order_items.length > 3 && (
                        <div className="text-gray-500 text-xs">
                          +{order.order_items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  {order.invoice_link ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewStockOrder(order)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="mr-1 w-3 h-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadStockOrderInvoice(order)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <FileText className="mr-1 w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No invoice available</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {order.order_items?.length || 0} items
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      value: 'job-cards',
      label: 'Job Cards',
      icon: FileText,
      content: jobCardsContent
    },
    {
      value: 'assigned-parts',
      label: 'Assigned Parts',
      icon: Package,
      content: assignedPartsContent
    },
    {
      value: 'completed-jobs',
      label: 'Completed Jobs',
      icon: CheckCircle,
      content: completedJobsContent
    },
    {
      value: 'stock-orders',
      label: 'Stock Orders',
      icon: Receipt,
      content: stockOrdersContent
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Inventory Management"
          subtitle="Manage job cards, assign parts, and track inventory"
          icon={Package}
        />
        
        {/* Order Stock Button */}
        <div className="flex justify-end">
          <StockOrderModal onOrderSubmitted={fetchStockOrders} />
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading job cards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inventory Management"
        subtitle="Manage job cards, assign parts, and track inventory"
        icon={Package}
      />
      
      {/* Order Stock Button */}
      <div className="flex justify-end">
        <StockOrderModal onOrderSubmitted={fetchStockOrders} />
      </div>

      {/* Assign Parts Modal */}
      {selectedJobCard && (
        <AssignPartsModal
          isOpen={showAssignParts}
          onClose={() => {
            setShowAssignParts(false);
            setSelectedJobCard(null);
          }}
          jobCard={selectedJobCard}
          onPartsAssigned={handlePartsAssigned}
        />
      )}

      {/* QR Code Modal */}
      {selectedQRJob && showQRCode && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-xl">Job QR Code - {selectedQRJob.job_number}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQRCode(false);
                  setSelectedQRJob(null);
                }}
              >
                Close
              </Button>
            </div>
            <div className="space-y-4">
              {selectedQRJob.qr_code ? (
                <>
                  {/* QR Code */}
                  <div className="mb-6 text-center">
                    <img 
                      src={selectedQRJob.qr_code} 
                      alt="Job QR Code" 
                      className="mx-auto border rounded-lg"
                      style={{ maxWidth: '200px' }}
                    />
                    <p className="mt-2 text-gray-500 text-xs">
                      Scan this QR code to access complete job information
                    </p>
                  </div>

                  {/* Job Information Grid */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    {/* Basic Job Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">Job Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Job Number:</strong> {selectedQRJob.job_number}</div>
                        <div><strong>Quotation:</strong> {selectedQRJob.quotation_number || 'N/A'}</div>
                        <div><strong>Type:</strong> {selectedQRJob.job_type || 'N/A'}</div>
                        <div><strong>Status:</strong> {selectedQRJob.status || 'N/A'}</div>
                        <div><strong>Priority:</strong> {selectedQRJob.priority || 'N/A'}</div>
                        <div><strong>IP Address:</strong> {selectedQRJob.ip_address || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">Customer Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedQRJob.customer_name || 'N/A'}</div>
                        <div><strong>Email:</strong> {selectedQRJob.customer_email || 'N/A'}</div>
                        <div><strong>Phone:</strong> {selectedQRJob.customer_phone || 'N/A'}</div>
                        <div><strong>Address:</strong> {selectedQRJob.customer_address || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">Vehicle Information</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Registration:</strong> {selectedQRJob.vehicle_registration || 'Not provided'}</div>
                        <div><strong>Make:</strong> {selectedQRJob.vehicle_make || 'Not provided'}</div>
                        <div><strong>Model:</strong> {selectedQRJob.vehicle_model || 'Not provided'}</div>
                        <div><strong>Year:</strong> {selectedQRJob.vehicle_year || 'Not provided'}</div>
                        <div><strong>VIN:</strong> {selectedQRJob.vin_numer || 'Not provided'}</div>
                        <div><strong>Odometer:</strong> {selectedQRJob.odormeter || 'Not provided'}</div>
                      </div>
                    </div>

                    {/* Quotation Info */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">Quotation Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Total Amount:</strong> {selectedQRJob.quotation_total_amount ? `R${selectedQRJob.quotation_total_amount}` : 'N/A'}</div>
                        <div><strong>Products:</strong> {selectedQRJob.quotation_products?.length || 0} items</div>
                        <div><strong>Quote Status:</strong> {selectedQRJob.quote_status || 'N/A'}</div>
                        <div><strong>Created:</strong> {selectedQRJob.created_at ? new Date(selectedQRJob.created_at).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  {selectedQRJob.job_description && (
                    <div className="bg-white p-4 border rounded-lg">
                      <h3 className="mb-2 font-medium text-gray-900">Job Description</h3>
                      <p className="text-gray-600 text-sm">{selectedQRJob.job_description}</p>
                    </div>
                  )}

                  {/* Special Instructions */}
                  {selectedQRJob.special_instructions && (
                    <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                      <h3 className="mb-2 font-medium text-gray-900">Special Instructions</h3>
                      <p className="text-gray-600 text-sm">{selectedQRJob.special_instructions}</p>
                    </div>
                  )}

                  {/* Assigned Parts */}
                  {selectedQRJob.parts_required && Array.isArray(selectedQRJob.parts_required) && selectedQRJob.parts_required.length > 0 && (
                    <div className="bg-white p-4 border rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">Assigned Parts</h3>
                      <div className="space-y-2">
                        {selectedQRJob.parts_required.map((part, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div>
                              <span className="font-medium">{part.description}</span>
                              <span className="ml-2 text-gray-500 text-sm">({part.code})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Qty: {part.quantity}
                              </Badge>
                              {part.total_cost && (
                                <Badge variant="outline" className="text-xs">
                                  R{part.total_cost}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-2 pt-4">
                    <Button 
                      onClick={() => handlePrintQR(selectedQRJob)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="mr-2 w-4 h-4" />
                      Print Complete Job Details
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <QrCode className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="text-gray-500">No QR code available for this job.</p>
                  <p className="mt-2 text-gray-400 text-sm">QR codes are generated when parts are assigned.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <DashboardTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* PDF Viewer Modal for Stock Orders */}
      <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Invoice PDF: {selectedStockOrder?.order_number}</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedStockOrder && handleDownloadStockOrderInvoice(selectedStockOrder)}
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPdfViewer(false)}
                >
                  Close
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {selectedStockOrder?.invoice_link ? (
              <iframe
                src={selectedStockOrder.invoice_link}
                className="border-0 rounded-lg w-full h-[80vh]"
                title={`Invoice for Order ${selectedStockOrder.order_number}`}
                onError={() => {
                  toast({
                    title: "Error",
                    description: "Failed to load PDF. Please try downloading instead.",
                    variant: "destructive"
                  });
                }}
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900 text-sm">No PDF Available</h3>
                  <p className="mt-1 text-gray-500 text-sm">
                    This order doesn't have an invoice PDF attached.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}