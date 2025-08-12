"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, FileText, Home, UserCheck, Receipt, AlertCircle, Loader2 } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

export default function MasterDashboard() {
    const [invoiceStats, setInvoiceStats] = useState({
        totalInvoices: 0,
        unapprovedInvoicesCount: 0,
        loading: true
    });

    // Fetch invoice statistics from API
    const fetchInvoiceStats = async () => {
        try {
            setInvoiceStats(prev => ({ ...prev, loading: true }));
            
            // Fetch total invoices
            const totalResponse = await fetch('/api/invoices');
            const totalData = await totalResponse.json();
            
            // Fetch pending invoices
            const pendingResponse = await fetch('/api/invoices?status=pending');
            const pendingData = await pendingResponse.json();
            
            setInvoiceStats({
                totalInvoices: totalData.count || 0,
                unapprovedInvoicesCount: pendingData.count || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching invoice stats:', error);
            setInvoiceStats(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchInvoiceStats();
    }, []);

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
                        <Link href="/protected/master/users" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
                            <Users className="mr-3 w-5 h-5" />
                            Users
                        </Link>
                        <Link href="/protected/master/invoices" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
                            <FileText className="mr-3 w-5 h-5" />
                            Invoices
                            {invoiceStats.unapprovedInvoicesCount > 0 && (
                                <span className="bg-orange-100 ml-auto px-2 py-1 rounded-full font-medium text-orange-800 text-xs">
                                    {invoiceStats.unapprovedInvoicesCount}
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
                    <h2 className="mb-8 font-bold text-gray-900 text-3xl">Master Control Center</h2>
                    <p className="mb-8 text-gray-600">Welcome to the system administration dashboard. Manage schedules, users, and system settings.</p>

                    {/* Stats Cards */}
                    <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-8">
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Invoices</p>
                                    {invoiceStats.loading ? (
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                            <span className="text-gray-400">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className="font-bold text-gray-900 text-2xl">{invoiceStats.totalInvoices}</p>
                                    )}
                                </div>
                                <div className="bg-blue-50 p-3 rounded-full">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Technicians</p>
                                    <p className="font-bold text-gray-900 text-2xl">8</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-full">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Pending Approval</p>
                                    {invoiceStats.loading ? (
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                                            <span className="text-gray-400">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className="font-bold text-orange-600 text-2xl">{invoiceStats.unapprovedInvoicesCount}</p>
                                    )}
                                </div>
                                <div className="bg-orange-50 p-3 rounded-full">
                                    <AlertCircle className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white shadow-sm p-6 border rounded-lg">
                        <h3 className="mb-4 font-semibold text-gray-900 text-lg">Quick Actions</h3>
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            <Link href="/protected/admin/schedule" className="flex items-center hover:bg-blue-50 p-4 border rounded-lg transition-colors">
                                <Home className="mr-4 w-8 h-8 text-blue-600" />
                                <div>
                                    <h4 className="font-medium text-gray-900">Schedule Management</h4>
                                    <p className="text-gray-600 text-sm">Manage job schedules and technician assignments</p>
                                </div>
                            </Link>
                            <Link href="/protected/master/users" className="flex items-center hover:bg-blue-50 p-4 border rounded-lg transition-colors">
                                <UserCheck className="mr-4 w-8 h-8 text-blue-600" />
                                <div>
                                    <h4 className="font-medium text-gray-900">User Management</h4>
                                    <p className="text-gray-600 text-sm">Manage users, roles, and permissions</p>
                                </div>
                            </Link>
                            <Link href="/protected/master/invoices" className="flex items-center hover:bg-blue-50 p-4 border rounded-lg transition-colors">
                                <Receipt className="mr-4 w-8 h-8 text-blue-600" />
                                <div>
                                    <h4 className="font-medium text-gray-900">Invoice Management</h4>
                                    <p className="text-gray-600 text-sm">View and manage system invoices</p>
                                </div>
                            </Link>
                            <Link href="/protected/master/stock-orders" className="flex items-center hover:bg-blue-50 p-4 border rounded-lg transition-colors">
                                <FileText className="mr-4 w-8 h-8 text-blue-600" />
                                <div>
                                    <h4 className="font-medium text-gray-900">Stock Orders Management</h4>
                                    <p className="text-gray-600 text-sm">Manage stock orders and approvals</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}