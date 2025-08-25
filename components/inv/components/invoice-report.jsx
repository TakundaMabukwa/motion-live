"use client";

import React from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';


export default function InvoiceReportComponent({ costCenter, clientLegalName, vehicleInvoices }) {

  // Invoice report data structure using vehicle_invoices table data
  const invoiceReportData = {
    company: {
      name: "Soltrack (PTY) LTD",
      regNo: "2018/095975/07",
      vatNo: "4580161802",
      tagline: "VEHICLE BUREAU SERVICE"
    },
    client: {
      name: clientLegalName || "Client Name",
      accountNumber: costCenter?.accountNumber || "N/A",
      costCenter: costCenter?.accountName || "N/A"
    },
    invoice: {
      number: `INV-${costCenter?.accountNumber || 'N/A'}`,
      date: new Date().toLocaleDateString(),
      type: "Vehicle Invoice Statement"
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  // Calculate totals
  const totals = vehicleInvoices.reduce((acc, invoice) => {
    const exVat = parseFloat(invoice.total_ex_vat) || 0;
    const vat = parseFloat(invoice.total_vat) || 0;
    const inclVat = parseFloat(invoice.total_incl_vat) || 0;
    
    return {
      totalExVat: acc.totalExVat + exVat,
      totalVat: acc.totalVat + vat,
      totalInclVat: acc.totalInclVat + inclVat
    };
  }, { totalExVat: 0, totalVat: 0, totalInclVat: 0 });

  // Print Report function using browser print
  const printReport = () => {
    // Create a new window with the content
    const printWindow = window.open('', '_blank');
    
    // Get the current component's HTML content
    const content = document.querySelector('[data-invoice-content]');
    
    // Create the print HTML with proper styling
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${costCenter?.accountNumber}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            
            .company-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 20px;
              border-bottom: 2px solid #3b82f6;
              margin-bottom: 30px;
            }
            
            .company-info {
              display: flex;
              align-items: flex-start;
              gap: 20px;
            }
            
            .company-logo {
              width: 120px;
              height: 120px;
            }
            
            .company-details h2 {
              color: #3b82f6;
              font-size: 24px;
              margin: 0 0 10px 0;
            }
            
            .company-details p {
              margin: 5px 0;
              color: #6b7280;
            }
            
            .invoice-header {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #d1d5db;
              margin-bottom: 20px;
            }
            
            .invoice-header h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .invoice-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            
            .invoice-grid label {
              font-weight: 600;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .invoice-grid p {
              margin: 5px 0;
              color: #111827;
              font-weight: 600;
            }
            
            .notes-section {
              background: #eff6ff;
              padding: 20px;
              border: 1px solid #93c5fd;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            
            .notes-section h3 {
              margin: 0 0 10px 0;
              color: #374151;
            }
            
            .notes-section p {
              margin: 0;
              color: #1e40af;
            }
            
            .table-section h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .invoice-table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              border: 1px solid #d1d5db;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .invoice-table td {
              padding: 12px;
              border: 1px solid #d1d5db;
              font-size: 12px;
            }
            
            .invoice-table tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .summary-section {
              background: #f8fafc;
              padding: 30px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            
            .summary-section h3 {
              margin: 0 0 20px 0;
              color: #374151;
              text-align: center;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 30px;
            }
            
            .summary-box {
              text-align: center;
              padding: 20px;
              border-radius: 8px;
              color: white;
            }
            
            .summary-box.blue {
              background: #3b82f6;
            }
            
            .summary-box.green {
              background: #22c55e;
            }
            
            .summary-box.red {
              background: #ef4444;
            }
            
            .summary-box label {
              display: block;
              margin-bottom: 10px;
              font-size: 14px;
              font-weight: 600;
            }
            
            .summary-box p {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            
            .footer {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              padding-top: 30px;
              border-top: 1px solid #d1d5db;
              margin-top: 30px;
            }
            
            .footer h4 {
              margin: 0 0 10px 0;
              color: #374151;
              font-size: 14px;
            }
            
            .footer p {
              margin: 5px 0;
              color: #6b7280;
              font-size: 12px;
            }
            
            @media print {
              .download-btn {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <div class="company-info">
              <img src="/soltrack_logo.png" alt="Soltrack Logo" class="company-logo" />
              <div class="company-details">
                <h2>${invoiceReportData.company.name}</h2>
                <p>${invoiceReportData.company.tagline}</p>
                <p>Reg No: ${invoiceReportData.company.regNo}</p>
                <p>VAT No: ${invoiceReportData.company.vatNo}</p>
              </div>
            </div>
            <div class="invoice-header">
              <h3>${invoiceReportData.invoice.type.toUpperCase()}: ${invoiceReportData.invoice.number}</h3>
              <p>Date: ${invoiceReportData.invoice.date}</p>
            </div>
          </div>
          
          <div class="invoice-header">
            <h3>Invoice Information</h3>
            <div class="invoice-grid">
              <div>
                <label>Account:</label>
                <p>${invoiceReportData.client.accountNumber}</p>
              </div>
              <div>
                <label>Cost Center:</label>
                <p>${invoiceReportData.client.costCenter}</p>
              </div>
              <div>
                <label>Client:</label>
                <p>${invoiceReportData.client.name}</p>
              </div>
              <div>
                <label>Invoice Date:</label>
                <p>${invoiceReportData.invoice.date}</p>
              </div>
            </div>
          </div>
          
          <div class="notes-section">
            <h3>Notes</h3>
            <p>FOR ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} ANNUITY BILLING RUN</p>
          </div>
          
          <div class="table-section">
            <h3>Vehicle Invoices</h3>
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>Previous Reg</th>
                  <th>New Reg</th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Comments</th>
                  <th>Units</th>
                  <th>Unit Price</th>
                  <th>Vat</th>
                  <th>Vat%</th>
                  <th>Total Incl</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleInvoices.map((invoice, index) => {
                  const exVat = parseFloat(invoice.total_ex_vat) || 0;
                  const vat = parseFloat(invoice.total_vat) || 0;
                  const inclVat = parseFloat(invoice.total_incl_vat) || 0;
                  const vatPercentage = exVat > 0 ? ((vat / exVat) * 100).toFixed(2) : '15.00';
                  
                  return `
                    <tr>
                      <td>${invoice.doc_no || '-'}</td>
                      <td>${invoice.new_account_number || '-'}</td>
                      <td>${invoice.stock_code || '-'}</td>
                      <td>${invoice.stock_description || '-'}</td>
                      <td>-</td>
                      <td>1</td>
                      <td>${formatCurrency(exVat)}</td>
                      <td>${formatCurrency(vat)}</td>
                      <td>${vatPercentage}%</td>
                      <td>${formatCurrency(inclVat)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="summary-section">
            <h3>Invoice Summary</h3>
            <div class="summary-grid">
              <div class="summary-box blue">
                <label>Total Ex. VAT</label>
                <p>${formatCurrency(totals.totalExVat)}</p>
              </div>
              <div class="summary-box green">
                <label>VAT</label>
                <p>${formatCurrency(totals.totalVat)}</p>
              </div>
              <div class="summary-box red">
                <label>Total Incl. VAT</label>
                <p>${formatCurrency(totals.totalInclVat)}</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div>
              <h4>Head Office:</h4>
              <p>8 Viscount Road</p>
              <p>Viscount office park, Block C unit 4 & 5</p>
              <p>Bedfordview, 2008</p>
            </div>
            <div>
              <h4>Postal Address:</h4>
              <p>P.O Box 95603</p>
              <p>Grant Park 2051</p>
            </div>
            <div>
              <h4>Contact Details:</h4>
              <p>Phone: 011 824 0066</p>
              <p>Email: sales@soltrack.co.za</p>
              <p>Website: www.soltrack.co.za</p>
            </div>
            <div>
              <h4>Soltrack (PTY) LTD:</h4>
              <p>Nedbank Northrand</p>
              <p>Code - 146905</p>
              <p>A/C No. - 1469109069</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = function() {
      printWindow.print();
      // Close the window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
  };

  return (
    <div className="w-full">
      <div className="space-y-6 p-4">
        {/* Company Header with Download Button */}
        <div className="flex justify-between items-start pb-4 border-b">
          <div className="flex items-start gap-4">
            <Image 
              src="/soltrack_logo.png" 
              alt="Soltrack Logo" 
              width={192}
              height={192}
            />
            <div>
              <h2 className="font-bold text-blue-600 text-xl">
                {invoiceReportData.company.name}
              </h2>
              <p className="text-gray-600 text-sm">{invoiceReportData.company.tagline}</p>
              <p className="text-gray-500 text-xs">Reg No: {invoiceReportData.company.regNo}</p>
              <p className="text-gray-500 text-xs">VAT No: {invoiceReportData.company.vatNo}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="font-semibold">{invoiceReportData.invoice.type.toUpperCase()}: {invoiceReportData.invoice.number}</p>
              <p className="text-gray-600 text-sm">Date: {invoiceReportData.invoice.date}</p>
            </div>
            <Button
              onClick={printReport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
            >
              <Download className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Invoice Header Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-800">Invoice Information</h3>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div>
              <label className="block font-medium text-gray-700 text-sm">Account:</label>
              <p className="font-semibold text-gray-900 text-sm">{invoiceReportData.client.accountNumber}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">Cost Center:</label>
              <p className="text-gray-900 text-sm">{invoiceReportData.client.costCenter}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">Client:</label>
              <p className="text-gray-900 text-sm">{invoiceReportData.client.name}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">Invoice Date:</label>
              <p className="text-gray-900 text-sm">{invoiceReportData.invoice.date}</p>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
          <h3 className="mb-3 font-semibold text-gray-800">Notes</h3>
          <p className="text-gray-700 text-sm">
            FOR {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} ANNUITY BILLING RUN
          </p>
        </div>

        {/* Vehicle Invoices Table */}
        <div>
          <h3 className="mb-4 font-semibold text-gray-800">Vehicle Invoices</h3>
          <div className="overflow-x-auto">
            <table className="border border-gray-300 w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Previous Reg</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">New Reg</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Item Code</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Description</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Comments</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">Units</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Unit Price</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Vat</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">Vat%</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Total Incl</th>
                </tr>
              </thead>
              <tbody>
                {vehicleInvoices.map((invoice, index) => {
                  const exVat = parseFloat(invoice.total_ex_vat) || 0;
                  const vat = parseFloat(invoice.total_vat) || 0;
                  const inclVat = parseFloat(invoice.total_incl_vat) || 0;
                  const vatPercentage = exVat > 0 ? ((vat / exVat) * 100).toFixed(2) : '15.00';
                  
                  return (
                    <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3 border border-gray-300 text-sm">{invoice.doc_no || '-'}</td>
                      <td className="p-3 border border-gray-300 text-sm">{invoice.new_account_number || '-'}</td>
                      <td className="p-3 border border-gray-300 text-sm">{invoice.stock_code || '-'}</td>
                      <td className="p-3 border border-gray-300 text-sm">{invoice.stock_description || '-'}</td>
                      <td className="p-3 border border-gray-300 text-sm">-</td>
                      <td className="p-3 border border-gray-300 text-sm text-center">1</td>
                      <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(exVat)}</td>
                      <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(vat)}</td>
                      <td className="p-3 border border-gray-300 text-sm text-center">{vatPercentage}%</td>
                      <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(inclVat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="bg-gray-50 p-6 border border-gray-200 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-800">Invoice Summary</h3>
          <div className="gap-6 grid grid-cols-3">
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Total Ex. VAT</label>
              <p className="font-bold text-blue-600 text-2xl">{formatCurrency(totals.totalExVat)}</p>
            </div>
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">VAT</label>
              <p className="font-bold text-green-600 text-2xl">{formatCurrency(totals.totalVat)}</p>
            </div>
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Total Incl. VAT</label>
              <p className="font-bold text-red-600 text-2xl">{formatCurrency(totals.totalInclVat)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-4 pt-4 border-t text-gray-600 text-xs">
          <div>
            <h4 className="font-medium text-gray-800">Head Office:</h4>
            <p>8 Viscount Road</p>
            <p>Viscount office park, Block C unit 4 & 5</p>
            <p>Bedfordview, 2008</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Postal Address:</h4>
            <p>P.O Box 95603</p>
            <p>Grant Park 2051</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Contact Details:</h4>
            <p>Phone: 011 824 0066</p>
            <p>Email: sales@soltrack.co.za</p>
            <p>Website: www.soltrack.co.za</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Soltrack (PTY) LTD:</h4>
            <p>Nedbank Northrand</p>
            <p>Code - 146905</p>
            <p>A/C No. - 1469109069</p>
          </div>
        </div>
      </div>
    </div>
  );
}
