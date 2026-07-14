'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  X,
  Loader2,
  Wrench,
  User,
  Package,
  ClipboardCheck,
  UserCheck,
  CheckCircle,
  Search,
  Plus,
  Trash2,
  Car,
  FileText,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface ProductItem {
  id: string;
  product: string;
  description?: string;
  type: string;
  category: string;
  price: number;
  rental: number | null;
  installation: number | null;
  subscription: number | null;
}

interface SelectedProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  quantity: number;
  purchaseType: string;
  cashPrice: number;
  rentalPrice: number;
  installationPrice: number;
  subscriptionPrice: number;
}

const JOB_SUB_TYPES: Record<string, { value: string; label: string }[]> = {
  install: [
    { value: 'new_install', label: 'New Install' },
    { value: 'reinstall', label: 'Reinstall' },
    { value: 'additional_install', label: 'Additional Install' },
  ],
  deinstall: [
    { value: 'decommission', label: 'Decommission' },
    { value: 'de-install', label: 'De-install' },
  ],
};

const PRODUCT_TYPES = ['FMS', 'BACKUP', 'MODULE', 'INPUT', 'PFK CAMERA', 'DASHCAM', 'PTT', 'DVR CAMERA'];
const PRODUCT_CATEGORIES = ['HARDWARE', 'MODULES', 'INPUTS', 'CAMERA EQUIPMENT', 'AI MOVEMENT DETECTION', 'PTT RADIOS'];

