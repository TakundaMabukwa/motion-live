"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { 
  Loader2, 
  ChevronRight, 
  ArrowLeft, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  User, 
  Building, 
  MapPin, 
  Phone, Mail,
  Calendar,
  CheckCircle,
  XCircle
} from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";

export default function ValidateCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [customerGroup, setCustomerGroup] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [validationStatus, setValidationStatus] = useState(false);
  const [validationSaving, setValidationSaving] = useState(false);
  const [isInitialDataEntry, setIsInitialDataEntry] = useState(false);

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  // Fetch customer data from URL parameter
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const accountParam = searchParams?.get('account');
        console.log('URL account param:', accountParam);
        
        if (!accountParam) {
          toast.error('No customer selected');
          router.back();
          return;
        }

        // Fetch customer data from customers_grouped with new API
        const customerResponse = await fetch(`/api/customers-grouped/by-account/${encodeURIComponent(accountParam)}`);
        
        if (!customerResponse.ok) {
          const errorText = await customerResponse.text();
          console.error('Failed to fetch customer:', errorText);
          throw new Error('Failed to fetch customer data');
        }
        
        const customerData = await customerResponse.json();
        console.log('Customer data loaded:', customerData);
        
        // Set both customer group and detailed data from single response
        setCustomerGroup({
          id: customerData.id,
          legal_names: customerData.legal_names,
          company_group: customerData.company_group,
          all_new_account_numbers: customerData.all_new_account_numbers
        });
        
        setCustomerData(customerData);
        setEditValues(customerData);
        setValidationStatus(customerData.customer_validated || false);
        
        // Check if this is initial data entry (no contact details filled)
        const hasContactDetails = customerData.company || customerData.email || customerData.cell_no;
        setIsInitialDataEntry(!hasContactDetails);
        
        console.log('Customer data and group loaded successfully');
        console.log('Is initial data entry:', !hasContactDetails);
      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast.error('Failed to load customer information: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [searchParams, router]);

  const handleValidationToggle = async (isValidated) => {
    setValidationSaving(true);
    try {
      const updateData = {
        validate: isValidated,
        customer_validated: isValidated,
        validated_by: isValidated ? 'FC User' : null,
        validated_at: isValidated ? new Date().toISOString() : null
      };

      const response = await fetch(`/api/customers-grouped/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update validation status');
      
      setValidationStatus(isValidated);
      setCustomerData({ ...customerData, ...updateData });
      toast.success(isValidated ? 'Customer validated successfully' : 'Customer validation removed');
    } catch (error) {
      console.error('Error updating validation status:', error);
      toast.error('Failed to update validation status');
    } finally {
      setValidationSaving(false);
    }
  };

  const canSave = () => {
    // Check if minimum required fields are present
    const requiredFields = ['company', 'trading_name'];
    return requiredFields.every(field => 
      editValues[field] && editValues[field].toString().trim().length > 0
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/customers-grouped/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      });

      if (!response.ok) throw new Error('Failed to save customer data');
      
      const updatedData = await response.json();
      setCustomerData(updatedData);
      setEditValues(updatedData);
      
      if (isInitialDataEntry) {
        setIsInitialDataEntry(false);
      }
      
      toast.success('Customer data saved successfully');
    } catch (error) {
      console.error('Error saving customer data:', error);
      toast.error('Failed to save customer data');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (!customerGroup) return;
    const accountNumbers = customerGroup.all_new_account_numbers;
    router.push(`/protected/fc/validate/cost-centers/${encodeURIComponent(accountNumbers)}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <DashboardHeader title="Validate Customer Information" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="p-6 space-y-6">
        <DashboardHeader title="Validate Customer Information" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No customer data found. Please try again.</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DashboardHeader 
        title={isInitialDataEntry ? "Customer Data Collection" : "Customer Data Validation"}
        subtitle={customerGroup ? (customerGroup.legal_names || customerGroup.company_group) : 'Loading customer information...'}
      />

      {/* Validation Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {validationStatus ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {validationStatus ? 'Validated' : 'Pending Validation'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {validationStatus 
                    ? 'Customer data has been verified'
                    : 'Please review and validate'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Label className="text-sm">Mark as Validated</Label>
              <Switch
                checked={validationStatus}
                onCheckedChange={handleValidationToggle}
                disabled={validationSaving || isInitialDataEntry}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information Form */}
      <form className="space-y-6">
        {/* Company Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Company Name */}
              <div className="space-y-2">
                <Label>
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editValues.company || ""}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  disabled={saving}
                  placeholder="Enter company name"
                />
              </div>

              {/* Trading Name */}
              <div className="space-y-2">
                <Label>
                  Trading Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editValues.trading_name || ""}
                  onChange={(e) => handleInputChange('trading_name', e.target.value)}
                  disabled={saving}
                  placeholder="Enter trading name"
                />
              </div>

              {/* Legal Name */}
              <div className="space-y-2">
                <Label>Legal Name</Label>
                <Input
                  value={editValues.legal_name || ""}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  disabled={saving}
                  placeholder="Enter legal name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Email */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={editValues.email || ""}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={saving}
                  placeholder="Enter email address"
                />
              </div>

              {/* Cell Phone */}
              <div className="space-y-2">
                <Label>Cell Phone</Label>
                <Input
                  value={editValues.cell_no || ""}
                  onChange={(e) => handleInputChange('cell_no', e.target.value)}
                  disabled={saving}
                  placeholder="Enter cell phone number"
                />
              </div>

              {/* Switchboard */}
              <div className="space-y-2">
                <Label>Switchboard</Label>
                <Input
                  value={editValues.switchboard || ""}
                  onChange={(e) => handleInputChange('switchboard', e.target.value)}
                  disabled={saving}
                  placeholder="Enter switchboard number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Physical Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Physical Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={editValues.physical_address_1 || ""}
                    onChange={(e) => handleInputChange('physical_address_1', e.target.value)}
                    disabled={saving}
                    placeholder="Enter street address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Area/Suburb</Label>
                  <Input
                    value={editValues.physical_area || ""}
                    onChange={(e) => handleInputChange('physical_area', e.target.value)}
                    disabled={saving}
                    placeholder="Enter area or suburb"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    value={editValues.physical_province || ""}
                    onChange={(e) => handleInputChange('physical_province', e.target.value)}
                    disabled={saving}
                    placeholder="Enter province"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={editValues.physical_code || ""}
                    onChange={(e) => handleInputChange('physical_code', e.target.value)}
                    disabled={saving}
                    placeholder="Enter postal code"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={editValues.physical_country || "South Africa"}
                    onChange={(e) => handleInputChange('physical_country', e.target.value)}
                    disabled={saving}
                    placeholder="Enter country"
                  />
                </div>
              </div>
            </div>

            {/* Postal Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Postal Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>Postal Address</Label>
                  <Input
                    value={editValues.postal_address_1 || ""}
                    onChange={(e) => handleInputChange('postal_address_1', e.target.value)}
                    disabled={saving}
                    placeholder="Enter postal address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Postal Area</Label>
                  <Input
                    value={editValues.postal_area || ""}
                    onChange={(e) => handleInputChange('postal_area', e.target.value)}
                    disabled={saving}
                    placeholder="Enter postal area"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={editValues.postal_code || ""}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    disabled={saving}
                    placeholder="Enter postal code"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button
            onClick={handleContinue}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
