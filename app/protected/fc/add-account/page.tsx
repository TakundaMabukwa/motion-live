'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, X, Building2, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AddAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_number: '',
    company: '',
    legal_name: '',
    trading_name: '',
    holding_company: '',
    skylink_name: '',
    beame_list_name: '',
    annual_billing_run_date: '',
    payment_terms: '',
    category: '',
    accounts_status: 'active',
    acc_contact: '',
    sales_rep: '',
    date_added: new Date().toISOString().split('T')[0],
    switchboard: '',
    cell_no: '',
    email: '',
    send_accounts_to_contact: 'yes',
    send_accounts_to_email_for_statements_and_multibilling: 'yes',
    vat_number: '',
    vat_exempt_number: '',
    registration_number: '',
    creator: '',
    modified_by: '',
    date_modified: new Date().toISOString().split('T')[0],
    physical_address_1: '',
    physical_address_2: '',
    physical_area: '',
    physical_province: '',
    physical_code: '',
    physical_country: 'South Africa',
    postal_address_1: '',
    postal_address_2: '',
    postal_area: '',
    postal_province: '',
    postal_code: '',
    postal_country: 'South Africa',
    branch_person: '',
    branch_person_number: '',
    branch_person_email: '',
    count_of_products: '0',
    new_account_number: '',
    divisions: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.account_number || !formData.company) {
      toast.error('Account number and company name are required');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const result = await response.json();
      toast.success('Account created successfully!');
      
      // Redirect back to FC dashboard
      router.push('/protected/fc');
      
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/protected/fc');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-2xl">Add New Account</h1>
          <p className="text-gray-600">Create a new client account</p>
        </div>
        <Link href="/protected/fc">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
            { id: 'completed-jobs', label: 'Completed Jobs', icon: CheckCircle, href: '/protected/fc/completed-jobs' }
          ].map((navItem) => {
            const Icon = navItem.icon;
            const isActive = window.location.pathname === navItem.href;
            
            return (
              <Link
                key={navItem.id}
                href={navItem.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{navItem.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder="Enter account number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="new_account_number">New Account Number</Label>
                <Input
                  id="new_account_number"
                  value={formData.new_account_number}
                  onChange={(e) => handleInputChange('new_account_number', e.target.value)}
                  placeholder="Enter new account number"
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  placeholder="Enter legal name"
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <Label htmlFor="trading_name">Trading Name</Label>
                <Input
                  id="trading_name"
                  value={formData.trading_name}
                  onChange={(e) => handleInputChange('trading_name', e.target.value)}
                  placeholder="Enter trading name"
                />
              </div>
              <div>
                <Label htmlFor="holding_company">Holding Company</Label>
                <Input
                  id="holding_company"
                  value={formData.holding_company}
                  onChange={(e) => handleInputChange('holding_company', e.target.value)}
                  placeholder="Enter holding company"
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <Label htmlFor="skylink_name">Skylink Name</Label>
                <Input
                  id="skylink_name"
                  value={formData.skylink_name}
                  onChange={(e) => handleInputChange('skylink_name', e.target.value)}
                  placeholder="Enter skylink name"
                />
              </div>
              <div>
                <Label htmlFor="beame_list_name">Beame List Name</Label>
                <Input
                  id="beame_list_name"
                  value={formData.beame_list_name}
                  onChange={(e) => handleInputChange('beame_list_name', e.target.value)}
                  placeholder="Enter beame list name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Contact Information</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="acc_contact">Account Contact</Label>
                  <Input
                    id="acc_contact"
                    value={formData.acc_contact}
                    onChange={(e) => handleInputChange('acc_contact', e.target.value)}
                    placeholder="Enter account contact"
                  />
                </div>
                <div>
                  <Label htmlFor="sales_rep">Sales Representative</Label>
                  <Input
                    id="sales_rep"
                    value={formData.sales_rep}
                    onChange={(e) => handleInputChange('sales_rep', e.target.value)}
                    placeholder="Enter sales representative"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mt-4">
                <div>
                  <Label htmlFor="switchboard">Switchboard</Label>
                  <Input
                    id="switchboard"
                    value={formData.switchboard}
                    onChange={(e) => handleInputChange('switchboard', e.target.value)}
                    placeholder="Enter switchboard number"
                  />
                </div>
                <div>
                  <Label htmlFor="cell_no">Cell Number</Label>
                  <Input
                    id="cell_no"
                    value={formData.cell_no}
                    onChange={(e) => handleInputChange('cell_no', e.target.value)}
                    placeholder="Enter cell number"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Business Information */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Business Information</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="non-profit">Non-Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accounts_status">Account Status</Label>
                  <Select value={formData.accounts_status} onValueChange={(value) => handleInputChange('accounts_status', value)}>
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

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mt-4">
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select value={formData.payment_terms} onValueChange={(value) => handleInputChange('payment_terms', value)}>
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
                <div>
                  <Label htmlFor="annual_billing_run_date">Annual Billing Run Date</Label>
                  <Input
                    id="annual_billing_run_date"
                    value={formData.annual_billing_run_date}
                    onChange={(e) => handleInputChange('annual_billing_run_date', e.target.value)}
                    placeholder="Enter billing run date"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mt-4">
                <div>
                  <Label htmlFor="vat_number">VAT Number</Label>
                  <Input
                    id="vat_number"
                    value={formData.vat_number}
                    onChange={(e) => handleInputChange('vat_number', e.target.value)}
                    placeholder="Enter VAT number"
                  />
                </div>
                <div>
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    placeholder="Enter registration number"
                  />
                </div>
              </div>
            </div>

            {/* Physical Address */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Physical Address</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="physical_address_1">Address Line 1</Label>
                  <Input
                    id="physical_address_1"
                    value={formData.physical_address_1}
                    onChange={(e) => handleInputChange('physical_address_1', e.target.value)}
                    placeholder="Enter address line 1"
                  />
                </div>
                <div>
                  <Label htmlFor="physical_address_2">Address Line 2</Label>
                  <Input
                    id="physical_address_2"
                    value={formData.physical_address_2}
                    onChange={(e) => handleInputChange('physical_address_2', e.target.value)}
                    placeholder="Enter address line 2"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mt-4">
                <div>
                  <Label htmlFor="physical_area">Area</Label>
                  <Input
                    id="physical_area"
                    value={formData.physical_area}
                    onChange={(e) => handleInputChange('physical_area', e.target.value)}
                    placeholder="Enter area"
                  />
                </div>
                <div>
                  <Label htmlFor="physical_province">Province</Label>
                  <Select value={formData.physical_province} onValueChange={(value) => handleInputChange('physical_province', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gauteng">Gauteng</SelectItem>
                      <SelectItem value="western_cape">Western Cape</SelectItem>
                      <SelectItem value="kwazulu_natal">KwaZulu-Natal</SelectItem>
                      <SelectItem value="eastern_cape">Eastern Cape</SelectItem>
                      <SelectItem value="free_state">Free State</SelectItem>
                      <SelectItem value="mpumalanga">Mpumalanga</SelectItem>
                      <SelectItem value="limpopo">Limpopo</SelectItem>
                      <SelectItem value="north_west">North West</SelectItem>
                      <SelectItem value="northern_cape">Northern Cape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="physical_code">Postal Code</Label>
                  <Input
                    id="physical_code"
                    value={formData.physical_code}
                    onChange={(e) => handleInputChange('physical_code', e.target.value)}
                    placeholder="Enter postal code"
                  />
                </div>
              </div>
            </div>

            {/* Postal Address */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Postal Address</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="postal_address_1">Address Line 1</Label>
                  <Input
                    id="postal_address_1"
                    value={formData.postal_address_1}
                    onChange={(e) => handleInputChange('postal_address_1', e.target.value)}
                    placeholder="Enter postal address line 1"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_address_2">Address Line 2</Label>
                  <Input
                    id="postal_address_2"
                    value={formData.postal_address_2}
                    onChange={(e) => handleInputChange('postal_address_2', e.target.value)}
                    placeholder="Enter postal address line 2"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mt-4">
                <div>
                  <Label htmlFor="postal_area">Area</Label>
                  <Input
                    id="postal_area"
                    value={formData.postal_area}
                    onChange={(e) => handleInputChange('postal_area', e.target.value)}
                    placeholder="Enter postal area"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_province">Province</Label>
                  <Select value={formData.postal_province} onValueChange={(value) => handleInputChange('postal_province', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gauteng">Gauteng</SelectItem>
                      <SelectItem value="western_cape">Western Cape</SelectItem>
                      <SelectItem value="kwazulu_natal">KwaZulu-Natal</SelectItem>
                      <SelectItem value="eastern_cape">Eastern Cape</SelectItem>
                      <SelectItem value="free_state">Free State</SelectItem>
                      <SelectItem value="mpumalanga">Mpumalanga</SelectItem>
                      <SelectItem value="limpopo">Limpopo</SelectItem>
                      <SelectItem value="north_west">North West</SelectItem>
                      <SelectItem value="northern_cape">Northern Cape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="Enter postal code"
                  />
                </div>
              </div>
            </div>

            {/* Branch Information */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Branch Information</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="branch_person">Branch Person</Label>
                  <Input
                    id="branch_person"
                    value={formData.branch_person}
                    onChange={(e) => handleInputChange('branch_person', e.target.value)}
                    placeholder="Enter branch person name"
                  />
                </div>
                <div>
                  <Label htmlFor="branch_person_number">Branch Person Number</Label>
                  <Input
                    id="branch_person_number"
                    value={formData.branch_person_number}
                    onChange={(e) => handleInputChange('branch_person_number', e.target.value)}
                    placeholder="Enter branch person number"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="branch_person_email">Branch Person Email</Label>
                <Input
                  id="branch_person_email"
                  type="email"
                  value={formData.branch_person_email}
                  onChange={(e) => handleInputChange('branch_person_email', e.target.value)}
                  placeholder="Enter branch person email"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="pt-4 border-t">
              <h3 className="mb-4 font-semibold text-lg">Additional Information</h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <Label htmlFor="count_of_products">Count of Products</Label>
                  <Input
                    id="count_of_products"
                    type="number"
                    value={formData.count_of_products}
                    onChange={(e) => handleInputChange('count_of_products', e.target.value)}
                    placeholder="Enter product count"
                  />
                </div>
                <div>
                  <Label htmlFor="divisions">Divisions</Label>
                  <Input
                    id="divisions"
                    value={formData.divisions}
                    onChange={(e) => handleInputChange('divisions', e.target.value)}
                    placeholder="Enter divisions"
                  />
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mt-4">
                <div>
                  <Label htmlFor="send_accounts_to_contact">Send Accounts to Contact</Label>
                  <Select value={formData.send_accounts_to_contact} onValueChange={(value) => handleInputChange('send_accounts_to_contact', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="send_accounts_to_email_for_statements_and_multibilling">Send Accounts to Email</Label>
                  <Select value={formData.send_accounts_to_email_for_statements_and_multibilling} onValueChange={(value) => handleInputChange('send_accounts_to_email_for_statements_and_multibilling', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="mr-2 w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="mr-2 w-4 h-4" />
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
