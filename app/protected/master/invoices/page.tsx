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
    };

    const handleDownloadInvoice = async (invoice: Invoice) => {
        try {
            const response = await fetch(invoice.pdfUrl, { method: 'HEAD' });
            
            if (!response.ok) {
                throw new Error(`PDF not accessible: ${response.status} ${response.statusText}`);
            }
            
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

            setInvoices(prev => prev.map(inv => 
                inv.id === invoice.id ? { ...inv, approved: true } : inv
            ));

            toast({
                title: "Invoice Approved",
                description: `Invoice ${invoice.id} has been approved and moved to approved section.`,
                variant: "default"
            });

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
            <div className="flex justify-center items-center h-64">
                <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-gray-600">Loading invoices...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="font-bold text-gray-900 text-3xl">Invoice Management</h2>
                    <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors">
                        Create New Invoice
                    </button>
                </div>
                           
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
                                                    >
                                                        <Eye className="mr-1 w-3 h-3" />
                                                        View Invoice
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(invoice)}
                                                        className="inline-flex items-center bg-white hover:bg-gray-50 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-gray-700 text-xs"
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

            <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Invoice {selectedInvoice?.id}</DialogTitle>
                    </DialogHeader>
                    <div className="relative flex-1">
                        {selectedInvoice && (
                            <iframe
                                src={selectedInvoice.pdfUrl}
                                className="w-full h-full border-0"
                                title={`Invoice ${selectedInvoice.id}`}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}