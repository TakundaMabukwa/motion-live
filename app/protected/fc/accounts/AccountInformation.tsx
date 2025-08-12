'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Save, 
  Edit,
  Building2
} from 'lucide-react';


export default function AccountInformation() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    divisions: '',
    accountNumber: '',
    companyTradingName: 'AIRGASS COMPRESSORS (PTY) LTD',
    legalName: 'AIRGASS COMPRESSORS (PTY) LTD',
    holdingCompany: '',
    annuityBillingDate: '',
    dateAdded: '',
    vatNumber: '',
    vatExemptNumber: '',
    registrationNumber: '',
    creator: '',
    paymentTerms: '',
    modifiedBy: '',
    dateModified: '',
    category: '',
    accountStatus: '',
    beameListName: '',
    skylinkName: '',
    company: 'AIRGASS COMPRESSORS (PTY) LTD'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving account data:', formData);
    setIsEditing(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <User className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Account Information</h1>
            <p className="text-gray-600">Manage company account details and settings</p>
          </div>
        </div>
        <Button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={isEditing ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Account
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-600" />
            Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="divisions" className="text-sm font-medium text-gray-600">
                  Divisions
                </Label>
                {isEditing ? (
                  <Input
                    id="divisions"
                    value={formData.divisions}
                    onChange={(e) => handleInputChange('divisions', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.divisions || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="companyTradingName" className="text-sm font-medium text-gray-600">
                  Company Trading Name
                </Label>
                {isEditing ? (
                  <Input
                    id="companyTradingName"
                    value={formData.companyTradingName}
                    onChange={(e) => handleInputChange('companyTradingName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800 font-medium">{formData.companyTradingName}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="holdingCompany" className="text-sm font-medium text-gray-600">
                  Holding Company
                </Label>
                {isEditing ? (
                  <Input
                    id="holdingCompany"
                    value={formData.holdingCompany}
                    onChange={(e) => handleInputChange('holdingCompany', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.holdingCompany || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="dateAdded" className="text-sm font-medium text-gray-600">
                  Date Added
                </Label>
                {isEditing ? (
                  <Input
                    id="dateAdded"
                    type="date"
                    value={formData.dateAdded}
                    onChange={(e) => handleInputChange('dateAdded', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.dateAdded || '-'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-600">
                  Account Number
                </Label>
                {isEditing ? (
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.accountNumber || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="legalName" className="text-sm font-medium text-gray-600">
                  Legal Name
                </Label>
                {isEditing ? (
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800 font-medium">{formData.legalName}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="annuityBillingDate" className="text-sm font-medium text-gray-600">
                  Annuity Billing Date
                </Label>
                {isEditing ? (
                  <Input
                    id="annuityBillingDate"
                    type="date"
                    value={formData.annuityBillingDate}
                    onChange={(e) => handleInputChange('annuityBillingDate', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.annuityBillingDate || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="vatNumber" className="text-sm font-medium text-gray-600">
                  VAT Number
                </Label>
                {isEditing ? (
                  <Input
                    id="vatNumber"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.vatNumber || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="vatExemptNumber" className="text-sm font-medium text-gray-600">
                  VAT Exempt Number
                </Label>
                {isEditing ? (
                  <Input
                    id="vatExemptNumber"
                    value={formData.vatExemptNumber}
                    onChange={(e) => handleInputChange('vatExemptNumber', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.vatExemptNumber || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="creator" className="text-sm font-medium text-gray-600">
                  Creator
                </Label>
                {isEditing ? (
                  <Input
                    id="creator"
                    value={formData.creator}
                    onChange={(e) => handleInputChange('creator', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.creator || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="modifiedBy" className="text-sm font-medium text-gray-600">
                  Modified By
                </Label>
                {isEditing ? (
                  <Input
                    id="modifiedBy"
                    value={formData.modifiedBy}
                    onChange={(e) => handleInputChange('modifiedBy', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.modifiedBy || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-600">
                  Category
                </Label>
                {isEditing ? (
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.category || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="beameListName" className="text-sm font-medium text-gray-600">
                  BEAME List Name
                </Label>
                {isEditing ? (
                  <Input
                    id="beameListName"
                    value={formData.beameListName}
                    onChange={(e) => handleInputChange('beameListName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.beameListName || '-'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="registrationNumber" className="text-sm font-medium text-gray-600">
                  Registration Number
                </Label>
                {isEditing ? (
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.registrationNumber || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="paymentTerms" className="text-sm font-medium text-gray-600">
                  Payment Terms
                </Label>
                {isEditing ? (
                  <Select value={formData.paymentTerms} onValueChange={(value) => handleInputChange('paymentTerms', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cod">COD</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.paymentTerms || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="dateModified" className="text-sm font-medium text-gray-600">
                  Date Modified
                </Label>
                {isEditing ? (
                  <Input
                    id="dateModified"
                    type="date"
                    value={formData.dateModified}
                    onChange={(e) => handleInputChange('dateModified', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.dateModified || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="accountStatus" className="text-sm font-medium text-gray-600">
                  Account Status
                </Label>
                {isEditing ? (
                  <Select value={formData.accountStatus} onValueChange={(value) => handleInputChange('accountStatus', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.accountStatus || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="skylinkName" className="text-sm font-medium text-gray-600">
                  SKYLINK Name
                </Label>
                {isEditing ? (
                  <Input
                    id="skylinkName"
                    value={formData.skylinkName}
                    onChange={(e) => handleInputChange('skylinkName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                    <span className="text-gray-800">{formData.skylinkName || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="company" className="text-sm font-medium text-gray-600">
                Company
              </Label>
              {isEditing ? (
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[40px] flex items-center">
                  <span className="text-gray-800 font-medium">{formData.company}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}