export default function NewJobModal({ isOpen, onClose, onJobCreated }: NewJobModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  // Step 0: Job Details (matches FC form exactly)
  const [jobType, setJobType] = useState('install');
  const [jobSubType, setJobSubType] = useState('new_install');
  const [jobDescription, setJobDescription] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [purchaseType, setPurchaseType] = useState('purchase');
  const [decommissionDate, setDecommissionDate] = useState('');
  const [moveToRole, setMoveToRole] = useState('');

  // Step 1: Customer Details (matches FC form exactly)
  const [accountNumber, setAccountNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [lookingUpAccount, setLookingUpAccount] = useState(false);

  // Step 2: Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 4: Assign Technician
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  // Created job data
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [createdJobNumber, setCreatedJobNumber] = useState<string | null>(null);

  const formatLocalDateInput = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setJobType('install');
      setJobSubType('new_install');
      setJobDescription('');
      setOrderNumber('');
      setPurchaseType('purchase');
      setDecommissionDate('');
      setMoveToRole('');
      setAccountNumber('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setContactPerson('');
      setCustomerAddress('');
      setVehicleRegistration('');
      setVehicleMake('');
      setVehicleModel('');
      setVehicleYear('');
      setSelectedProducts([]);
      setProductSearch('');
      setSelectedType('all');
      setSelectedCategory('all');
      setSelectedTechnicianIds([]);
      setSelectedTechnician('');
      setAssignmentDate(formatLocalDateInput());
      setAssignmentTime('');
      setAssignmentNotes('');
      setCreatedJobId(null);
      setCreatedJobNumber(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Fetch technicians
  useEffect(() => {
    if (!isOpen) return;
    setLoadingTechnicians(true);
    fetch('/api/technicians')
      .then((r) => (r.ok ? r.json() : { technicians: [] }))
      .then((data) => setTechnicians(data.technicians || []))
      .catch(() => toast.error('Failed to load technicians'))
      .finally(() => setLoadingTechnicians(false));
  }, [isOpen]);

  // Update sub-type when job type changes
  useEffect(() => {
    const subTypes = JOB_SUB_TYPES[jobType] || [];
    if (subTypes.length > 0 && !subTypes.find((s) => s.value === jobSubType)) {
      setJobSubType(subTypes[0].value);
    }
  }, [jobType, jobSubType]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (productSearch) params.append('search', productSearch);
      const res = await fetch(`/api/product-items?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedType, selectedCategory, productSearch]);

  useEffect(() => {
    if (currentStep === 2) fetchProducts();
  }, [currentStep, fetchProducts]);

  // Debounced product search
  const handleProductSearch = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setProductSearch(value);
    }, 300);
  };

  // Cost center lookup
  const lookupAccount = async () => {
    const code = accountNumber.trim();
    if (!code) {
      toast.error('Enter an account number first');
      return;
    }
    setLookingUpAccount(true);
    try {
      const res = await fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();
      const costCenters = Array.isArray(data?.costCenters) ? data.costCenters : [];
      const match = costCenters.find(
        (cc: Record<string, unknown>) => String(cc?.cost_code || '').trim().toUpperCase() === code.toUpperCase()
      );
      if (match) {
        setCustomerName(prev => prev || match.company || '');
        setCustomerEmail(prev => prev || '');
        setCustomerPhone(prev => prev || '');
        setContactPerson(prev => prev || '');
        setCustomerAddress(prev => prev || '');
        if (match.company && !customerName) setCustomerName(match.company);
        toast.success('Cost center found');
      } else {
        toast.warning('No cost center found for this account number');
      }
    } catch {
      toast.error('Failed to look up cost center');
    } finally {
      setLookingUpAccount(false);
    }
  };

  // Product selection (matches FC's addProduct)
  const addProduct = (product: ProductItem) => {
    const existing = selectedProducts.find((p) => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map((p) => (p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p))
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          id: product.id,
          name: product.product,
          description: product.description || '',
          type: product.type,
          category: product.category,
          quantity: 1,
          purchaseType: purchaseType,
          cashPrice: product.price || 0,
          rentalPrice: product.rental || 0,
          installationPrice: product.installation || 0,
          subscriptionPrice: product.subscription || 0,
        },
      ]);
    }
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter((p) => p.id !== id));
  };

  const updateProductQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev => prev.map((p) => (p.id === id ? { ...p, quantity } : p)));
  };

  // Step validation (matches FC)
  const canProceedStep0 = () => jobDescription.trim().length > 0;
  const canProceedStep1 = () => customerName.trim().length > 0;
  const canProceedStep2 = () => selectedProducts.length > 0;

  // Navigation
  const handleNext = () => {
    if (currentStep === 0 && !canProceedStep0()) {
      toast.error('Job description is required');
      return;
    }
    if (currentStep === 1 && !canProceedStep1()) {
      toast.error('Customer name is required');
      return;
    }
    if (currentStep === 2 && !canProceedStep2()) {
      toast.error('Select at least one product');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Create job + quote
  const handleCreateJob = async () => {
    setIsSubmitting(true);
    try {
      const quotationProducts = selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        category: p.category,
        quantity: p.quantity,
        purchase_type: p.purchaseType,
        cash_price: p.cashPrice,
        cash_discount: 0,
        rental_price: p.rentalPrice,
        rental_discount: 0,
        installation_price: p.installationPrice,
        installation_discount: 0,
        de_installation_price: 0,
        de_installation_discount: 0,
        subscription_price: p.subscriptionPrice,
        subscription_discount: 0,
        total_price: 0,
        recurring_multiplier: 1,
      }));

      const jobPayload = {
        job_type: jobType,
        job_sub_type: jobSubType,
        job_description: jobDescription,
        priority: 'medium',
        status: 'pending',
        job_status: 'Pending',
        role: 'admin',
        move_to: 'admin',
        order_number: orderNumber || null,
        decommission_date: jobSubType === 'decommission' ? decommissionDate || null : null,
        move_to_role: jobSubType === 'decommission' ? moveToRole || null : null,

        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        contact_person: contactPerson,
        customer_address: customerAddress,

        vehicle_registration: vehicleRegistration,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,

        new_account_number: accountNumber || null,
        cost_center_code: accountNumber || null,

        quotation_products: quotationProducts,
        quotation_job_type: jobType,
        purchase_type: purchaseType,

        created_by: '00000000-0000-0000-0000-000000000000',
        updated_by: '00000000-0000-0000-0000-000000000000',

        before_photos: [],
        after_photos: [],
      };

      // Create job card
      const jobRes = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to create job (${jobRes.status})`);
      }

      const jobResult = await jobRes.json();
      const jobId = jobResult?.data?.id;
      const jobNumber = jobResult?.data?.job_number;

      if (!jobId) throw new Error('Job created but no ID returned');

      // Create client quote
      const quotePayload = {
        jobType,
        jobSubType,
        jobDescription,
        customerName,
        customerEmail,
        customerPhone,
        contactPerson,
        customerAddress,
        vehicle_registration: vehicleRegistration,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear || null,
        new_account_number: accountNumber || null,
        accountNumber: accountNumber || null,
        orderNumber: orderNumber || null,
        decommissionDate: jobSubType === 'decommission' ? decommissionDate || null : null,
        moveToRole: jobSubType === 'decommission' ? moveToRole || null : null,
        purchaseType,
        quoteType: 'internal',
        status: 'pending',
        quotationProducts,
        quotationSubtotal: 0,
        quotationVatAmount: 0,
        quotationTotalAmount: 0,
      };

      const quoteRes = await fetch('/api/client-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload),
      });

      if (!quoteRes.ok) {
        console.warn('Quote creation failed, but job was created:', quoteRes.status);
      }

      setCreatedJobId(jobId);
      setCreatedJobNumber(jobNumber || null);
      setCurrentStep(4);
      toast.success(`Job ${jobNumber || ''} created successfully`);
    } catch (error) {
      toast.error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign technician
  const handleAssignTechnician = async () => {
    if (selectedTechnicianIds.length === 0) {
      toast.error('Select at least one technician');
      return;
    }
    if (!assignmentDate) {
      toast.error('Select an assignment date');
      return;
    }
    if (!createdJobId) return;

    setIsSubmitting(true);
    try {
      const selectedTechs = technicians.filter((t) => selectedTechnicianIds.includes(t.id));
      const technicianNames = selectedTechs.map((t) => t.name).join(', ');

      const res = await fetch('/api/admin/jobs/assign-technician', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: createdJobId,
          technicianName: technicianNames,
          jobDate: assignmentDate,
          startTime: assignmentTime || null,
          endTime: null,
          assignmentNotes: assignmentNotes || null,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data?.needsOverride) {
        const proceed = window.confirm(`Scheduling conflict detected for ${technicianNames}. Override and assign anyway?`);
        if (proceed) {
          const overrideRes = await fetch('/api/admin/jobs/assign-technician', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: createdJobId,
              technicianName: technicianNames,
              jobDate: assignmentDate,
              startTime: assignmentTime || null,
              endTime: null,
              override: true,
            }),
          });
          if (!overrideRes.ok) toast.error('Assignment failed after override');
          else toast.success('Technician assigned with override');
        } else {
          toast.warning('Assignment skipped due to conflict');
        }
      } else if (!res.ok) {
        toast.error(data.error || 'Failed to assign technician');
      } else {
        toast.success(`Technician${selectedTechs.length > 1 ? 's' : ''} assigned`);
      }

      onJobCreated();
      onClose();
    } catch {
      toast.error('Failed to assign technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTechnicianSelection = (techId: string) => {
    if (!techId || selectedTechnicianIds.includes(techId)) return;
    setSelectedTechnicianIds(prev => [...prev, techId]);
    setSelectedTechnician('');
  };

  const removeTechnicianSelection = (techId: string) => {
    setSelectedTechnicianIds(prev => prev.filter((id) => id !== techId));
  };

  if (!isOpen) return null;

  const steps = [
    { label: 'Job Details', icon: FileText },
    { label: 'Customer', icon: User },
    { label: 'Products', icon: Package },
    { label: 'Review', icon: ClipboardCheck },
    { label: 'Assign Tech', icon: UserCheck },
  ];

  const getSubTypeLabel = () => {
    return (JOB_SUB_TYPES[jobType] || []).find(s => s.value === jobSubType)?.label || jobSubType;
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-xl">Create New Job</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex justify-center items-center space-x-2 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;
              return (
                <div key={step.label} className="flex items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                      isActive ? 'bg-blue-600 text-white' :
                      isCompleted ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 0: Job Details (matches FC quote form) */}
          {currentStep === 0 && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Job Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Type *</Label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger><SelectValue placeholder="Select job type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="install">Installation</SelectItem>
                        <SelectItem value="deinstall">De-installation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {jobType && (
                    <div className="space-y-2">
                      <Label>Sub Category *</Label>
                      <Select value={jobSubType} onValueChange={setJobSubType}>
                        <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
                        <SelectContent>
                          {(JOB_SUB_TYPES[jobType] || []).map((st) => (
                            <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Order number (optional)"
                  />
                </div>

                {jobType !== 'deinstall' && (
                  <div className="space-y-2">
                    <Label>Cash Type *</Label>
                    <Select value={purchaseType} onValueChange={setPurchaseType}>
                      <SelectTrigger><SelectValue placeholder="Select cash type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Cash</SelectItem>
                        <SelectItem value="rental">Rental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description *</Label>
                  <Textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the job requirements..."
                    rows={3}
                  />
                </div>

                {jobType === 'deinstall' && jobSubType === 'decommission' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="decommissionDate">Decommission Date *</Label>
                      <Input
                        id="decommissionDate"
                        type="date"
                        value={decommissionDate}
                        onChange={(e) => setDecommissionDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-sm text-amber-600">
                        Note: Both Helpdesk and Ria will be automatically notified when equipment is decommissioned.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Send Job Card To Role *</Label>
                      <Select value={moveToRole} onValueChange={setMoveToRole}>
                        <SelectTrigger><SelectValue placeholder="Select destination role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inv">Stock Control</SelectItem>
                          <SelectItem value="admin">Helpdesk</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-blue-700">
                        The approved job card will automatically be routed to this role.
                      </p>
                    </div>
                  </>
                )}

                <div className="bg-blue-50 p-3 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 bg-blue-500 mt-2 rounded-full w-2 h-2"></div>
                    <div className="text-blue-800 text-sm">
                      <p className="font-medium">Vehicle Information</p>
                      <p>You can add vehicle details in the next step (Customer Details). This information will be stored directly in the job card.</p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleNext} className="w-full bg-blue-600 hover:bg-blue-700">
                  Next: Customer Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Customer Details (matches FC quote form exactly) */}
          {currentStep === 1 && (
            <div className="space-y-6 mx-auto max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accountNumber"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter account number to lookup customer"
                      />
                      <Button
                        variant="outline"
                        onClick={lookupAccount}
                        disabled={lookingUpAccount || !accountNumber.trim()}
                      >
                        {lookingUpAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Customer Phone</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Customer Address</Label>
                    <Textarea
                      id="customerAddress"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {jobType !== 'item_billing' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_registration">Vehicle Registration</Label>
                        <Input
                          id="vehicle_registration"
                          value={vehicleRegistration}
                          onChange={(e) => setVehicleRegistration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_make">Vehicle Make</Label>
                        <Input
                          id="vehicle_make"
                          value={vehicleMake}
                          onChange={(e) => setVehicleMake(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_model">Vehicle Model</Label>
                        <Input
                          id="vehicle_model"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_year">Vehicle Year</Label>
                        <Input
                          id="vehicle_year"
                          type="number"
                          value={vehicleYear}
                          onChange={(e) => setVehicleYear(e.target.value)}
                          placeholder="e.g. 2024"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">Back</Button>
                <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Next: Products
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Product Selection (matches FC quote form) */}
          {currentStep === 2 && (
            <Card className="mx-auto max-w-3xl">
              <CardHeader>
                <CardTitle>Product Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Selected items summary */}
                {selectedProducts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-blue-50 rounded-md border border-blue-100">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Selected:</span>
                    {selectedProducts.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {p.name}
                        <button type="button" onClick={() => removeProduct(p.id)} className="hover:text-blue-900 ml-0.5">&times;</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Filters row */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px] font-medium text-gray-500">Search</Label>
                    <div className="relative">
                      <Search className="top-1/2 left-2.5 absolute w-3.5 h-3.5 text-gray-400 -translate-y-1/2 transform" />
                      <Input
                        placeholder="Search products..."
                        onChange={(e) => handleProductSearch(e.target.value)}
                        className="h-8 text-xs pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-36 space-y-1">
                    <Label className="text-[11px] font-medium text-gray-500">Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {PRODUCT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36 space-y-1">
                    <Label className="text-[11px] font-medium text-gray-500">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product List */}
                {loadingProducts ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="ml-2 text-xs text-gray-500">Loading products...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-4 text-gray-500 text-xs text-center">No products found</div>
                ) : (
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
                    {products.map((product) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer group relative">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-sm">{product.product}</h4>
                              <p className="text-gray-600 text-xs">{product.description}</p>
                              <div className="flex gap-2 mt-2">
                                <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">{product.type}</span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs">{product.category}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addProduct(product)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleBack} variant="outline" className="flex-1">Back</Button>
                  <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Next: Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ClipboardCheck className="w-5 h-5" />
                  <span>Review & Create</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Job Details */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
                    <h4 className="font-medium text-sm">Job Details</h4>
                    <button onClick={() => setCurrentStep(0)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Type:</span> <span className="font-medium ml-1">{jobType === 'install' ? 'Installation' : 'De-installation'}</span></div>
                    <div><span className="text-gray-500">Sub-Type:</span> <span className="font-medium ml-1">{getSubTypeLabel()}</span></div>
                    {jobType !== 'deinstall' && (
                      <div><span className="text-gray-500">Cash Type:</span> <span className="font-medium ml-1">{purchaseType === 'purchase' ? 'Cash' : 'Rental'}</span></div>
                    )}
                    <div className="col-span-2"><span className="text-gray-500">Description:</span> <span className="font-medium ml-1">{jobDescription}</span></div>
                    {orderNumber && <div><span className="text-gray-500">Order #:</span> <span className="font-medium ml-1">{orderNumber}</span></div>}
                    {jobSubType === 'decommission' && decommissionDate && (
                      <div><span className="text-gray-500">Decommission Date:</span> <span className="font-medium ml-1">{decommissionDate}</span></div>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
                    <h4 className="font-medium text-sm">Customer & Vehicle</h4>
                    <button onClick={() => setCurrentStep(1)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Customer:</span> <span className="font-medium ml-1">{customerName}</span></div>
                    {contactPerson && <div><span className="text-gray-500">Contact:</span> <span className="font-medium ml-1">{contactPerson}</span></div>}
                    {customerEmail && <div><span className="text-gray-500">Email:</span> <span className="ml-1">{customerEmail}</span></div>}
                    {customerPhone && <div><span className="text-gray-500">Phone:</span> <span className="ml-1">{customerPhone}</span></div>}
                    {customerAddress && <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="ml-1">{customerAddress}</span></div>}
                    {vehicleRegistration && <div><span className="text-gray-500">Vehicle Reg:</span> <span className="font-medium ml-1">{vehicleRegistration}</span></div>}
                    {vehicleMake && <div><span className="text-gray-500">Make:</span> <span className="ml-1">{vehicleMake}</span></div>}
                    {vehicleModel && <div><span className="text-gray-500">Model:</span> <span className="ml-1">{vehicleModel}</span></div>}
                    {vehicleYear && <div><span className="text-gray-500">Year:</span> <span className="ml-1">{vehicleYear}</span></div>}
                    {accountNumber && <div><span className="text-gray-500">Account:</span> <span className="ml-1">{accountNumber}</span></div>}
                  </div>
                </div>

                {/* Products */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
                    <h4 className="font-medium text-sm">Products ({selectedProducts.length})</h4>
                    <button onClick={() => setCurrentStep(2)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </div>
                  <div className="divide-y max-h-48 overflow-y-auto">
                    {selectedProducts.map((p) => (
                      <div key={p.id} className="px-4 py-2 flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-gray-500 ml-2 text-xs">{p.type}</span>
                        </div>
                        <span className="text-gray-600">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleBack} variant="outline" className="flex-1">Back</Button>
                  <Button
                    onClick={handleCreateJob}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Assign Technician */}
          {currentStep === 4 && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>Assign Technician</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {createdJobNumber && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <span className="text-green-800 font-medium">Job {createdJobNumber} created.</span>
                    <span className="text-green-700 ml-1">Assign a technician below or close to skip.</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Select Technician(s)</Label>
                  {loadingTechnicians ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-gray-500 text-sm">Loading technicians...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Select value={selectedTechnician} onValueChange={addTechnicianSelection}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a technician" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians
                            .filter((t) => !selectedTechnicianIds.includes(t.id))
                            .map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                {tech.name} ({tech.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {selectedTechnicianIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTechnicianIds.map((techId) => {
                            const tech = technicians.find((t) => t.id === techId);
                            if (!tech) return null;
                            return (
                              <div key={techId} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded text-sm">
                                <span>{tech.name}</span>
                                <button
                                  onClick={() => removeTechnicianSelection(techId)}
                                  className="ml-2 font-bold text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assignment Date *</Label>
                    <Input
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignment Time</Label>
                    <Input
                      type="time"
                      value={assignmentTime}
                      onChange={(e) => setAssignmentTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Assignment notes..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
                  <Button
                    onClick={handleAssignTechnician}
                    disabled={isSubmitting || selectedTechnicianIds.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Assign Technician
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
