'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface Part {
  description: string;
  quantity: number;
  code: string;
  supplier: string;
  cost_per_unit: number;
  total_cost: number;
  stock_id?: string;
  available_stock?: number;
  date_added?: string;
  boot_stock?: string; // Add boot_stock indicator field
}

interface JobCard {
  id: string;
  job_number: string;
  job_date?: string;
  due_date?: string;
  completion_date?: string;
  status?: string;
  job_status?: string;
  job_type?: string;
  job_description?: string;
  priority?: string;
  customer_name?: string;
  customer_address?: string;
  customer_email?: string;
  customer_phone?: string;
  contact_person?: string;
  decommission_date?: string;
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  assigned_technician_id?: string;
  technician_name?: string;
  technician_phone?: string;
  parts_required?: Part[];
  products_required?: Record<string, unknown>[];
  quotation_products?: Record<string, unknown>[];
  equipment_used?: Record<string, unknown>[];
  estimated_duration_hours?: number;
  estimated_cost?: number;
  ip_address?: string;
  qr_code?: string;
  vin_numer?: string;
  odormeter?: string;
  created_at: string;
  updated_at?: string;
  completion_notes?: string;
  quotation_number?: string;
  quotation_products?: Record<string, unknown>[];
  quotation_total_amount?: number;
}

interface StockOrder {
  id: string;
  order_number?: string;
  supplier?: string;
  status?: string;
  order_items?: Record<string, unknown>[];
  created_at: string;
}

interface StockItem {
  id: number;
  description?: string;
  code?: string;
  supplier?: string;
  stock_type?: string;
  quantity?: string;
  ip_addresses?: string[] | Record<string, string>;
}

interface StockUpdate {
  id: number;
  current_quantity: number;
  new_quantity: number;
  difference: number;
}
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
  // MapPin,
  User,
  Calendar,
  Receipt,
  Download,
  ClipboardList,
  Filter,
  Save,
  Network,
  Eye
} from 'lucide-react';
import DashboardHeader from '@/components/shared/DashboardHeader';
import DashboardTabs from '@/components/shared/DashboardTabs';
import AssignPartsModal from '@/components/ui-personal/assign-parts-modal';
import StockOrderModal from '@/components/accounts/StockOrderModal';
import AssignIPAddressModal from '@/components/inv/components/AssignIPAddressModal';
import CreateRepairJobModal from '@/components/inv/CreateRepairJobModal';
import { toast } from 'sonner';

