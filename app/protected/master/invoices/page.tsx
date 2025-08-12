"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, FileText, Home, Eye, Download, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Define invoice type
interface Invoice {
    id: string;
    client: string;
    amount: number;
    date: string;
    approved: boolean;
    dueDate: string;
    pdfUrl: string;
    orderId: number;
    totalAmountUSD?: number;
    orderItems?: Record<string, unknown>[];
}

export default function InvoicesPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<string | null>(null);
    const { toast } = useToast();

    const pendingInvoices = invoices.filter(invoice => !invoice.approved);
    const approvedInvoices = invoices.filter(invoice => invoice.approved);

    // Fetch invoices from API
    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/invoices');
            
            if (!response.ok) {
                throw new Error('Failed to fetch invoices');
            }
            
            const data = await response.json();
            setInvoices(data.invoices || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast({
                title: "Error",
                description: "Failed to load invoices. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowPdfViewer(true);
        
        // Add a small delay to ensure the iframe is rendered, then check for PDF loading issues
        setTimeout(() => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
                iframe.onload = () => {
                    // Hide error overlay if PDF loads successfully
                    const errorOverlay = document.getElementById('pdf-error-overlay');
                    if (errorOverlay) {
                        errorOverlay.style.display = 'none';
                    }
                };
                
                iframe.onerror = () => {
                    // Show error overlay if PDF fails to load
                    const errorOverlay = document.getElementById('pdf-error-overlay');
                    if (errorOverlay) {
                        errorOverlay.style.display = 'flex';
                    }
                };
                
                // Check if PDF is accessible
                fetch(invoice.pdfUrl, { method: 'HEAD' })
                    .then(response => {
                        if (!response.ok) {
                            // Show error overlay if PDF is not accessible
                            const errorOverlay = document.getElementById('pdf-error-overlay');
                            if (errorOverlay) {
                                errorOverlay.style.display = 'flex';
                            }
                        }
                    })
                    .catch(() => {
                        // Show error overlay if fetch fails
                        const errorOverlay = document.getElementById('pdf-error-overlay');
                        if (errorOverlay) {
                            errorOverlay.style.display = 'flex';
                        }
                    });
            }
        }, 100);
    };

    const handleDownloadInvoice = async (invoice: Invoice) => {
        try {
            // Check if the PDF URL is accessible
            const response = await fetch(invoice.pdfUrl, { method: 'HEAD' });
            
            if (!response.ok) {
                throw new Error(`PDF not accessible: ${response.status} ${response.statusText}`);
            }
            
            // If accessible, proceed with download
            const link = document.createElement('a');
            link.href = invoice.pdfUrl;
            link.download = `invoice-${invoice.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
                title: "Download Started",
                description: `Invoice ${invoice.id} is being downloaded.`,
                variant: "default"
            });
        } catch (error) {
            console.error('Error downloading invoice:', error);
            
            // Show error message with helpful information
            toast({
                title: "Download Failed",
                description: "The PDF file is not accessible. This may be due to storage configuration issues. Please contact your administrator.",
                variant: "destructive"
            });
        }
    };

    const handleApproveInvoice = async (invoice: Invoice) => {
        try {
            setApproving(invoice.id);
            
            const response = await fetch('/api/invoices', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: invoice.orderId,
                    status: 'approved'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve invoice');
            }

            // Update local state
            setInvoices(prev => prev.map(inv => 
                inv.id === invoice.id ? { ...inv, approved: true } : inv
            ));

            toast({
                title: "Invoice Approved",
                description: `Invoice ${invoice.id} has been approved and moved to approved section.`,
                variant: "default"
            });

            // Refresh data to ensure consistency
            await fetchInvoices();
            
        } catch (error) {
            console.error('Error approving invoice:', error);
            toast({
                title: "Error",
                description: "Failed to approve invoice. Please try again.",
                variant: "destructive"
            });
        } finally {
            setApproving(null);
        }
    };

    const getStatusBadge = (approved: boolean) => {
        if (approved) {
            return (
                <Badge className="bg-green-100 hover:bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 w-3 h-3" />
                    Approved
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-orange-100 hover:bg-orange-100 text-orange-800">
                    <Clock className="mr-1 w-3 h-3" />
                    Pending
                </Badge>
            );
        }
    };

    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const approvedAmount = approvedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    if (loading) {
        return (
            <div className="flex bg-gray-50 min-h-screen">
                <div className="bg-white shadow-lg w-64">
                    <div className="p-6 border-b">
                        <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
                    </div>
                    <nav className="mt-6">
                        <div className="space-y-2 px-4">
                            <Link href="/protected/master" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <Home className="mr-3 w-5 h-5" />
                                Home
                            </Link>
                            <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <Users className="mr-3 w-5 h-5" />
                                Users
                            </Link>
                            <Link href="/protected/master/invoices" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
                                <FileText className="mr-3 w-5 h-5" />
                                Invoices
                            </Link>
                            <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                                <LogoutButton />
                            </div>
                        </div>
                    </nav>
                </div>
                <div className="flex-1 p-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex justify-center items-center h-64">
                            <div className="flex items-center space-x-2">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                <span className="text-gray-600">Loading invoices...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Sidebar */}
            <div className="bg-white shadow-lg w-64">
                <div className="p-6 border-b">
                    <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
                </div>
                <nav className="mt-6">
                    <div className="space-y-2 px-4">
                        <Link href="/protected/master" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <Home className="mr-3 w-5 h-5" />
                            Home
                        </Link>
                        <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <Users className="mr-3 w-5 h-5" />
                            Users
                        </Link>
                        <Link href="/protected/master/invoices" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
                            <FileText className="mr-3 w-5 h-5" />
                            Invoices
                            {pendingInvoices.length > 0 && (
                                <span className="bg-orange-100 ml-auto px-2 py-1 rounded-full font-medium text-orange-800 text-xs">
                                    {pendingInvoices.length}
                                </span>
                            )}
                        </Link>
                        <Link href="/protected/master/stock-orders" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <FileText className="mr-3 w-5 h-5" />
                            Stock Orders
                        </Link>
                        <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <LogoutButton />
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="mx-auto max-w-7xl">
                                               <div className="flex justify-between items-center mb-8">
                               <h2 className="font-bold text-gray-900 text-3xl">Invoice Management</h2>
                               <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors">
                                   Create New Invoice
                               </button>
                           </div>
                           
                           {/* PDF Access Notice */}
                           <div className="bg-amber-50 mb-6 p-4 border border-amber-200 rounded-lg">
                               <div className="flex items-start">
                                   <AlertCircle className="flex-shrink-0 mt-0.5 mr-3 w-5 h-5 text-amber-600" />
                                   <div>
                                       <h3 className="font-medium text-amber-800">PDF Access Notice</h3>
                                       <p className="mt-1 text-amber-700 text-sm">
                                           Some invoices may not be accessible due to storage configuration. If you encounter PDF viewing issues, 
                                           try the download option or contact your administrator to check the Supabase Storage bucket configuration.
                                       </p>
                                   </div>
                               </div>
                           </div>

                    {/* Invoice Stats */}
                    <div className="gap-6 grid grid-cols-1 md:grid-cols-4 mb-8">
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Total Invoices</h3>
                            <p className="font-bold text-gray-900 text-2xl">{invoices.length}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Total Amount</h3>
                            <p className="font-bold text-gray-900 text-2xl">R{totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Pending Approval</h3>
                            <p className="font-bold text-orange-600 text-2xl">{pendingInvoices.length}</p>
                        </div>
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <h3 className="text-gray-600 text-sm">Approved Amount</h3>
                            <p className="font-bold text-green-600 text-2xl">R{approvedAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
                        <div className="border-b">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className={`px-6 py-4 font-medium text-sm transition-colors ${
                                        activeTab === 'pending'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Pending Approval ({pendingInvoices.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('approved')}
                                    className={`px-6 py-4 font-medium text-sm transition-colors ${
                                        activeTab === 'approved'
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Approved ({approvedInvoices.length})
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Invoices Table */}
                            <div className="overflow-x-auto">
                                <table className="divide-y divide-gray-200 min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Invoice ID
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Client
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(activeTab === 'pending' ? pendingInvoices : approvedInvoices).map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 text-sm">{invoice.id}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-gray-900 text-sm">{invoice.client}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 text-sm">R{invoice.amount.toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-gray-500 text-sm">{invoice.date}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(invoice.approved)}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-sm whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                                                                                       <button
                                                                   onClick={() => handleViewInvoice(invoice)}
                                                                   className="inline-flex items-center bg-blue-600 hover:bg-blue-700 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-white text-xs"
                                                                   title={invoice.pdfUrl.includes('dummy.pdf') ? 'PDF not available - will show error message' : 'View invoice PDF'}
                                                               >
                                                                   <Eye className="mr-1 w-3 h-3" />
                                                                   View Invoice
                                                               </button>
                                                               <button
                                                                   onClick={() => handleDownloadInvoice(invoice)}
                                                                   className="inline-flex items-center bg-white hover:bg-gray-50 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-gray-700 text-xs"
                                                                   title={invoice.pdfUrl.includes('dummy.pdf') ? 'PDF not available - will show error message' : 'Download invoice PDF'}
                                                               >
                                                                   <Download className="mr-1 w-3 h-3" />
                                                                   Download
                                                               </button>
                                                        {!invoice.approved && (
                                                            <button
                                                                onClick={() => handleApproveInvoice(invoice)}
                                                                disabled={approving === invoice.id}
                                                                className="inline-flex items-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium text-white text-xs"
                                                            >
                                                                {approving === invoice.id ? (
                                                                    <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="mr-1 w-3 h-3" />
                                                                )}
                                                                {approving === invoice.id ? 'Approving...' : 'Approve'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {invoices.length === 0 && (
                                <div className="py-12 text-center">
                                    <FileText className="mx-auto w-12 h-12 text-gray-400" />
                                    <h3 className="mt-2 font-medium text-gray-900 text-sm">No invoices found</h3>
                                    <p className="mt-1 text-gray-500 text-sm">
                                        Get started by creating your first invoice.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF Viewer Modal */}
            <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Invoice: {selectedInvoice?.id} - {selectedInvoice?.client}</span>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectedInvoice && handleDownloadInvoice(selectedInvoice)}
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
                               {selectedInvoice && (
                                   <div className="w-full h-full">
                                       <div className="relative">
                                           <iframe
                                               src={selectedInvoice.pdfUrl}
                                               className="border-0 w-full h-full min-h-[600px]"
                                               title={`Invoice ${selectedInvoice.id}`}
                                               onError={() => {
                                                   toast({
                                                       title: "PDF Error",
                                                       description: "Unable to load PDF. Please try downloading instead.",
                                                       variant: "destructive"
                                                   });
                                               }}
                                           />
                                           {/* Error overlay for PDF loading issues */}
                                           <div className="absolute inset-0 flex justify-center items-center bg-gray-100" id="pdf-error-overlay" style={{ display: 'none' }}>
                                               <div className="p-6 text-center">
                                                   <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                                                   <h3 className="mb-2 font-medium text-gray-900 text-lg">PDF Not Accessible</h3>
                                                   <p className="mb-4 text-gray-600">
                                                       The PDF file could not be loaded. This may be due to storage configuration issues.
                                                   </p>
                                                   <div className="flex justify-center gap-2">
                                                       <Button
                                                           variant="outline"
                                                           onClick={() => {
                                                               // Try to reload the iframe
                                                               const iframe = document.querySelector('iframe');
                                                               if (iframe) {
                                                                   iframe.src = iframe.src;
                                                                   document.getElementById('pdf-error-overlay')?.style.setProperty('display', 'none');
                                                               }
                                                           }}
                                                       >
                                                           Retry
                                                       </Button>
                                                       <Button
                                                           onClick={() => selectedInvoice && handleDownloadInvoice(selectedInvoice)}
                                                       >
                                                           Download Instead
                                                       </Button>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                       <div className="bg-gray-50 mt-4 p-4 rounded-lg">
                                           <p className="text-gray-600 text-sm">
                                               <strong>Amount:</strong> R{selectedInvoice.amount.toLocaleString()}
                                           </p>
                                           <p className="text-gray-600 text-sm">
                                               <strong>Date:</strong> {selectedInvoice.date}
                                           </p>
                                           <p className="text-gray-600 text-sm">
                                               <strong>Status:</strong> {selectedInvoice.approved ? 'Approved' : 'Pending Approval'}
                                           </p>
                                           {selectedInvoice.totalAmountUSD && (
                                               <p className="text-gray-600 text-sm">
                                                   <strong>USD Amount:</strong> ${selectedInvoice.totalAmountUSD.toLocaleString()}
                                               </p>
                                           )}
                                       </div>
                                   </div>
                               )}
                           </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}