"use client";

import React from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';


export default function DueReportComponent({ costCenter, clientLegalName, paymentData }) {

  // Due report data structure using payments table data
  const dueReportData = {
    company: {
      name: "Soltrack (PTY) LTD",
      regNo: "2018/095975/07",
      vatNo: "4580161802",
      tagline: "VEHICLE BUREAU SERVICE"
    },
    client: {
      name: clientLegalName || "Client Name",
      accountNumber: costCenter?.accountNumber || "N/A",
      costCenter: costCenter?.accountName || "N/A",
      vatNumber: "4290137910"
    },
    statement: {
      number: `STMT-${costCenter?.accountNumber || 'N/A'}`,
      date: new Date().toLocaleDateString(),
      type: "Debtor Statement"
    },
    // Transaction details from payments table
    transactions: [
      {
        date: paymentData?.created_at ? new Date(paymentData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        client: clientLegalName || "Client Name",
        invoiceNo: paymentData?.payment_reference || `INV-${costCenter?.accountNumber || 'N/A'}`,
        totalInvoiced: costCenter?.monthlyAmount || 0,
        paid: Math.max(0, (costCenter?.monthlyAmount || 0) - (paymentData?.amount_due || 0)),
        credited: 0,
        outstanding: paymentData?.amount_due || 0
      }
    ],
    // Aging analysis using payments table data
    aging: [
      {
        period: "120 Days",
        amount: 0.00,
        status: "Current"
      },
      {
        period: "90 Days",
        amount: 0.00,
        status: "Current"
      },
      {
        period: "60 Days",
        amount: 0.00,
        status: "Current"
      },
      {
        period: "30 Days",
        amount: paymentData?.first_month || 0,
        status: "Due Soon"
      },
      {
        period: "Current",
        amount: paymentData?.amount_due || 0,
        status: "Outstanding"
      }
    ],
    totals: {
      totalOutstanding: paymentData?.amount_due || 0,
      totalMonthly: costCenter?.monthlyAmount || 0,
      totalPaid: Math.max(0, (costCenter?.monthlyAmount || 0) - (paymentData?.amount_due || 0)),
      amountDue: paymentData?.amount_due || 0
    }
  };

  // Function to calculate overdue distribution across months
  const calculateOverdueDistribution = () => {
    const amountDue = paymentData?.amount_due || 0;
    if (amountDue > 0) {
      // Distribute amount due across months
      dueReportData.aging[0].amount = amountDue * 0.4; // 120 days
      dueReportData.aging[1].amount = amountDue * 0.3; // 90 days
      dueReportData.aging[2].amount = amountDue * 0.2; // 60 days
      dueReportData.aging[3].amount = amountDue * 0.1; // 30 days
    }
  };

  // Calculate overdue distribution
  calculateOverdueDistribution();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  // Print Report function using browser print
  const printReport = () => {
    // Create a new window with the content
    const printWindow = window.open('', '_blank');
    
    // Create the print HTML with proper styling
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Due Report - ${costCenter?.accountNumber}</title>
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
            
            .statement-header {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #d1d5db;
              margin-bottom: 20px;
            }
            
            .statement-header h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .info-section {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #d1d5db;
              margin-bottom: 20px;
            }
            
            .info-section h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            
            .info-grid label {
              font-weight: 600;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .info-grid p {
              margin: 5px 0;
              color: #111827;
              font-weight: 600;
            }
            
            .table-section h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .due-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .due-table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              border: 1px solid #d1d5db;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .due-table td {
              padding: 12px;
              border: 1px solid #d1d5db;
              font-size: 12px;
            }
            
            .due-table tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .total-outstanding {
              background: #fef3c7;
              padding: 20px;
              border: 2px solid #f59e0b;
              border-radius: 8px;
              margin-bottom: 30px;
              text-align: center;
            }
            
            .total-outstanding h3 {
              margin: 0 0 15px 0;
              color: #92400e;
            }
            
            .total-outstanding p {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
              color: #92400e;
            }
            
            .aging-section {
              background: #f8fafc;
              padding: 20px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            
            .aging-section h3 {
              margin: 0 0 15px 0;
              color: #374151;
            }
            
            .aging-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .aging-table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: center;
              border: 1px solid #d1d5db;
              font-weight: 600;
              font-size: 12px;
            }
            
            .aging-table td {
              padding: 12px;
              border: 1px solid #d1d5db;
              font-size: 12px;
              text-align: center;
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
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            
            .summary-box {
              text-align: center;
              padding: 20px;
              border-radius: 8px;
              color: white;
            }
            
            .summary-box.red {
              background: #ef4444;
            }
            
            .summary-box.green {
              background: #22c55e;
            }
            
            .summary-box.blue {
              background: #3b82f6;
            }
            
            .summary-box.yellow {
              background: #f59e0b;
              color: #000;
            }
            
            .summary-box label {
              display: block;
              margin-bottom: 10px;
              font-size: 14px;
              font-weight: 600;
            }
            
            .summary-box p {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
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
                <h2>${dueReportData.company.name}</h2>
                <p>${dueReportData.company.tagline}</p>
                <p>Reg No: ${dueReportData.company.regNo}</p>
                <p>VAT No: ${dueReportData.company.vatNo}</p>
              </div>
            </div>
            <div class="statement-header">
              <h3>${dueReportData.statement.type.toUpperCase()}: ${dueReportData.statement.number}</h3>
              <p>Date: ${dueReportData.statement.date}</p>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Account Header Section</h3>
            <div class="info-grid">
              <div>
                <label>Account:</label>
                <p>${dueReportData.client.accountNumber}</p>
              </div>
              <div>
                <label>Your Reference:</label>
                <p>${dueReportData.client.costCenter}</p>
              </div>
              <div>
                <label>VAT %:</label>
                <p>15%</p>
              </div>
              <div>
                <label>Customer VAT Number:</label>
                <p>${dueReportData.client.vatNumber}</p>
              </div>
            </div>
          </div>
          
          <div class="table-section">
            <h3>Transaction Details Table</h3>
            <table class="due-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Invoice No.</th>
                  <th>Total Invoiced</th>
                  <th>Paid</th>
                  <th>Credited</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                ${dueReportData.transactions.map((transaction, index) => `
                  <tr>
                    <td>${transaction.date}</td>
                    <td>${transaction.client}</td>
                    <td>${transaction.invoiceNo}</td>
                    <td>${formatCurrency(transaction.totalInvoiced)}</td>
                    <td>${formatCurrency(transaction.paid)}</td>
                    <td>${formatCurrency(transaction.credited)}</td>
                    <td>${formatCurrency(transaction.outstanding)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="total-outstanding">
            <h3>Total Outstanding</h3>
            <p>${formatCurrency(dueReportData.totals.totalOutstanding)}</p>
          </div>
          
          <div class="aging-section">
            <h3>Aging Analysis</h3>
            <table class="aging-table">
              <thead>
                <tr>
                  <th>120 Days</th>
                  <th>90 Days</th>
                  <th>60 Days</th>
                  <th>30 Days</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${dueReportData.aging.map(item => `<td>${formatCurrency(item.amount)}</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="summary-section">
            <h3>Payment Status Summary</h3>
            <div class="summary-grid">
              <div class="summary-box red">
                <label>Amount Due</label>
                <p>${formatCurrency(dueReportData.totals.amountDue)}</p>
                <p class="font-medium text-sm" style="color: ${dueReportData.totals.amountDue > 0 ? '#dc2626' : '#16a34a'}">
                  ${dueReportData.totals.amountDue > 0 ? 'Due / Not Paid' : 'Paid in Full'}
                </p>
              </div>
              <div class="summary-box green">
                <label>Total Paid</label>
                <p>${formatCurrency(dueReportData.totals.totalPaid)}</p>
                <p class="font-medium text-sm" style="color: ${dueReportData.totals.totalPaid > 0 ? '#16a34a' : '#dc2626'}">
                  ${dueReportData.totals.totalPaid > 0 ? 'Paid' : 'Not Paid'}
                </p>
              </div>
              <div class="summary-box blue">
                <label>Monthly Amount</label>
                <p>${formatCurrency(dueReportData.totals.totalMonthly)}</p>
              </div>
              <div class="summary-box yellow">
                <label>Outstanding</label>
                <p>${formatCurrency(dueReportData.totals.totalOutstanding)}</p>
              </div>
            </div>
          </div>
          
          <div class="notes-section">
            <h3>Notes</h3>
            <p>${dueReportData.totals.amountDue > 0 
              ? `Amount due of ${formatCurrency(dueReportData.totals.amountDue)} requires immediate attention. Total paid: ${formatCurrency(dueReportData.totals.totalPaid)}.`
              : 'All amounts have been paid in full. Thank you for your prompt payment.'}</p>
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
              <h2 className="font-bold text-blue-600 text-xl">{dueReportData.company.name}</h2>
              <p className="text-gray-600 text-sm">{dueReportData.company.tagline}</p>
              <p className="text-gray-500 text-xs">Reg No: {dueReportData.company.regNo}</p>
              <p className="text-gray-500 text-xs">VAT No: {dueReportData.company.vatNo}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="font-semibold">{dueReportData.statement.type.toUpperCase()}: {dueReportData.statement.number}</p>
              <p className="text-gray-600 text-sm">Date: {dueReportData.statement.date}</p>
            </div>
            <Button
              onClick={printReport}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white"
            >
              <Download className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Account Header Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-800">Account Header Section</h3>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div>
              <label className="block font-medium text-gray-700 text-sm">Account:</label>
              <p className="font-semibold text-gray-900 text-sm">{dueReportData.client.accountNumber}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">Your Reference:</label>
              <p className="text-gray-900 text-sm">{dueReportData.client.costCenter}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">VAT %:</label>
              <p className="text-gray-900 text-sm">15%</p>
            </div>
            <div>
              <label className="block font-medium text-gray-700 text-sm">Customer VAT Number:</label>
              <p className="text-gray-900 text-sm">{dueReportData.client.vatNumber}</p>
            </div>
          </div>
        </div>

        {/* Transaction Details Table */}
        <div>
          <h3 className="mb-4 font-semibold text-gray-800">Transaction Details Table</h3>
          <div className="overflow-x-auto">
            <table className="border border-gray-300 w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Date</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Client</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-left">Invoice No.</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Total Invoiced</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Paid</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Credited</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {dueReportData.transactions.map((transaction, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border border-gray-300 text-sm">{transaction.date}</td>
                    <td className="p-3 border border-gray-300 text-sm">{transaction.client}</td>
                    <td className="p-3 border border-gray-300 text-sm">{transaction.invoiceNo}</td>
                    <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(transaction.totalInvoiced)}</td>
                    <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(transaction.paid)}</td>
                    <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(transaction.credited)}</td>
                    <td className="p-3 border border-gray-300 text-sm text-right">{formatCurrency(transaction.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-yellow-100 p-6 border border-yellow-300 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-800">Total Outstanding</h3>
          <div className="text-center">
            <p className="font-bold text-yellow-800 text-3xl">{formatCurrency(dueReportData.totals.totalOutstanding)}</p>
          </div>
        </div>

        {/* Aging Analysis */}
        <div>
          <h3 className="mb-4 font-semibold text-gray-800">Aging Analysis</h3>
          <div className="overflow-x-auto">
            <table className="border border-gray-300 w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">120 Days</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">90 Days</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">60 Days</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">30 Days</th>
                  <th className="p-3 border border-gray-300 font-medium text-sm text-center">Current</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="p-3 border border-gray-300 text-sm text-center">{formatCurrency(dueReportData.aging[0].amount)}</td>
                  <td className="p-3 border border-gray-300 text-sm text-center">{formatCurrency(dueReportData.aging[1].amount)}</td>
                  <td className="p-3 border border-gray-300 text-sm text-center">{formatCurrency(dueReportData.aging[2].amount)}</td>
                  <td className="p-3 border border-gray-300 text-sm text-center">{formatCurrency(dueReportData.aging[3].amount)}</td>
                  <td className="p-3 border border-gray-300 text-sm text-center">{formatCurrency(dueReportData.aging[4].amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Status Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-800">Payment Status Summary</h3>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Amount Due</label>
              <p className="font-bold text-red-600 text-xl">{formatCurrency(dueReportData.totals.amountDue)}</p>
              <p className={`text-sm font-medium ${dueReportData.totals.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {dueReportData.totals.amountDue > 0 ? 'Due / Not Paid' : 'Paid in Full'}
              </p>
            </div>
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Total Paid</label>
              <p className="font-bold text-green-600 text-xl">{formatCurrency(dueReportData.totals.totalPaid)}</p>
              <p className={`text-sm font-medium ${dueReportData.totals.totalPaid > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dueReportData.totals.totalPaid > 0 ? 'Paid' : 'Not Paid'}
              </p>
            </div>
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Monthly Amount</label>
              <p className="font-bold text-blue-600 text-xl">{formatCurrency(dueReportData.totals.totalMonthly)}</p>
            </div>
            <div className="text-center">
              <label className="block mb-2 font-medium text-gray-700 text-sm">Outstanding</label>
              <p className="font-bold text-yellow-600 text-xl">{formatCurrency(dueReportData.totals.totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
          <h3 className="mb-3 font-semibold text-gray-800">Notes</h3>
          <p className="text-gray-700 text-sm">
            {dueReportData.totals.amountDue > 0 
              ? `Amount due of ${formatCurrency(dueReportData.totals.amountDue)} requires immediate attention. Total paid: ${formatCurrency(dueReportData.totals.totalPaid)}.`
              : 'All amounts have been paid in full. Thank you for your prompt payment.'
            }
          </p>
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