export default function InventoryPage() {
  console.log('InventoryPage component rendering');
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showAssignParts, setShowAssignParts] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRJob, setSelectedQRJob] = useState<JobCard | null>(null);
  const [activeTab, setActiveTab] = useState('job-cards');
  const [stockOrders, setStockOrders] = useState<StockOrder[]>([]);
  const [stockOrdersLoading, setStockOrdersLoading] = useState(false);
  const [stockOrdersSearchTerm, setStockOrdersSearchTerm] = useState('');
  const [selectedStockOrder, setSelectedStockOrder] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showOrderItemsModal, setShowOrderItemsModal] = useState(false);
  const [allIpAddresses, setAllIpAddresses] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({ category_code: '', serial_number: '', quantity: 1, new_category_code: '', new_category_description: '' });
  const [showNewCategoryFields, setShowNewCategoryFields] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [generatedQR, setGeneratedQR] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadOrder, setUploadOrder] = useState(null);
  const [uploadItems, setUploadItems] = useState([]);
  const [selectedDeinstallJob, setSelectedDeinstallJob] = useState<JobCard | null>(null);
  
  // Stock Take state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockTakeMode, setStockTakeMode] = useState(false);
  const [updatedItems, setUpdatedItems] = useState<Record<number, StockUpdate>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stockTakeSearchTerm, setStockTakeSearchTerm] = useState('');
  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState<(string | {code: string, description: string})[]>([]);
  const [stockTakeActiveTab, setStockTakeActiveTab] = useState('stock-take');
  const [thresholds, setThresholds] = useState<Record<number, number>>({});
  const [defaultThreshold, setDefaultThreshold] = useState(10);
  
  // IP address assignment state
  const [showIpAddressModal, setShowIpAddressModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  
  // Reset selected item when stock take mode changes
  useEffect(() => {
    if (stockTakeMode) {
      setSelectedStockItem(null);
    }
  }, [stockTakeMode]);

  useEffect(() => {
    fetchJobCards();
    fetchAllStockItems();
    // Force fetch stock items on mount
    console.log('Component mounted, forcing fetchStockItems');
    fetchStockItems();
    // Also fetch categories on mount
    fetchCategories();
  }, []);

  useEffect(() => {
    console.log('activeTab changed to:', activeTab);
    if (activeTab === 'stock-orders') {
      fetchStockOrders();
    }
    if (activeTab === 'stock-take') {
      console.log('Calling fetchStockItems because activeTab is stock-take');
      fetchStockItems();
    }
  }, [activeTab]);

  // Debug: Log current activeTab
  console.log('Current activeTab:', activeTab);

  useEffect(() => {
    if (activeTab === 'stock-take') {
      fetchStockItems();
    }
  }, [stockTakeActiveTab]);

  // Debug: Log stockItems changes
  useEffect(() => {
    console.log('stockItems state changed:', stockItems.length, 'items');
    if (stockItems.length > 0) {
      console.log('First stockItem:', stockItems[0]);
      console.log('Sample category info:', {
        category_code: stockItems[0].category_code,
        category_description: stockItems[0].category_description
      });
    }
  }, [stockItems]);

  // Debug: Log stockTypes changes
  useEffect(() => {
    console.log('stockTypes state changed:', stockTypes.length, 'categories');
    if (stockTypes.length > 0) {
      console.log('First stockType:', stockTypes[0]);
      console.log('All stockTypes:', stockTypes);
    }
  }, [stockTypes]);

  const fetchStockOrders = async () => {
    try {
      setStockOrdersLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

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

  const extractIpAddressesFromStock = (stockItems) => {
    const ipSet = new Set();
    stockItems.forEach(item => {
      if (item.ip_addresses && Array.isArray(item.ip_addresses)) {
        item.ip_addresses.forEach(ip => ipSet.add(ip));
      }
    });
    return Array.from(ipSet).map(ip => ({ ip_address: ip }));
  };

  const fetchAllStockItems = async () => {
    try {
      const response = await fetch('/api/stock');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stock API error:', response.status, errorText);
        throw new Error(`Failed to fetch stock items: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      const stockItems = data.stock || [];
      setAllStockItems(stockItems);
      setAllIpAddresses(extractIpAddressesFromStock(stockItems));
      
      // Also set stockItems for Stock Take tab if it's empty
      if (stockItems.length > 0) {
        console.log('Setting stockItems from fetchAllStockItems');
        setStockItems(stockItems);
      }
    } catch (error) {
      console.error('Error fetching stock items:', error);
    }
  };

  const filteredJobCards = jobCards.filter((job: JobCard) => {
    const matchesSearch = 
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only show jobs without assigned parts in the main job cards tab
    const hasNoParts = !job.parts_required || !Array.isArray(job.parts_required) || job.parts_required.length === 0;
    
    return matchesSearch && hasNoParts;
  });

  const jobCardsWithParts = jobCards.filter((job: JobCard) => 
    job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0
  );

  const completedJobs = jobCards.filter((job: JobCard) => 
    job.job_status === 'completed' || job.status === 'completed'
  );

  interface OrderItem {
    description?: string;
    [key: string]: unknown;
  }

  const filteredStockOrders = stockOrders.filter((order: StockOrder) => {
    if (!stockOrdersSearchTerm) return true;
    
    const searchLower = stockOrdersSearchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.supplier?.toLowerCase().includes(searchLower) ||
      order.status?.toLowerCase().includes(searchLower) ||
      (order.order_items && Array.isArray(order.order_items) && 
       order.order_items.some((item: OrderItem) => 
         item.description?.toLowerCase().includes(searchLower)
       ))
    );
  });

  const handleAssignParts = (jobCard: JobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignParts(true);
  };

  const handlePartsAssigned = () => {
    fetchJobCards();
    setShowAssignParts(false);
    setSelectedJobCard(null);
  };

  const handleBookStock = async (job: JobCard) => {
    // Show loading toast
    const loadingToast = toast.loading(`Booking stock for job ${job.job_number}...`);
    
    try {
      // Update the job status to move it to admin
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      console.log('Booking stock for job:', job.id, job.job_number);
      
      // Get existing parts or initialize an empty array
      let existingParts = [];
      
      // Safely handle the existing parts
      if (job.parts_required) {
        try {
          // Check if it's an array and make a clean copy
          if (Array.isArray(job.parts_required)) {
            existingParts = JSON.parse(JSON.stringify(job.parts_required));
          } else {
            console.log('parts_required is not an array:', typeof job.parts_required, job.parts_required);
            existingParts = [];
          }
        } catch (e) {
          console.error('Error parsing parts_required:', e);
          existingParts = [];
        }
      }
      
      console.log('Initial parts array:', existingParts);
      
      // Create a boot stock part entry to indicate this is boot stock
      // Use a simple object structure that's safe for JSONB serialization
      const bootStockPart: Part = {
        description: "Boot Stock",
        quantity: 1,
        code: "BOOT-STOCK",
        supplier: "Internal",
        cost_per_unit: 0,
        total_cost: 0,
        stock_id: `boot-stock-${Date.now()}`, // Use simple timestamp without Date object
        available_stock: 1,
        date_added: new Date().toISOString(),
        boot_stock: "yes" // Mark this part as boot stock - this is the key field
      };
      
      // Add boot stock part to the array
      existingParts.push(bootStockPart);
      
      console.log('Updated parts array with boot stock:', existingParts);
      
      // Create update data with the parts_required array (no parts_booked field)
      const updateData = {
        status: 'admin_created', 
        updated_at: new Date().toISOString(),
        parts_required: existingParts // Store boot stock in parts_required as per DB schema
      };
      
      console.log('Update data:', JSON.stringify(updateData));
      
      try {
        console.log(`Updating job_cards with id=${job.id}`);
        
        // Make sure parts_required is properly structured before sending to Supabase
        const cleanPartsData = updateData.parts_required.map((part: Part) => {
          // Create a clean object with only the properties we need
          // Make sure all values are proper JSON-serializable types
          return {
            description: String(part.description || ''),
            quantity: Number(part.quantity || 0),
            code: String(part.code || ''),
            supplier: String(part.supplier || ''),
            cost_per_unit: Number(part.cost_per_unit || 0),
            total_cost: Number(part.total_cost || 0),
            stock_id: String(part.stock_id || ''),
            available_stock: Number(part.available_stock || 0),
            date_added: String(part.date_added || ''),
            boot_stock: String(part.boot_stock || '') // Ensure boot_stock is included
          };
        });
        
        // Use the cleaned data for the update
        const cleanUpdateData = {
          ...updateData,
          parts_required: cleanPartsData
        };
        
        console.log('Clean update data:', JSON.stringify(cleanUpdateData));
        
        // Use a try-catch specifically for the Supabase call
        try {
          // Log the exact API call we're making
          console.log(`API call: UPDATE job_cards SET data WHERE id = ${job.id}`);
          console.log('Data being sent:', JSON.stringify(cleanUpdateData));
          
          const { data, error: updateError } = await supabase
            .from('job_cards')
            .update(cleanUpdateData)
            .eq('id', job.id)
            .select();
            
          if (updateError) {
            console.error('Update error message:', updateError.message);
            console.error('Update error details:', updateError.details);
            console.error('Update error hint:', updateError.hint);
            console.error('Update error code:', updateError.code);
            
            // Log more details about the error
            console.error('Full error object:', JSON.stringify(updateError));
            throw new Error(`Database update failed: ${updateError.message}`);
          }
          
          console.log('Update succeeded with data:', data);
        } catch (supabaseError) {
          console.error('Supabase operation failed:', supabaseError);
          throw supabaseError;
        }
        
        console.log('Update completed successfully');
        
        // Success
        toast.dismiss(loadingToast);
        toast.success(`Boot stock part added to job ${job.job_number} and moved to admin`);
        
        // Refresh job cards to show updated status
        fetchJobCards();
      } catch (updateError) {
        console.error('Caught error during update:', updateError);
        
        // Get a meaningful error message if possible
        let errorMessage = 'Failed to update job status';
        if (updateError instanceof Error) {
          errorMessage = updateError.message;
        }
        
        toast.dismiss(loadingToast);
        toast.error(errorMessage);
        return;
      }
    } catch (error) {
      console.error('Error in booking stock:', error);
      
      // Get a meaningful error message if possible
      let errorMessage = 'Failed to book stock for this job';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.dismiss(loadingToast);
      toast.error(errorMessage);
    }
  };

  const handleShowQRCode = (jobCard: JobCard) => {
    if (!jobCard.qr_code) {
      const qrData = {
        job_number: jobCard.job_number,
        job_id: jobCard.id,
        customer_name: jobCard.customer_name,
        vehicle_registration: jobCard.vehicle_registration,
        job_type: jobCard.job_type,
        parts_required: jobCard.parts_required || [],
        technician: jobCard.technician_name,
        created_at: jobCard.created_at
      };
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
      jobCard.qr_code = qrCodeUrl;
    }
    setSelectedQRJob(jobCard);
    setShowQRCode(true);
  };

  const handleGenerateJobQR = (jobCard: JobCard) => {
    const qrData = {
      job_number: jobCard.job_number,
      job_id: jobCard.id,
      customer_name: jobCard.customer_name,
      vehicle_registration: jobCard.vehicle_registration,
      job_type: jobCard.job_type,
      parts_required: jobCard.parts_required || [],
      technician: jobCard.technician_name,
      created_at: jobCard.created_at
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    
    // Update the job with the new QR code
    setSelectedQRJob({...jobCard, qr_code: qrCodeUrl});
  };

  const handleDownloadQR = (jobCard: JobCard) => {
    if (!jobCard.qr_code) return;
    
    const link = document.createElement('a');
    link.href = jobCard.qr_code;
    link.download = `qr-code-${jobCard.job_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = (jobCard: JobCard) => {
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
  const handleViewStockOrder = (order: StockOrder & {invoice_link?: string, total_amount_ex_vat?: number}) => {
    setSelectedStockOrder(order);
    if (order.invoice_link) {
      setShowPdfViewer(true);
    } else {
      // If no PDF, show order details in a toast
      toast({
        title: "Order Details",
        description: `Order: ${order.order_number}\nSupplier: ${order.supplier || 'Custom'}\nAmount: R ${parseFloat(String(order.total_amount_ex_vat || 0)).toFixed(2)}\nStatus: ${order.status || 'pending'}`,
      });
    }
  };

  // Handle viewing order items
  const handleViewOrderItems = (order: StockOrder) => {
    setSelectedStockOrder(order);
    setShowOrderItemsModal(true);
  };

  // Handle downloading stock order invoice
  const handleDownloadStockOrderInvoice = (order: StockOrder & {invoice_link?: string}) => {
    if (order.invoice_link) {
      const link = document.createElement('a');
      link.href = order.invoice_link;
      link.download = `invoice-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusColor = (status: string | undefined) => {
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

  const getJobTypeColor = (jobType: string | undefined) => {
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
  
  // We've made all Book Stock buttons always clickable
  // This function checks if a job has boot stock assigned
  const hasBootStock = (job: JobCard): boolean => {
    try {
      if (!job || !job.parts_required) {
        return false;
      }
      
      // Check if parts_required is an array
      if (!Array.isArray(job.parts_required)) {
        console.warn('parts_required is not an array:', job.parts_required);
        return false;
      }
      
      // Check if any part has boot_stock="yes"
      return job.parts_required.some(part => {
        // Safely check if part is an object and has boot_stock property
        return part && typeof part === 'object' && part.boot_stock === "yes";
      });
    } catch (error) {
      console.error('Error in hasBootStock:', error);
      return false;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Function kept for potential future use with a global refresh button
  // const handleRefresh = () => {
  //   fetchJobCards();
  // };

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

  const handleUploadToStock = (order) => {
    if (!order.order_items || !Array.isArray(order.order_items)) {
      toast.error('No items found in this order');
      return;
    }

    // Prepare items for serial number entry
    const items = [];
    order.order_items.forEach((item, itemIndex) => {
      const quantity = parseInt(item.quantity) || 1;
      for (let i = 0; i < quantity; i++) {
        items.push({
          id: `${itemIndex}-${i}`,
          description: item.description || 'Custom Item',
          serialNumber: '',
          categoryCode: item.description?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10) || 'ORDERED'
        });
      }
    });

    setUploadOrder(order);
    setUploadItems(items);
    setShowUploadModal(true);
  };

  const handleUploadSingle = async (item) => {
    if (!item.serialNumber.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    try {
      const response = await fetch('/api/stock-orders/upload-to-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: uploadOrder.id,
          items: [item]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload item');
      }

      toast.success(`Successfully uploaded ${item.description}`);
      // Remove uploaded item from list
      setUploadItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      console.error('Error uploading item:', error);
      toast.error(error.message || 'Failed to upload item');
    }
  };

  const handleConfirmUpload = async () => {
    const itemsToUpload = uploadItems.filter(item => item.serialNumber.trim());
    if (itemsToUpload.length === 0) {
      toast.error('Please enter serial numbers for at least one item');
      return;
    }

    try {
      const response = await fetch('/api/stock-orders/upload-to-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: uploadOrder.id,
          items: itemsToUpload
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload to stock');
      }

      const result = await response.json();
      toast.success(`Successfully uploaded ${result.itemsCreated} items to stock`);
      setShowUploadModal(false);
      fetchStockOrders();
    } catch (error) {
      console.error('Error uploading to stock:', error);
      toast.error(error.message || 'Failed to upload to stock');
    }
  };

  const updateSerialNumber = (itemId, serialNumber) => {
    setUploadItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, serialNumber } : item
    ));
  };

  const handleAddNewItem = async () => {
    // Validate required fields
    if (showNewCategoryFields) {
      if (!newItemData.new_category_code || !newItemData.new_category_description || !newItemData.serial_number) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!newItemData.category_code || !newItemData.serial_number) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    try {
      let categoryCode = newItemData.category_code;
      
      // Create new category if needed
      if (showNewCategoryFields) {
        const categoryResponse = await fetch('/api/inventory-categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: newItemData.new_category_code,
            description: newItemData.new_category_description
          }),
        });

        if (!categoryResponse.ok) {
          const errorData = await categoryResponse.json();
          throw new Error(errorData.error || 'Failed to create category');
        }
        
        categoryCode = newItemData.new_category_code;
        toast.success('New category created successfully');
      }

      // Create the inventory item
      const itemResponse = await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_code: categoryCode,
          serial_number: newItemData.serial_number,
          quantity: newItemData.quantity
        }),
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json();
        throw new Error(errorData.error || 'Failed to create item');
      }

      toast.success('New item added successfully');
      setShowAddItemModal(false);
      setNewItemData({ category_code: '', serial_number: '', quantity: 1, new_category_code: '', new_category_description: '' });
      setShowNewCategoryFields(false);
      fetchStockItems();
      fetchCategories(); // Refresh categories list
    } catch (error) {
      console.error('Error adding new item:', error);
      toast.error(error.message || 'Failed to add new item');
    }
  };

  const fetchCategoriesForModal = async () => {
    try {
      const response = await fetch('/api/inventory-categories');
      if (response.ok) {
        const data = await response.json();
        setStockTypes(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (showAddItemModal && stockTypes.length === 0) {
      fetchCategoriesForModal();
    }
  }, [showAddItemModal]);

  const generateQRCode = () => {
    const selectedJob = jobCardsWithParts[0] || filteredJobCards[0];
    if (!selectedJob) {
      toast.error('No job available to generate QR code');
      return;
    }

    const qrData = {
      job_number: selectedJob.job_number,
      job_id: selectedJob.id,
      customer_name: selectedJob.customer_name,
      vehicle_registration: selectedJob.vehicle_registration,
      job_type: selectedJob.job_type,
      parts_required: selectedJob.parts_required || [],
      technician: selectedJob.technician_name,
      created_at: selectedJob.created_at
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    setGeneratedQR(qrCodeUrl);
    setShowQRModal(true);
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

  const createTestCategories = async () => {
    try {
      const response = await fetch('/api/inventory-categories/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test categories');
      }
      
      const data = await response.json();
      console.log('Test categories created:', data);
      toast.success('Test categories created successfully');
      // Refresh categories after creation
      fetchCategories();
    } catch (error) {
      console.error('Error creating test categories:', error);
      toast.error('Failed to create test categories');
    }
  };

  const testCategoriesAPI = async () => {
    try {
      console.log('Testing categories API...');
      const response = await fetch('/api/inventory-categories');
      console.log('Categories API response status:', response.status);
      const data = await response.json();
      console.log('Categories API response data:', data);
      toast.success(`Found ${data.categories?.length || 0} categories`);
    } catch (error) {
      console.error('Error testing categories API:', error);
      toast.error('Failed to test categories API');
    }
  };

  // Stock Take Functions
  const fetchStockItems = async () => {
    console.log('fetchStockItems called, activeTab:', activeTab, 'stockTakeActiveTab:', stockTakeActiveTab);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedStockType !== 'all') {
        params.append('category', selectedStockType);
      }
      
      // Add view parameter based on active tab
      if (stockTakeActiveTab === 'thresholds') {
        params.append('view', 'thresholds');
      }
      
      console.log('Fetching stock with params:', params.toString());
      const response = await fetch(`/api/stock?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stock API error:', response.status, errorText);
        throw new Error(`Failed to fetch stock items: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      console.log('Stock items received:', data.stock?.slice(0, 2)); // Log first 2 items
      console.log('Setting stockItems state with:', data.stock?.length, 'items');
      setStockItems(data.stock || []);
      console.log('StockItems state updated');
      
      // Always fetch categories for filter dropdown
      await fetchCategories();
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast.error('Failed to load stock items');
    }
  };

  // Separate function to fetch categories
  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const categoriesResponse = await fetch('/api/inventory-categories');
      console.log('Categories response status:', categoriesResponse.status);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log('Categories API response:', categoriesData);
        console.log('Categories array:', categoriesData.categories);
        console.log('Setting stockTypes with:', categoriesData.categories?.length || 0, 'categories');
        setStockTypes(categoriesData.categories || []);
      } else {
        console.error('Categories API error:', categoriesResponse.status);
        const errorText = await categoriesResponse.text();
        console.error('Categories API error text:', errorText);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleStartStockTake = () => {
    setStockTakeMode(true);
    setUpdatedItems({});
    setHasChanges(false);
    toast.success('Stock take mode activated. You can now update quantities.');
  };

  const handleCancelStockTake = () => {
    setStockTakeMode(false);
    setUpdatedItems({});
    setHasChanges(false);
    toast.info('Stock take cancelled. No changes were saved.');
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const currentQuantity = parseInt(stockItems.find(item => item.id === itemId)?.quantity || '0');
    const parsedQuantity = parseInt(newQuantity) || 0;
    
    setUpdatedItems(prev => ({
      ...prev,
      [itemId]: {
        id: itemId,
        current_quantity: currentQuantity,
        new_quantity: parsedQuantity,
        difference: parsedQuantity - currentQuantity
      }
    }));
    
    setHasChanges(true);
  };

  const handlePublishStockTake = async () => {
    if (!hasChanges) {
      toast.error('No changes to publish');
      return;
    }

    try {
      setPublishing(true);
      const response = await fetch('/api/stock/stock-take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_updates: Object.values(updatedItems),
          stock_take_date: new Date().toISOString(),
          notes: `Stock take completed on ${new Date().toLocaleDateString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish stock take');
      }

      const result = await response.json();
      toast.success(`Stock take published successfully! ${result.updated_count} items updated.`);
      
      // Reset state
      setStockTakeMode(false);
      setUpdatedItems({});
      setHasChanges(false);
      
      // Refresh stock items
      fetchStockItems();
    } catch (error) {
      console.error('Error publishing stock take:', error);
      toast.error('Failed to publish stock take');
    } finally {
      setPublishing(false);
    }
  };

  // This function is available for potential future reporting features
  // Will be used to display detailed difference information
  // const getQuantityDifference = (itemId) => {
  //   const update = updatedItems[itemId];
  //   if (!update) return null;
  //   
  //   if (update.difference > 0) {
  //     return { type: 'increase', value: update.difference };
  //   } else if (update.difference < 0) {
  //     return { type: 'decrease', value: Math.abs(update.difference) };
  //   }
  //   return null;
  // };

  const getQuantityDifferenceColor = (difference) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };
  
  // Handle IP address assignment completion
  const handleIPAddressesAssigned = (itemId: number, ipAddresses: string[]) => {
    // Update the stock item in the local state
    setStockItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          ip_addresses: ipAddresses
        };
      }
      return item;
    }));
  };

  const getStockTypeColor = (stockType) => {
    const colors = {
      'Tracking Equipment': 'bg-blue-100 text-blue-800',
      'Accessories': 'bg-green-100 text-green-800',
      'Hardware': 'bg-orange-100 text-orange-800',
      'Electronics': 'bg-purple-100 text-purple-800',
      'Software': 'bg-indigo-100 text-indigo-800'
    };
    return colors[stockType] || 'bg-gray-100 text-gray-800';
  };

  // Boot stock state
  const [bootStock, setBootStock] = useState([]);
  const [bootStockLoading, setBootStockLoading] = useState(false);

  // Fetch boot stock from tech_stock
  const fetchBootStock = async () => {
    try {
      setBootStockLoading(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: techStock, error } = await supabase
        .from('tech_stock')
        .select('assigned_parts')
        .eq('technician_email', user.email)
        .single();

      if (error) {
        console.error('Error fetching tech stock:', error);
        return;
      }

      const assignedParts = techStock?.assigned_parts || [];
      const bootStockItems = assignedParts.filter(item => item.boot_stock === 'yes');
      setBootStock(bootStockItems);
    } catch (error) {
      console.error('Error fetching boot stock:', error);
    } finally {
      setBootStockLoading(false);
    }
  };

  // Threshold management functions
  const handleThresholdChange = (itemId, newThreshold) => {
    setThresholds(prev => ({
      ...prev,
      [itemId]: parseInt(newThreshold) || defaultThreshold
    }));
  };

  const getItemThreshold = (itemId) => {
    return thresholds[itemId] || defaultThreshold;
  };

  const isLowStock = (item) => {
    const threshold = getItemThreshold(item.id);
    return parseInt(item.quantity || 0) <= threshold;
  };

  const getLowStockStyle = (item) => {
    return isLowStock(item) ? 'bg-red-50 border-red-200' : '';
  };

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = !stockTakeSearchTerm ||
      item.serial_number?.toLowerCase().includes(stockTakeSearchTerm.toLowerCase());
    
    const matchesType = selectedStockType === 'all' || item.category_code === selectedStockType;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    // Sort low stock items to the top
    const aIsLow = isLowStock(a);
    const bIsLow = isLowStock(b);
    if (aIsLow && !bIsLow) return -1;
    if (!aIsLow && bIsLow) return 1;
    return 0;
  });

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
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="relative w-full overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Job Number</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Customer</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Job Type</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Status</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCards.map((job) => {
                  const hasDecommissionDate = job.decommission_date && job.decommission_date.trim() !== '';
                  const shouldBlink = hasDecommissionDate && !job.technician_name;
                  
                  return (
                    <tr 
                      key={job.id} 
                      className={`border-b hover:bg-gray-50 ${
                        shouldBlink 
                          ? 'animate-pulse bg-amber-50 border-amber-200 shadow-md' 
                          : hasDecommissionDate 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : ''
                      }`}
                    >
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.job_number}</span>
                          {shouldBlink && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                                URGENT
                              </span>
                            </div>
                          )}
                        </div>
                        {job.quotation_number && (
                          <span className="text-xs text-gray-500">Quote: {job.quotation_number}</span>
                        )}
                        {job.ip_address && (
                          <span className="text-xs text-gray-500">IP: {job.ip_address}</span>
                        )}
                        {job.contact_person && (
                          <span className="text-xs text-blue-600">Contact: {job.contact_person}</span>
                        )}
                        {job.decommission_date && (
                          <span className={`text-xs font-medium ${
                            shouldBlink 
                              ? 'text-amber-700 animate-pulse' 
                              : 'text-amber-600'
                          }`}>
                            ⚠️ Decommission: {new Date(job.decommission_date).toLocaleDateString()}
                            {shouldBlink && <span className="ml-1 text-red-600">- NEEDS ASSIGNMENT!</span>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col">
                        <span>{job.customer_name}</span>
                        {job.job_type === 'deinstall' && job.quotation_products && job.quotation_products.length > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            De-installing {job.quotation_products.length} item(s)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span>{job.vehicle_registration || 'No vehicle'}</span>
                          {job.vehicle_make && job.vehicle_model && (
                            <span className="text-xs text-gray-500">{job.vehicle_make} {job.vehicle_model}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {job.job_type && (
                        <Badge variant="outline" className={`text-xs ${getJobTypeColor(job.job_type)}`}>
                          {job.job_type}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <Badge className={getStatusColor(job.job_status || job.status)}>
                        {job.job_status || job.status || 'NOT STARTED'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex justify-end gap-2">
                        {job.job_type === 'deinstall' && job.quotation_products && job.quotation_products.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDeinstallJob(job)}
                            className={`text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 ${
                              shouldBlink ? 'animate-pulse shadow-lg' : ''
                            }`}
                          >
                            <Eye className="mr-1 w-3 h-3" />
                            View De-installation
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAssignParts(job)}
                          className={`bg-blue-600 hover:bg-blue-700 text-white ${
                            shouldBlink ? 'animate-pulse shadow-lg ring-2 ring-amber-300' : ''
                          }`}
                        >
                          <Plus className="mr-1 w-3 h-3" />
                          {shouldBlink ? 'Assign Parts URGENT' : 'Assign Parts'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBookStock(job)}
                          className={`${hasBootStock(job) ? "bg-green-600 hover:bg-green-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"} ${
                            shouldBlink ? 'animate-pulse shadow-lg ring-2 ring-amber-300' : ''
                          }`}
                          title={hasBootStock(job) ? "Boot stock already assigned" : "Book boot stock and move to admin"}
                        >
                          <Package className="mr-1 w-3 h-3" />
                          {shouldBlink ? 'Book Stock URGENT' : 'Book Stock'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="relative w-full overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Job Number</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Customer</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Job Type</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Parts</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobCardsWithParts.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-green-50">
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium">{job.job_number}</span>
                        {job.ip_address && (
                          <span className="text-xs text-gray-500">IP: {job.ip_address}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span>{job.customer_name}</span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span>{job.vehicle_registration || 'No vehicle'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {job.job_type && (
                        <Badge variant="outline" className={`text-xs ${getJobTypeColor(job.job_type)}`}>
                          {job.job_type}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="space-y-1">
                        {job.parts_required?.slice(0, 2).map((part, index) => (
                          <div key={index} className="flex justify-between text-gray-600 text-xs">
                            <span>• {part.description}</span>
                            <span className="text-green-600 ml-2">Qty: {part.quantity}</span>
                          </div>
                        ))}
                        {job.parts_required?.length > 2 && (
                          <div className="text-gray-500 text-xs">
                            +{job.parts_required.length - 2} more parts
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex justify-end gap-2">
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
                          onClick={() => handleAssignParts(job)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <RefreshCw className="mr-1 w-3 h-3" />
                          Re-Open Job
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="relative w-full overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Job Number</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Customer</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Completion Date</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500">Notes</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedJobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium">{job.job_number}</div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span>{job.customer_name}</span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span>{job.vehicle_registration || 'No vehicle'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(job.completion_date)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      {job.completion_notes ? (
                        <div className="truncate max-w-[200px]">
                          {job.completion_notes}
                        </div>
                      ) : (
                        <span className="text-gray-500">No notes</span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex justify-end items-center gap-2">
                        {job.parts_required && Array.isArray(job.parts_required) && job.parts_required.length > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowQRCode(job)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <QrCode className="mr-1 w-3 h-3" />
                              View QR: 1
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              {job.parts_required.length} parts used
                            </Badge>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const stockOrdersContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Items on Order</h2>
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
            placeholder="Search orders by order number, supplier, status, or item description..."
            value={stockOrdersSearchTerm}
            onChange={(e) => setStockOrdersSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {stockOrdersLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span>Loading orders...</span>
        </div>
      ) : filteredStockOrders.length === 0 ? (
        <div className="py-12 text-center">
          <Receipt className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            {stockOrdersSearchTerm ? 'No orders match your search criteria.' : 'No orders found'}
          </h3>
          <p className="text-gray-500">
            {stockOrdersSearchTerm ? 'Try adjusting your search terms.' : 'Orders will appear here once submitted.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border border-gray-200 w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Order Number
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Supplier
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Status
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Order Date
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Total Amount
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Items Count
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredStockOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">{order.order_number}</div>
                    {order.notes && (
                      <div className="mt-1 text-gray-500 text-xs">{order.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {order.supplier || 'Custom'}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge className={`text-xs ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status || 'pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm text-center">
                    {formatDate(order.order_date)}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <div className="font-medium">{parseFloat(order.total_amount_ex_vat || 0).toFixed(2)}</div>
                    {order.total_amount_usd && (
                      <div className="text-gray-500 text-xs">{parseFloat(order.total_amount_usd).toFixed(2)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge variant="outline" className="text-xs">
                      {order.order_items?.length || 0} items
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <div className="flex flex-col gap-2">
                      {order.invoice_link ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewStockOrder(order)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            <FileText className="mr-1 w-3 h-3" />
                            View PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadStockOrderInvoice(order)}
                            className="text-green-600 hover:text-green-700 text-xs"
                          >
                            <Download className="mr-1 w-3 h-3" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">No PDF</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrderItems(order)}
                        className="text-purple-600 hover:text-purple-700 text-xs"
                      >
                        <Package className="mr-1 w-3 h-3" />
                        View Items
                      </Button>
                      {order.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUploadToStock(order)}
                          className="text-orange-600 hover:text-orange-700 text-xs"
                        >
                          <Package className="mr-1 w-3 h-3" />
                          Upload to Stock
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Stock Take Content
  // Ready to render stock take content

  const stockTakeContent = (
    <div className="space-y-6">
      {/* IP Address Assignment Modal */}
      <AssignIPAddressModal
        isOpen={showIpAddressModal && !!selectedStockItem}
        onClose={() => setShowIpAddressModal(false)}
        item={selectedStockItem || { id: 0 }} // Provide a fallback item to prevent errors
        onAssigned={handleIPAddressesAssigned}
      />
      
      {/* Stock Take Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">Stock Take</h3>
          <p className="text-gray-600 text-sm">Perform physical stock counts and update inventory</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={stockTakeMode ? handleCancelStockTake : handleStartStockTake}
            variant={stockTakeMode ? "outline" : "default"}
            className={stockTakeMode ? "text-red-600 hover:text-red-700" : ""}
          >
            {stockTakeMode ? (
              <>
                <AlertCircle className="mr-2 w-4 h-4" />
                Cancel Stock Take
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 w-4 h-4" />
                Start Stock Take
              </>
            )}
          </Button>
          <Button 
            onClick={() => setShowAddItemModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add New Item
          </Button>
        </div>
      </div>

      {/* Stock Take Tabs */}
      <div className="border-gray-200 border-b">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => {
              console.log('Stock Take sub-tab clicked');
              setStockTakeActiveTab('stock-take');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              stockTakeActiveTab === 'stock-take'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock Take
          </button>
          <button
            onClick={() => {
              console.log('Thresholds sub-tab clicked');
              setStockTakeActiveTab('thresholds');
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              stockTakeActiveTab === 'thresholds'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Thresholds
          </button>
        </nav>
      </div>

      {/* Conditional Content Based on Active Tab */}
      {stockTakeActiveTab === 'stock-take' ? (
        <>
          {/* Stock Take Controls */}
          {stockTakeMode && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Stock Take Mode Active</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePublishStockTake}
                      disabled={!hasChanges || publishing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="mr-2 w-4 h-4" />
                      {publishing ? 'Publishing...' : 'Publish Changes'}
                    </Button>
                  </div>
                </div>
                {hasChanges && (
                  <div className="mt-2 text-blue-700 text-sm">
                    {Object.keys(updatedItems).length} items have been modified
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <Input
                placeholder="Search stock items by serial number..."
                value={stockTakeSearchTerm}
                onChange={(e) => setStockTakeSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedStockType}
                onChange={(e) => setSelectedStockType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {stockTypes.map(type => {
                  console.log('Rendering category option:', type);
                  return (
                    <option key={type.code} value={type.code}>
                      {type.code} - {type.description}
                    </option>
                  );
                })}
              </select>
            </div>
            <Button onClick={fetchStockItems} variant="outline" size="sm">
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Thresholds Tab Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-medium text-gray-700 text-sm">Default Threshold:</label>
                <Input
                  type="number"
                  min="1"
                  value={defaultThreshold}
                  onChange={(e) => setDefaultThreshold(parseInt(e.target.value) || 10)}
                  className="w-20"
                />
              </div>
              <p className="text-gray-600 text-sm">Items at or below this threshold will be highlighted in red</p>
            </div>
            
            <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 text-sm">
                  Set individual thresholds below or use the default threshold of {defaultThreshold}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock Items Table */}
      {console.log('Rendering stock table, filteredStockItems.length:', filteredStockItems.length)}
      {filteredStockItems.length > 0 && console.log('First filtered item:', filteredStockItems[0])}
      {filteredStockItems.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No stock items found</h3>
          <p className="text-gray-500">
            {stockTakeSearchTerm || selectedStockType !== 'all' ? 'No stock items match your search criteria.' : 'No stock items available.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border border-gray-200 w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Serial Number
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Category
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Current Qty
                </th>
                {stockTakeActiveTab === 'thresholds' && (
                  <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                    Threshold
                  </th>
                )}
                {!stockTakeMode && stockTakeActiveTab === 'stock-take' && (
                  <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                    Actions
                  </th>
                )}
                {stockTakeMode && stockTakeActiveTab === 'stock-take' && (
                  <>
                    <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                      New Qty
                    </th>
                    <td className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                      Difference
                    </td>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredStockItems.map((item, index) => {
                if (index === 0) {
                  console.log('First item in render:', item);
                  console.log('Category code:', item.category_code);
                  console.log('Category description:', item.category_description);
                }
                const update = updatedItems[item.id];
                const currentQuantity = update?.new_quantity ?? parseInt(item.quantity || '0');
                const difference = update?.difference ?? 0;
                const isLow = isLowStock(item);
                const isSelected = selectedStockItem?.id === item.id;
                const hasIPAddresses = item.ip_addresses && 
                  (Array.isArray(item.ip_addresses) ? item.ip_addresses.length > 0 : Object.keys(item.ip_addresses).length > 0);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${getLowStockStyle(item)} ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedStockItem(item)}
                  >
                    <td className="px-4 py-3 border border-gray-200 text-sm">
                      <div className="font-medium text-gray-900">{item.serial_number || 'N/A'}</div>
                      {item.description && item.description !== 'No description' && (
                        <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                      )}
                      <div className="flex gap-1 flex-wrap mt-1">
                        {isLow && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            Low Stock
                          </Badge>
                        )}
                        {hasIPAddresses && (
                          <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                            IP Assigned
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {item.category_code && item.category_description ? 
                          `${item.category_code} - ${item.category_description}` : 
                          item.category_code || 'N/A'
                        }
                      </Badge>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                      <span className={`font-medium ${isLow ? 'text-red-600' : ''}`}>
                        {parseInt(item.quantity || '0')}
                      </span>
                    </td>
                    {stockTakeActiveTab === 'thresholds' && (
                      <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                        <Input
                          type="number"
                          min="1"
                          value={getItemThreshold(item.id)}
                          onChange={(e) => handleThresholdChange(item.id, e.target.value)}
                          className="w-20 text-center"
                        />
                      </td>
                    )}
                    {!stockTakeMode && stockTakeActiveTab === 'stock-take' && (
                      <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 hover:text-indigo-700"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row selection
                              setSelectedStockItem(item);
                              setShowIpAddressModal(true);
                            }}
                          >
                            <Network className="mr-1 w-4 h-4" />
                            {hasIPAddresses ? 'Manage IP' : 'Assign IP'}
                          </Button>
                          {hasIPAddresses && (
                            <span className="text-xs text-indigo-600">
                              IP{Array.isArray(item.ip_addresses) && item.ip_addresses.length > 1 ? 's' : ''} assigned
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {stockTakeMode && stockTakeActiveTab === 'stock-take' && (
                      <>
                        <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                          <Input
                            type="number"
                            min="0"
                            value={currentQuantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 text-center"
                            onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking input
                          />
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                          {update && (
                            <span className={`font-medium ${getQuantityDifferenceColor(difference)}`}>
                              {difference > 0 ? '+' : ''}{difference}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {stockTakeMode && hasChanges && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-green-800">Stock Take Summary</h3>
                <p className="text-green-700 text-sm">
                  {Object.keys(updatedItems).length} items modified
                </p>
              </div>
              <div className="text-right">
                <div className="text-green-700 text-sm">
                  Total Changes: {Object.values(updatedItems).reduce((sum, item) => sum + Math.abs(item.difference), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Boot stock content
  const bootStockContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Boot Stock</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{bootStock.length} items</Badge>
          <Button onClick={fetchBootStock} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {bootStockLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span>Loading boot stock...</span>
        </div>
      ) : bootStock.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No boot stock assigned</h3>
          <p className="text-gray-500">Boot stock items will appear here when assigned to your technician account.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border border-gray-200 w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Description
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Code
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Quantity
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Supplier
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Date Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {bootStock.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">{item.description}</div>
                    <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                      Boot Stock
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {item.code}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge variant="outline" className="text-xs">
                      {item.quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {item.supplier}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm text-center">
                    {item.date_added ? new Date(item.date_added).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      label: 'Items on Order',
      icon: Package,
      content: stockOrdersContent
    },
    {
      value: 'stock-take',
      label: 'Stock Take',
      icon: ClipboardList,
      content: stockTakeContent
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
        
        {/* Create Order Button */}
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
      
      {/* Create Order and Repair Job Buttons */}
      <div className="flex justify-end gap-3">
        <CreateRepairJobModal 
          onJobCreated={fetchJobCards} 
          onAssignParts={handleAssignParts}
        />
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
          allIpAddresses={allIpAddresses}
          allStockItems={allStockItems}
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
                      style={{ width: '200px', height: '200px' }}
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
                    <Button 
                      onClick={() => handleDownloadQR(selectedQRJob)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 w-4 h-4" />
                      Download QR
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
        onTabChange={(newTab) => {
          console.log('Tab change requested:', newTab);
          setActiveTab(newTab);
        }}
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
                     This order doesn&apos;t have an invoice PDF attached.
                   </p>
                 </div>
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>

       {/* Order Items Modal */}
       <Dialog open={showOrderItemsModal} onOpenChange={setShowOrderItemsModal}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
           <DialogHeader>
             <DialogTitle className="flex justify-between items-center">
               <span>Order Items: {selectedStockOrder?.order_number}</span>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowOrderItemsModal(false)}
               >
                 Close
               </Button>
             </DialogTitle>
           </DialogHeader>
           <div className="flex-1 min-h-0 overflow-y-auto">
             {selectedStockOrder && (
               <div className="space-y-6">
                 {/* Order Summary */}
                 <div className="bg-gray-50 p-4 rounded-lg">
                   <div className="gap-4 grid grid-cols-2 md:grid-cols-4 text-sm">
                     <div>
                       <span className="font-medium text-gray-700">Supplier:</span>
                       <p className="text-gray-900">{selectedStockOrder.supplier || 'Custom'}</p>
                     </div>
                     <div>
                       <span className="font-medium text-gray-700">Status:</span>
                       <p className="text-gray-900">{selectedStockOrder.status || 'pending'}</p>
                     </div>
                     <div>
                       <span className="font-medium text-gray-700">Order Date:</span>
                       <p className="text-gray-900">{formatDate(selectedStockOrder.order_date)}</p>
                     </div>
                     <div>
                       <span className="font-medium text-gray-700">Total Amount:</span>
                       <p className="text-gray-900">R {parseFloat(selectedStockOrder.total_amount_ex_vat || 0).toFixed(2)}</p>
                     </div>
                   </div>
                   {selectedStockOrder.notes && (
                     <div className="mt-3 pt-3 border-gray-200 border-t">
                       <span className="font-medium text-gray-700">Notes:</span>
                       <p className="text-gray-900 text-sm">{selectedStockOrder.notes}</p>
                     </div>
                   )}
                 </div>

                                   {/* Order Items Table */}
                  {selectedStockOrder.order_items && Array.isArray(selectedStockOrder.order_items) && selectedStockOrder.order_items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="border border-gray-200 w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                              Item Description
                            </th>
                            <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                              Quantity
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {selectedStockOrder.order_items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border border-gray-200 text-sm">
                                <div className="font-medium text-gray-900">{item.description || 'Custom Item'}</div>
                                {item.supplier && (
                                  <div className="mt-1 text-gray-500 text-xs">Supplier: {item.supplier}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                                <Badge variant="outline" className="text-xs">
                                  {item.quantity || 0}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 ) : (
                   <div className="py-8 text-center">
                     <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                     <h3 className="mb-2 font-medium text-gray-900 text-lg">No Order Items</h3>
                     <p className="text-gray-500">This order doesn&apos;t have any items listed.</p>
                   </div>
                 )}
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>

       {/* Upload to Stock Modal */}
       <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
         <DialogContent className="max-w-2xl max-h-[90vh]">
           <DialogHeader>
             <DialogTitle>Upload Order Items to Stock</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div className="flex justify-between items-center">
               <p className="text-sm text-gray-600">Enter serial numbers for {uploadItems.length} items:</p>
               <div className="flex gap-3">
                 <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                   Cancel
                 </Button>
                 <Button onClick={handleConfirmUpload} className="bg-green-600 hover:bg-green-700">
                   Upload All ({uploadItems.filter(item => item.serialNumber.trim()).length})
                 </Button>
               </div>
             </div>
             <div className="text-sm text-gray-600 mb-2">
               {uploadItems.filter(item => item.serialNumber.trim()).length} of {uploadItems.length} items ready
             </div>
             <div className="bg-white rounded border max-h-96 overflow-y-auto">
               <table className="w-full">
                 <thead className="bg-gray-50 sticky top-0">
                   <tr>
                     <th className="text-left p-3 text-sm font-medium text-gray-700">#</th>
                     <th className="text-left p-3 text-sm font-medium text-gray-700">Description</th>
                     <th className="text-left p-3 text-sm font-medium text-gray-700">Category</th>
                     <th className="text-left p-3 text-sm font-medium text-gray-700">Serial Number</th>
                     <th className="text-center p-3 text-sm font-medium text-gray-700">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {uploadItems.map((item, index) => (
                     <tr key={item.id} className="border-t hover:bg-gray-50">
                       <td className="p-3 text-sm text-gray-600">{index + 1}</td>
                       <td className="p-3">
                         <div className="font-medium text-sm text-gray-900">{item.description}</div>
                       </td>
                       <td className="p-3">
                         <Badge variant="outline" className="text-xs">{item.categoryCode}</Badge>
                       </td>
                       <td className="p-3">
                         <Input
                           value={item.serialNumber}
                           onChange={(e) => updateSerialNumber(item.id, e.target.value)}
                           placeholder="Enter serial number"
                           className="w-full"
                         />
                       </td>
                       <td className="p-3 text-center">
                         <Button
                           size="sm"
                           onClick={() => handleUploadSingle(item)}
                           disabled={!item.serialNumber.trim()}
                           className="bg-blue-600 hover:bg-blue-700 text-xs"
                         >
                           Upload
                         </Button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* QR Code Modal */}
       <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Generated QR Code</DialogTitle>
           </DialogHeader>
           <div className="flex flex-col items-center space-y-4">
             {generatedQR && (
               <div className="p-4 bg-white border rounded-lg">
                 <img src={generatedQR} alt="QR Code" className="w-64 h-64" />
               </div>
             )}
             <p className="text-sm text-gray-600 text-center">
               Scan this QR code to access inventory information
             </p>
           </div>
           <div className="flex justify-end mt-6">
             <Button onClick={() => setShowQRModal(false)}>
               Close
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       {/* Add New Item Modal */}
       <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
         <DialogContent className="w-[99vw] max-h-[90vh]">
           <DialogHeader>
             <DialogTitle>Add New Inventory Item</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             {!showNewCategoryFields ? (
               <div>
                 <label className="text-sm font-medium text-gray-700">Category</label>
                 <div className="flex gap-2 mt-1">
                   <select
                     value={newItemData.category_code}
                     onChange={(e) => setNewItemData({...newItemData, category_code: e.target.value})}
                     className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                   >
                     <option value="">Select category...</option>
                     {stockTypes.map(type => (
                       <option key={typeof type === 'string' ? type : type.code} value={typeof type === 'string' ? type : type.code}>
                         {typeof type === 'string' ? type : `${type.code} - ${type.description}`}
                       </option>
                     ))}
                   </select>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => setShowNewCategoryFields(true)}
                   >
                     <Plus className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center">
                   <label className="text-sm font-medium text-gray-700">Create New Category</label>
                   <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     onClick={() => setShowNewCategoryFields(false)}
                   >
                     Back to existing
                   </Button>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-700">Category Code</label>
                   <Input
                     value={newItemData.new_category_code}
                     onChange={(e) => setNewItemData({...newItemData, new_category_code: e.target.value.toUpperCase()})}
                     placeholder="e.g. GPS, CABLE, SENSOR"
                     className="mt-1"
                   />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-700">Category Description</label>
                   <Input
                     value={newItemData.new_category_description}
                     onChange={(e) => setNewItemData({...newItemData, new_category_description: e.target.value})}
                     placeholder="e.g. GPS Tracking Devices"
                     className="mt-1"
                   />
                 </div>
               </>
             )}
             <div>
               <label className="text-sm font-medium text-gray-700">Serial Number</label>
               <Input
                 value={newItemData.serial_number}
                 onChange={(e) => setNewItemData({...newItemData, serial_number: e.target.value})}
                 placeholder="Enter serial number"
                 className="mt-1"
               />
             </div>
             <div>
               <label className="text-sm font-medium text-gray-700">Quantity</label>
               <Input
                 type="number"
                 min="1"
                 value={newItemData.quantity}
                 onChange={(e) => setNewItemData({...newItemData, quantity: parseInt(e.target.value) || 1})}
                 className="mt-1"
               />
             </div>
           </div>
           <div className="flex justify-end gap-3 mt-6">
             <Button variant="outline" onClick={() => {
               setShowAddItemModal(false);
               setShowNewCategoryFields(false);
               setNewItemData({ category_code: '', serial_number: '', quantity: 1, new_category_code: '', new_category_description: '' });
             }}>
               Cancel
             </Button>
             <Button onClick={handleAddNewItem} className="bg-green-600 hover:bg-green-700">
               Add Item
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       {/* De-installation Details Modal */}
       <Dialog open={!!selectedDeinstallJob} onOpenChange={(open) => !open && setSelectedDeinstallJob(null)}>
         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="text-red-600">
               De-installation Details - {selectedDeinstallJob?.quote_id}
             </DialogTitle>
           </DialogHeader>
           {selectedDeinstallJob && (
             <div className="space-y-6">
               {/* Job Information */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <h3 className="text-lg font-semibold">Job Information</h3>
                   <p><strong>Customer:</strong> {selectedDeinstallJob.cost_center}</p>
                   <p><strong>Contact Person:</strong> {selectedDeinstallJob.contact_person || 'Not specified'}</p>
                   <p><strong>Quote ID:</strong> {selectedDeinstallJob.quote_id}</p>
                   <p><strong>Status:</strong> <Badge variant={selectedDeinstallJob.status === 'active' ? 'default' : 'secondary'}>{selectedDeinstallJob.status}</Badge></p>
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-lg font-semibold">De-installation Schedule</h3>
                   {selectedDeinstallJob.decommission_date ? (
                     <>
                       <p><strong>Decommission Date:</strong> {new Date(selectedDeinstallJob.decommission_date).toLocaleDateString()}</p>
                       <Badge variant="destructive" className="animate-pulse">
                         Scheduled for Decommission
                       </Badge>
                     </>
                   ) : (
                     <p className="text-gray-500">No decommission date set</p>
                   )}
                 </div>
               </div>

               {/* Vehicle Information */}
               {selectedDeinstallJob.vehicles && selectedDeinstallJob.vehicles.length > 0 && (
                 <div className="space-y-3">
                   <h3 className="text-lg font-semibold">Vehicles Affected</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {selectedDeinstallJob.vehicles.map((vehicle, index) => (
                       <Card key={index} className="border-red-200">
                         <CardContent className="p-3">
                           <div className="flex items-center space-x-2">
                             <Car className="h-4 w-4 text-red-600" />
                             <div>
                               <p className="font-medium">{vehicle.registration}</p>
                               <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
                               {vehicle.fleet_number && (
                                 <p className="text-sm text-gray-500">Fleet: {vehicle.fleet_number}</p>
                               )}
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     ))}
                   </div>
                 </div>
               )}

               {/* De-installation Items */}
               {selectedDeinstallJob.items && selectedDeinstallJob.items.length > 0 && (
                 <div className="space-y-3">
                   <h3 className="text-lg font-semibold">Equipment to be De-installed</h3>
                   <div className="overflow-x-auto">
                     <table className="w-full border-collapse border border-gray-300">
                       <thead>
                         <tr className="bg-red-50">
                           <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                           <th className="border border-gray-300 px-3 py-2 text-center">Quantity</th>
                           <th className="border border-gray-300 px-3 py-2 text-left">Code</th>
                           <th className="border border-gray-300 px-3 py-2 text-right">Unit Cost</th>
                           <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                         </tr>
                       </thead>
                       <tbody>
                         {selectedDeinstallJob.items.map((item, index) => (
                           <tr key={index}>
                             <td className="border border-gray-300 px-3 py-2">{item.description}</td>
                             <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                             <td className="border border-gray-300 px-3 py-2">{item.code}</td>
                             <td className="border border-gray-300 px-3 py-2 text-right">R{item.cost_per_unit?.toFixed(2) || '0.00'}</td>
                             <td className="border border-gray-300 px-3 py-2 text-right">R{item.total_cost?.toFixed(2) || '0.00'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* Action Buttons */}
               <div className="flex justify-end space-x-3">
                 <Button
                   variant="outline"
                   onClick={() => setSelectedDeinstallJob(null)}
                 >
                   Close
                 </Button>
                 <Button
                   className="bg-red-600 hover:bg-red-700 text-white"
                   onClick={() => {
                     // Handle assign technician for decommission
                     console.log('Assign technician for decommission:', selectedDeinstallJob.quote_id);
                   }}
                 >
                   Assign Technician
                 </Button>
               </div>
             </div>
           )}
         </DialogContent>
       </Dialog>
    </div>
  );
}