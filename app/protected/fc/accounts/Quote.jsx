"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  DollarSign,
  Mail,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Layout from "@/components/Layout";

export default function CreateQuote() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    jobType: "",
    description: "",
    stockType: "",
    vehicleDetails: "",
    installationType: "",
    // Customer Details
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    // Quote Details
    product: "",
    quantity: 1,
    cashPrice: 0,
    cashDiscount: 0,
    rentalPrice: 0,
    rentalDiscount: 0,
    installationPrice: 0,
    installationDiscount: 0,
    extraNotes: "",
    // Email
    emailSubject: "",
    emailBody: "",
    quoteFooter:
      "Contact period is 36 months for rental agreements. Rental subject to standard credit checks, supporting documents and application being accepted.",
    // Stock Items
    selectedStockItems: [],
    stockItems: [],
  });

  // Stock items from the image
  const availableStockItems = [
    "DASHCAM",
    "AI DASHCAM",
    "BACKUP",
    "BREATHALOK",
    "Dashcam Cab Facing",
    "Dashcam Forward Facing",
    "DVR CAMERA",
    "FMS",
  ];

  const steps = [
    {
      id: 0,
      title: "Job Details",
      subtitle: "Basic job information",
      icon: FileText,
    },
    {
      id: 1,
      title: "Customer Details",
      subtitle: "Customer information",
      icon: User,
    },
    {
      id: 2,
      title: "Quote Details",
      subtitle: "Pricing and terms",
      icon: DollarSign,
    },
    { id: 3, title: "Email", subtitle: "Send quote to customer", icon: Mail },
  ];

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStockItemToggle = (item) => {
    setFormData((prev) => ({
      ...prev,
      selectedStockItems: prev.selectedStockItems.includes(item)
        ? prev.selectedStockItems.filter((i) => i !== item)
        : [...prev.selectedStockItems, item],
    }));
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "pending";
  };

  const calculateGrossAmount = (price, discount) => {
    return price * (1 - discount / 100);
  };

  const getTotalQuoteAmount = () => {
    const grossCash = calculateGrossAmount(
      formData.cashPrice,
      formData.cashDiscount
    );
    const grossRental = calculateGrossAmount(
      formData.rentalPrice,
      formData.rentalDiscount
    );
    const grossInstallation = calculateGrossAmount(
      formData.installationPrice,
      formData.installationDiscount
    );
    return grossCash + grossRental + grossInstallation;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.jobType && formData.description;
      case 1:
        return (
          formData.customerName &&
          formData.customerEmail &&
          formData.customerPhone
        );
      case 2:
        return formData.product;
      case 3:
        return formData.emailSubject && formData.emailBody;
      default:
        return false;
    }
  };

  const renderJobDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Job Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="jobType">Job Type *</Label>
          <Select
            value={formData.jobType}
            onValueChange={(value) => updateFormData("jobType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="install">Installation</SelectItem>
              <SelectItem value="de-install">De-Installation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.jobType === "install" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="stockType">Stock Type *</Label>
              <Select
                value={formData.stockType}
                onValueChange={(value) => updateFormData("stockType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stock type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-stock">New Stock</SelectItem>
                  <SelectItem value="second-hand">2nd Hand Stock</SelectItem>
                  <SelectItem value="client-stock">Client Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installationType">Installation Type</Label>
              <Select
                value={formData.installationType}
                onValueChange={(value) =>
                  updateFormData("installationType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select installation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard Installation
                  </SelectItem>
                  <SelectItem value="complex">Complex Installation</SelectItem>
                  <SelectItem value="emergency">
                    Emergency Installation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {formData.jobType === "install" && formData.stockType && (
          <div className="space-y-2">
            <Label>Available Stock Items</Label>
            <div className="p-4 border rounded-lg max-h-48 overflow-y-auto">
              <div className="gap-3 grid grid-cols-1">
                {availableStockItems.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`install-${item}`}
                      checked={formData.selectedStockItems.includes(item)}
                      onCheckedChange={() => handleStockItemToggle(item)}
                    />
                    <Label
                      htmlFor={`install-${item}`}
                      className="font-normal text-sm cursor-pointer"
                    >
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {formData.selectedStockItems.length > 0 && (
              <div className="mt-2">
                <p className="text-gray-600 text-sm">
                  Selected items: {formData.selectedStockItems.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {formData.jobType === "de-install" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="stockType">Stock Received</Label>
              <Select
                value={formData.stockType}
                onValueChange={(value) => updateFormData("stockType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock-received">Stock Received</SelectItem>
                  <SelectItem value="no-stock-received">
                    No Stock Received
                  </SelectItem>
                  <SelectItem value="no-items">No Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.stockType === "stock-received" && (
              <div className="space-y-2">
                <Label>Stock Items Received</Label>
                <div className="p-4 border rounded-lg max-h-48 overflow-y-auto">
                  <div className="gap-3 grid grid-cols-1">
                    {availableStockItems.map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`deinstall-${item}`}
                          checked={formData.selectedStockItems.includes(item)}
                          onCheckedChange={() => handleStockItemToggle(item)}
                        />
                        <Label
                          htmlFor={`deinstall-${item}`}
                          className="font-normal text-sm cursor-pointer"
                        >
                          {item}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.selectedStockItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-sm">
                      Items received: {formData.selectedStockItems.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.stockType === "no-items" && (
              <div className="bg-gray-50 p-4 border rounded-lg">
                <p className="text-gray-600 text-sm">
                  No items to display for this selection.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicleDetails">Vehicle Removal Details</Label>
              <Textarea
                placeholder="Enter details about accounts to remove vehicle and close..."
                value={formData.vehicleDetails}
                onChange={(e) =>
                  updateFormData("vehicleDetails", e.target.value)
                }
                className="min-h-20"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            placeholder="Describe the job requirements..."
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            className="min-h-32"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderCustomerDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => updateFormData("customerName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email Address *</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={formData.customerEmail}
              onChange={(e) => updateFormData("customerEmail", e.target.value)}
            />
          </div>
        </div>

        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number"
              value={formData.customerPhone}
              onChange={(e) => updateFormData("customerPhone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              placeholder="Enter customer address"
              value={formData.customerAddress}
              onChange={(e) =>
                updateFormData("customerAddress", e.target.value)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderQuoteDetailsForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Quote Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select
              value={formData.product}
              onValueChange={(value) => updateFormData("product", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beame-1-backup">
                  Beame 1 Backup unit only
                </SelectItem>
                <SelectItem value="beame-2-backup">
                  Beame 2 Backup unit only
                </SelectItem>
                <SelectItem value="beame-3-backup">
                  Beame 3 Backup unit only
                </SelectItem>
                <SelectItem value="beame-4-backup">
                  Beame 4 Backup unit only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) =>
                updateFormData("quantity", parseInt(e.target.value) || 1)
              }
            />
          </div>
        </div>

        <Separator />

        {/* Cash Price Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Cash</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cash ex VAT</Label>
              <Input
                type="number"
                placeholder="R 0,00"
                value={formData.cashPrice}
                onChange={(e) =>
                  updateFormData("cashPrice", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input
                type="number"
                placeholder="0,00 %"
                max="100"
                value={formData.cashDiscount}
                onChange={(e) =>
                  updateFormData(
                    "cashDiscount",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Gross Cash/Month ex VAT</Label>
              <Input
                readOnly
                value={`R ${calculateGrossAmount(
                  formData.cashPrice,
                  formData.cashDiscount
                ).toFixed(2)}`}
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Cash/Month ex VAT</Label>
              <Input
                readOnly
                value={`R ${(
                  calculateGrossAmount(
                    formData.cashPrice,
                    formData.cashDiscount
                  ) * formData.quantity
                ).toFixed(2)}`}
                className="bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Rental Price Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Rental Price</h3>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Rental Price ex VAT</Label>
              <Input
                type="number"
                placeholder="R 0,00"
                value={formData.rentalPrice}
                onChange={(e) =>
                  updateFormData("rentalPrice", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input
                type="number"
                placeholder="0,00 %"
                max="100"
                value={formData.rentalDiscount}
                onChange={(e) =>
                  updateFormData(
                    "rentalDiscount",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Gross Rental/Month ex VAT</Label>
              <Input
                readOnly
                value={`R ${calculateGrossAmount(
                  formData.rentalPrice,
                  formData.rentalDiscount
                ).toFixed(2)}`}
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Rental/Month ex VAT</Label>
              <Input
                readOnly
                value={`R ${(
                  calculateGrossAmount(
                    formData.rentalPrice,
                    formData.rentalDiscount
                  ) * formData.quantity
                ).toFixed(2)}`}
                className="bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Installation Section */}
        {formData.jobType === "install" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Once Off Installation</h3>
            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Once Off Installation</Label>
                <Input
                  type="number"
                  placeholder="R 0,00"
                  value={formData.installationPrice}
                  onChange={(e) =>
                    updateFormData(
                      "installationPrice",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Installation Discount *</Label>
                <Input
                  type="number"
                  placeholder="0,00 %"
                  max="100"
                  value={formData.installationDiscount}
                  onChange={(e) =>
                    updateFormData(
                      "installationDiscount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Gross Once Off Installation</Label>
                <Input
                  readOnly
                  value={`R ${calculateGrossAmount(
                    formData.installationPrice,
                    formData.installationDiscount
                  ).toFixed(2)}`}
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Once Off Installation</Label>
                <Input
                  readOnly
                  value={`R ${(
                    calculateGrossAmount(
                      formData.installationPrice,
                      formData.installationDiscount
                    ) * formData.quantity
                  ).toFixed(2)}`}
                  className="bg-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="extraNotes">Extra Notes For Quotes</Label>
          <Textarea
            id="extraNotes"
            placeholder="Add any additional notes for the quote..."
            value={formData.extraNotes}
            onChange={(e) => updateFormData("extraNotes", e.target.value)}
            className="min-h-20"
          />
        </div>

        <div className="flex justify-end">
          <div className="text-right">
            <p className="font-semibold text-lg">
              Total Quote Amount: R {getTotalQuoteAmount().toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmailForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emailSubject">Email Subject *</Label>
          <Input
            id="emailSubject"
            placeholder="Enter email subject"
            value={formData.emailSubject}
            onChange={(e) => updateFormData("emailSubject", e.target.value)}
          />
          {!formData.emailSubject && (
            <p className="text-red-500 text-sm">This field is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailBody">Email Body *</Label>
          <Textarea
            id="emailBody"
            placeholder="Email body text"
            value={formData.emailBody}
            onChange={(e) => updateFormData("emailBody", e.target.value)}
            className="min-h-40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quoteFooter">Quote Footer *</Label>
          <Textarea
            id="quoteFooter"
            value={formData.quoteFooter}
            onChange={(e) => updateFormData("quoteFooter", e.target.value)}
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderJobDetailsForm();
      case 1:
        return renderCustomerDetailsForm();
      case 2:
        return renderQuoteDetailsForm();
      case 3:
        return renderEmailForm();
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="bg-gray-50 p-4 min-h-screen">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            {/* <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Quotes
              </Button>
            </div> */}
            <h1 className="mb-2 font-bold text-3xl">Create New Quote</h1>
            <p className="text-gray-600">
              Follow the steps to create a professional quote
            </p>
          </div>

          {/* Step Navigation */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className="flex flex-col flex-1 items-center"
                  >
                    <div className="flex items-center w-full">
                      <div
                        className={`
                      flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                      ${
                        status === "completed"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : status === "current"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      }
                    `}
                      >
                        {status === "completed" ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>

                      {index < steps.length - 1 && (
                        <div
                          className={`
                        flex-1 h-0.5 ml-4 transition-all
                        ${
                          status === "completed" ? "bg-blue-600" : "bg-gray-300"
                        }
                      `}
                        />
                      )}
                    </div>

                    <div className="mt-2 text-center">
                      <p
                        className={`font-medium ${
                          status === "current"
                            ? "text-blue-600"
                            : status === "completed"
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-gray-500 text-xs">{step.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="mb-8">{renderStepContent()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => alert("Quote submitted successfully!")}
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                Send Quote
              </Button>
            )}
          </div>

          {/* Form Validation Summary */}
          {!canProceed() && (
            <div className="bg-yellow-50 mt-4 p-4 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-yellow-800 text-sm">
                  Please complete all required fields to proceed to the next
                  step.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
