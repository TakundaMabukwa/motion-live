"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, Mail, Printer } from "lucide-react";

export default function Report() {
  // Fixed invoice data
  const invoiceData = {
    invoiceNumber: "INV-2024-001",
    issueDate: "January 15, 2024",
    dueDate: "February 15, 2024",
    status: "Paid",
    
    // Company details
    company: {
      name: "Acme Corporation",
      address: "123 Business Street",
      city: "New York, NY 10001",
      phone: "+1 (555) 123-4567",
      email: "billing@acme.com",
      website: "www.acme.com"
    },
    
    // Client details
    client: {
      name: "John Smith",
      company: "Smith Enterprises",
      address: "456 Client Avenue",
      city: "Los Angeles, CA 90210",
      email: "john@smithenterprises.com"
    },
    
    // Variable invoice items (these would change per invoice)
    items: [
      {
        id: 1,
        description: "Web Development Services",
        quantity: 40,
        rate: 125.00,
        amount: 5000.00
      },
      {
        id: 2,
        description: "UI/UX Design Consultation",
        quantity: 20,
        rate: 150.00,
        amount: 3000.00
      },
      {
        id: 3,
        description: "Project Management",
        quantity: 15,
        rate: 100.00,
        amount: 1500.00
      },
      {
        id: 4,
        description: "Quality Assurance Testing",
        quantity: 10,
        rate: 80.00,
        amount: 800.00
      }
    ],
    
    // Calculated totals
    subtotal: 10300.00,
    taxRate: 0.08,
    tax: 824.00,
    total: 11124.00,
    
    // Payment details
    paymentMethod: "Bank Transfer",
    bankDetails: {
      accountName: "Acme Corporation",
      accountNumber: "****-****-****-1234",
      routingNumber: "021000021",
      bankName: "First National Bank"
    },
    
    notes: "Thank you for your business! Payment is due within 30 days of invoice date. Late payments may incur additional fees."
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-gray-50 py-8 min-h-screen">
      <div className="mx-auto px-4 max-w-4xl">

        {/* Invoice Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            {/* Header with Logo and Invoice Info */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                {/* Logo Placeholder - Replace with your 4th image */}
                <div className="flex justify-center items-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg w-16 h-16">
                  {/* <span className="font-bold text-white text-xl">A</span> */}
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-2xl">{invoiceData.company.name}</h1>
                  <p className="text-gray-600">{invoiceData.company.website}</p>
                </div>
              </div>
              
              <div className="text-right">
                <h2 className="mb-2 font-bold text-gray-900 text-3xl">INVOICE</h2>
                <div className="space-y-1">
                  <p className="text-gray-600 text-sm">Invoice #: <span className="font-semibold">{invoiceData.invoiceNumber}</span></p>
                  <p className="text-gray-600 text-sm">Issue Date: <span className="font-semibold">{invoiceData.issueDate}</span></p>
                  <p className="text-gray-600 text-sm">Due Date: <span className="font-semibold">{invoiceData.dueDate}</span></p>
                  <Badge variant={invoiceData.status === 'Paid' ? 'default' : 'destructive'} className="mt-2">
                    {invoiceData.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Company and Client Details */}
            <div className="gap-8 grid md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">From:</h3>
                <div className="space-y-1 text-gray-600 text-sm">
                  <p className="font-semibold text-gray-900">{invoiceData.company.name}</p>
                  <p>{invoiceData.company.address}</p>
                  <p>{invoiceData.company.city}</p>
                  <p>{invoiceData.company.phone}</p>
                  <p>{invoiceData.company.email}</p>
                </div>
              </div>
              
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Bill To:</h3>
                <div className="space-y-1 text-gray-600 text-sm">
                  <p className="font-semibold text-gray-900">{invoiceData.client.name}</p>
                  <p>{invoiceData.client.company}</p>
                  <p>{invoiceData.client.address}</p>
                  <p>{invoiceData.client.city}</p>
                  <p>{invoiceData.client.email}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Invoice Items Table */}
            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-gray-200 border-b">
                      <th className="px-2 py-3 font-semibold text-gray-900 text-left">Description</th>
                      <th className="px-2 py-3 font-semibold text-gray-900 text-center">Qty</th>
                      <th className="px-2 py-3 font-semibold text-gray-900 text-right">Rate</th>
                      <th className="px-2 py-3 font-semibold text-gray-900 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-gray-100 border-b transition-colors">
                        <td className="px-2 py-4">
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </td>
                        <td className="px-2 py-4 text-gray-600 text-center">{item.quantity}</td>
                        <td className="px-2 py-4 text-gray-600 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-2 py-4 font-semibold text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="space-y-3 w-full max-w-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoiceData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({(invoiceData.taxRate * 100).toFixed(0)}%):</span>
                  <span>{formatCurrency(invoiceData.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-gray-900 text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(invoiceData.total)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="gap-8 grid md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Payment Method</h3>
                <p className="mb-4 text-gray-600 text-sm">{invoiceData.paymentMethod}</p>
                
                <h4 className="mb-2 font-semibold text-gray-900">Bank Details</h4>
                <div className="space-y-1 text-gray-600 text-sm">
                  <p>Account Name: {invoiceData.bankDetails.accountName}</p>
                  <p>Account Number: {invoiceData.bankDetails.accountNumber}</p>
                  <p>Routing Number: {invoiceData.bankDetails.routingNumber}</p>
                  <p>Bank: {invoiceData.bankDetails.bankName}</p>
                </div>
              </div>
              
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Notes</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{invoiceData.notes}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-gray-200 border-t">
              <div className="text-gray-500 text-sm text-center">
                <p>This invoice was generated electronically and is valid without signature.</p>
                <p className="mt-1">For questions about this invoice, please contact {invoiceData.company.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}