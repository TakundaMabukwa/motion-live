'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function NewAccountDialog({ open, onOpenChange, onAccountCreated }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Company Information
    divisions: '',
    account_number: '',
    company: '',
    legal_name: '',
    trading_name: '',
    holding_company: '',
    category: '',
    accounts_status: 'active',
    
    // Billing & Financial
    annual_billing_run_date: '',
    payment_terms: '',
    vat_number: '',
    vat_exempt_number: '',
    registration_number: '',
    
    // Sales & Management
    acc_contact: '',
    sales_rep: '',
    creator: '',
    modified_by: '',
    date_added: new Date().toISOString().split('T')[0],
    date_modified: new Date().toISOString().split('T')[0],
    
    // Contact Information
    switchboard: '',
    cell_no: '',
    email: '',
    send_accounts_to_contact: '',
    send_accounts_to_email_for_statements_and_multibilling: '',
    
    // Physical Address
    physical_address_1: '',
    physical_address_2: '',
    physical_address_3: '',
    physical_area: '',
    physical_province: '',
    physical_code: '',
    physical_country: '',
    
    // Postal Address
    postal_address_1: '',
    postal_address_2: '',
    postal_area: '',
    postal_province: '',
    postal_code: '',
    postal_country: '',
    
    // Branch Information
    branch_person: '',
    branch_person_number: '',
    branch_person_email: '',
    
    // Product Information
    count_of_products: '',
  });

  const steps = [
    {
      id: 0,
      title: "Company Information",
      subtitle: "Basic company details and identification",
      icon: Building2,
    },
    {
      id: 1,
      title: "Contact Information",
      subtitle: "Primary contact details and communication preferences",
      icon: User,
    },
    {
      id: 2,
      title: "Addresses",
      subtitle: "Physical and postal address information",
      icon: MapPin,
    },
    {
      id: 3,
      title: "Financial & Billing",
      subtitle: "Billing terms, VAT, and financial details",
      icon: FileText,
    },
    {
      id: 4,
      title: "Review & Submit",
      subtitle: "Review all information before creating account",
      icon: CheckCircle,
    },
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-generate account number when company name changes
      if (field === 'company' && value.length >= 4) {
        const firstFourChars = value.substring(0, 4).toUpperCase();
        updated.account_number = `${firstFourChars}-0001`;
      }
      
      return updated;
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Company Information
        return formData.company && formData.trading_name;
      case 1: // Contact Information
        return formData.email && (formData.switchboard || formData.cell_no);
      case 2: // Addresses
        return formData.physical_address_1 && formData.physical_area && formData.physical_province;
      case 3: // Financial & Billing
        return true; // All fields are optional
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (!canProceed()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please complete all required fields to proceed",
      });
      return;
    }
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create customer account');
      }

      const result = await response.json();
      
      toast({
        variant: "success",
        title: "Customer Account Created Successfully!",
        description: `Account ${result.data.account_number} has been created for ${result.data.company}`,
      });

      if (onAccountCreated) {
        onAccountCreated(result.data);
      }
      
      // Reset form and close dialog
      setFormData({
        divisions: '',
        account_number: '',
        company: '',
        legal_name: '',
        trading_name: '',
        holding_company: '',
        category: '',
        accounts_status: 'active',
        annual_billing_run_date: '',
        payment_terms: '',
        vat_number: '',
        vat_exempt_number: '',
        registration_number: '',
        acc_contact: '',
        sales_rep: '',
        creator: '',
        modified_by: '',
        date_added: new Date().toISOString().split('T')[0],
        date_modified: new Date().toISOString().split('T')[0],
        switchboard: '',
        cell_no: '',
        email: '',
        send_accounts_to_contact: '',
        send_accounts_to_email_for_statements_and_multibilling: '',
        physical_address_1: '',
        physical_address_2: '',
        physical_address_3: '',
        physical_area: '',
        physical_province: '',
        physical_code: '',
        physical_country: '',
        postal_address_1: '',
        postal_address_2: '',
        postal_area: '',
        postal_province: '',
        postal_code: '',
        postal_country: '',
        branch_person: '',
        branch_person_number: '',
        branch_person_email: '',
        count_of_products: '',
      });
      setCurrentStep(0);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating customer account:', error);
      toast({
        variant: "destructive",
        title: "Account Creation Failed",
        description: error.message || 'Failed to create customer account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCompanyInformation = () => (
    <div className="space-y-4">
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account_number">Account Number *</Label>
          <Input
            id="account_number"
            placeholder="Auto-generated from company name"
            value={formData.account_number}
            onChange={(e) => updateFormData('account_number', e.target.value)}
            readOnly
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company Name *</Label>
          <Input
            id="company"
            placeholder="Enter company name"
            value={formData.company}
            onChange={(e) => updateFormData('company', e.target.value)}
          />
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="trading_name">Trading Name *</Label>
          <Input
            id="trading_name"
            placeholder="Enter trading name"
            value={formData.trading_name}
            onChange={(e) => updateFormData('trading_name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legal_name">Legal Name</Label>
          <Input
            id="legal_name"
            placeholder="Enter legal name"
            value={formData.legal_name}
            onChange={(e) => updateFormData('legal_name', e.target.value)}
          />
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="holding_company">Holding Company</Label>
          <Input
            id="holding_company"
            placeholder="Enter holding company"
            value={formData.holding_company}
            onChange={(e) => updateFormData('holding_company', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="divisions">Divisions</Label>
          <Input
            id="divisions"
            placeholder="Enter divisions"
            value={formData.divisions}
            onChange={(e) => updateFormData('divisions', e.target.value)}
          />
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="sme">SME</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accounts_status">Account Status</Label>
          <Select value={formData.accounts_status} onValueChange={(value) => updateFormData('accounts_status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderContactInformation = () => (
    <div className="space-y-4">
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="acc_contact">Account Contact</Label>
          <Input
            id="acc_contact"
            placeholder="Enter account contact person"
            value={formData.acc_contact}
            onChange={(e) => updateFormData('acc_contact', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sales_rep">Sales Representative</Label>
          <Input
            id="sales_rep"
            placeholder="Enter sales representative"
            value={formData.sales_rep}
            onChange={(e) => updateFormData('sales_rep', e.target.value)}
          />
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="switchboard">Switchboard *</Label>
          <Input
            id="switchboard"
            placeholder="Enter switchboard number"
            value={formData.switchboard}
            onChange={(e) => updateFormData('switchboard', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cell_no">Cell Number</Label>
          <Input
            id="cell_no"
            placeholder="Enter cell number"
            value={formData.cell_no}
            onChange={(e) => updateFormData('cell_no', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
        />
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="send_accounts_to_contact">Send Accounts To Contact</Label>
          <Input
            id="send_accounts_to_contact"
            placeholder="Enter contact for accounts"
            value={formData.send_accounts_to_contact}
            onChange={(e) => updateFormData('send_accounts_to_contact', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="send_accounts_to_email_for_statements_and_multibilling">Accounts Email</Label>
          <Input
            id="send_accounts_to_email_for_statements_and_multibilling"
            type="email"
            placeholder="Enter accounts email"
            value={formData.send_accounts_to_email_for_statements_and_multibilling}
            onChange={(e) => updateFormData('send_accounts_to_email_for_statements_and_multibilling', e.target.value)}
          />
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branch_person">Branch Person</Label>
          <Input
            id="branch_person"
            placeholder="Enter branch person"
            value={formData.branch_person}
            onChange={(e) => updateFormData('branch_person', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch_person_number">Branch Person Number</Label>
          <Input
            id="branch_person_number"
            placeholder="Enter branch person number"
            value={formData.branch_person_number}
            onChange={(e) => updateFormData('branch_person_number', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch_person_email">Branch Person Email</Label>
        <Input
          id="branch_person_email"
          type="email"
          placeholder="Enter branch person email"
          value={formData.branch_person_email}
          onChange={(e) => updateFormData('branch_person_email', e.target.value)}
        />
      </div>
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-6">
      {/* Physical Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Physical Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="physical_address_1">Address Line 1 *</Label>
              <Input
                id="physical_address_1"
                placeholder="Enter address line 1"
                value={formData.physical_address_1}
                onChange={(e) => updateFormData('physical_address_1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_address_2">Address Line 2</Label>
              <Input
                id="physical_address_2"
                placeholder="Enter address line 2"
                value={formData.physical_address_2}
                onChange={(e) => updateFormData('physical_address_2', e.target.value)}
              />
            </div>
          </div>

          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="physical_address_3">Address Line 3</Label>
              <Input
                id="physical_address_3"
                placeholder="Enter address line 3"
                value={formData.physical_address_3}
                onChange={(e) => updateFormData('physical_address_3', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_area">Area *</Label>
              <Input
                id="physical_area"
                placeholder="Enter area"
                value={formData.physical_area}
                onChange={(e) => updateFormData('physical_area', e.target.value)}
              />
            </div>
          </div>

          <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="physical_province">Province *</Label>
              <Input
                id="physical_province"
                placeholder="Enter province"
                value={formData.physical_province}
                onChange={(e) => updateFormData('physical_province', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_code">Postal Code</Label>
              <Input
                id="physical_code"
                placeholder="Enter postal code"
                value={formData.physical_code}
                onChange={(e) => updateFormData('physical_code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_country">Country</Label>
              <Input
                id="physical_country"
                placeholder="Enter country"
                value={formData.physical_country}
                onChange={(e) => updateFormData('physical_country', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Postal Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Postal Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postal_address_1">Address Line 1</Label>
              <Input
                id="postal_address_1"
                placeholder="Enter postal address line 1"
                value={formData.postal_address_1}
                onChange={(e) => updateFormData('postal_address_1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_address_2">Address Line 2</Label>
              <Input
                id="postal_address_2"
                placeholder="Enter postal address line 2"
                value={formData.postal_address_2}
                onChange={(e) => updateFormData('postal_address_2', e.target.value)}
              />
            </div>
          </div>

          <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postal_area">Area</Label>
              <Input
                id="postal_area"
                placeholder="Enter postal area"
                value={formData.postal_area}
                onChange={(e) => updateFormData('postal_area', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_province">Province</Label>
              <Input
                id="postal_province"
                placeholder="Enter postal province"
                value={formData.postal_province}
                onChange={(e) => updateFormData('postal_province', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                placeholder="Enter postal code"
                value={formData.postal_code}
                onChange={(e) => updateFormData('postal_code', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_country">Country</Label>
            <Input
              id="postal_country"
              placeholder="Enter postal country"
              value={formData.postal_country}
              onChange={(e) => updateFormData('postal_country', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFinancialBilling = () => (
    <div className="space-y-4">
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="annual_billing_run_date">Annual Billing Run Date</Label>
          <Input
            id="annual_billing_run_date"
            type="date"
            value={formData.annual_billing_run_date}
            onChange={(e) => updateFormData('annual_billing_run_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_terms">Payment Terms</Label>
          <Select value={formData.payment_terms} onValueChange={(value) => updateFormData('payment_terms', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">30 Days</SelectItem>
              <SelectItem value="60_days">60 Days</SelectItem>
              <SelectItem value="90_days">90 Days</SelectItem>
              <SelectItem value="immediate">Immediate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vat_number">VAT Number</Label>
          <Input
            id="vat_number"
            placeholder="Enter VAT number"
            value={formData.vat_number}
            onChange={(e) => updateFormData('vat_number', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat_exempt_number">VAT Exempt Number</Label>
          <Input
            id="vat_exempt_number"
            placeholder="Enter VAT exempt number"
            value={formData.vat_exempt_number}
            onChange={(e) => updateFormData('vat_exempt_number', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_number">Registration Number</Label>
        <Input
          id="registration_number"
          placeholder="Enter registration number"
          value={formData.registration_number}
          onChange={(e) => updateFormData('registration_number', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="count_of_products">Count of Products</Label>
        <Input
          id="count_of_products"
          type="number"
          placeholder="Enter product count"
          value={formData.count_of_products}
          onChange={(e) => updateFormData('count_of_products', e.target.value)}
        />
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="mb-2 font-semibold text-blue-800">Review Your Information</h3>
        <p className="text-blue-700 text-sm">
          Please review all the information below before creating the customer account.
        </p>
      </div>

      <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Account Number:</strong> {formData.account_number || 'Not provided'}</div>
            <div><strong>Company:</strong> {formData.company || 'Not provided'}</div>
            <div><strong>Trading Name:</strong> {formData.trading_name || 'Not provided'}</div>
            <div><strong>Category:</strong> {formData.category || 'Not provided'}</div>
            <div><strong>Status:</strong> {formData.accounts_status}</div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Email:</strong> {formData.email || 'Not provided'}</div>
            <div><strong>Switchboard:</strong> {formData.switchboard || 'Not provided'}</div>
            <div><strong>Cell:</strong> {formData.cell_no || 'Not provided'}</div>
            <div><strong>Contact:</strong> {formData.acc_contact || 'Not provided'}</div>
          </CardContent>
        </Card>

        {/* Physical Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Physical Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Address:</strong> {formData.physical_address_1 || 'Not provided'}</div>
            <div><strong>Area:</strong> {formData.physical_area || 'Not provided'}</div>
            <div><strong>Province:</strong> {formData.physical_province || 'Not provided'}</div>
            <div><strong>Country:</strong> {formData.physical_country || 'Not provided'}</div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>VAT Number:</strong> {formData.vat_number || 'Not provided'}</div>
            <div><strong>Payment Terms:</strong> {formData.payment_terms || 'Not provided'}</div>
            <div><strong>Registration:</strong> {formData.registration_number || 'Not provided'}</div>
            <div><strong>Products:</strong> {formData.count_of_products || 'Not provided'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderCompanyInformation();
      case 1:
        return renderContactInformation();
      case 2:
        return renderAddresses();
      case 3:
        return renderFinancialBilling();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "pending";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer Account</DialogTitle>
          <DialogDescription>
            Fill in the information below to create a new customer account. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const status = getStepStatus(index);
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      status === "completed"
                        ? "bg-green-500 border-green-500 text-white"
                        : status === "current"
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-200 border-gray-300 text-gray-500"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        status === "current"
                          ? "text-blue-600"
                          : status === "completed"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-gray-400 text-xs">{step.subtitle}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="bg-gray-300 ml-4 w-8 h-0.5"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
              variant="outline"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Previous
            </Button>
          </div>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 w-4 h-4" />
                    Create Account
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNextStep}
                disabled={!canProceed()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
