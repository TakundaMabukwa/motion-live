"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import MasterSidebar from '@/components/shared/MasterSidebar';

type ApiUser = {
    id: string;
    email: string;
    role?: string | null;
    tech_admin?: boolean | null;
    energyrite?: boolean | null;
    cost_code?: string | null;
    company?: string | null;
    created_at?: string | null;
};

export default function MasterDashboard() {
    const [invoiceStats, setInvoiceStats] = useState({
        totalInvoices: 0,
        unapprovedInvoicesCount: 0,
        loading: true
    });

    const [users, setUsers] = useState<ApiUser[] | null>(null);
    const [usersLoading, setUsersLoading] = useState<boolean>(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState<boolean>(false);
    // Toast state
    const [toastOpen, setToastOpen] = useState(false);
    const [toastTitle, setToastTitle] = useState('');
    const [toastDesc, setToastDesc] = useState<string | undefined>(undefined);
    const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('info');

    const showToast = (opts: { title: string; description?: string; variant?: 'success' | 'error' | 'info' }) => {
        setToastTitle(opts.title);
        setToastDesc(opts.description);
        setToastVariant(opts.variant ?? 'info');
        setToastOpen(false);
        // small delay to retrigger same message
        setTimeout(() => setToastOpen(true), 10);
    };

    useEffect(() => {
        let mounted = true;
        const fetchUsers = async () => {
            try {
                setUsersLoading(true);
                const res = await fetch('/api/master/users');
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                if (mounted) setUsers(data.users || []);
            } catch (err: unknown) {
                console.error('Error fetching users:', err);
                const message = err instanceof Error ? err.message : String(err);
                if (mounted) setUsersError(message || 'Error');
            } finally {
                if (mounted) setUsersLoading(false);
            }
        };

        fetchUsers();

        return () => { mounted = false; };
    }, []);

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
        <>
        <div className="flex bg-gray-50 min-h-screen">
            <MasterSidebar invoiceBadgeCount={invoiceStats.unapprovedInvoicesCount} />
            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="mx-auto max-w-7xl">
                    <h2 className="mb-4 font-bold text-gray-900 text-3xl">Master Control Center</h2>
                    <p className="mb-6 text-gray-600">Welcome to the system administration dashboard. Manage users and system settings.</p>

                    {/* Stats Cards */}
                    <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mb-8">
                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Users</p>
                                    {usersLoading ? (
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                                            <span className="text-gray-400">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className="font-bold text-gray-900 text-2xl">{users ? users.length : 0}</p>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        {users && (
                                            <>
                                                Admins: {users.filter(u => u.role === 'admin').length} · Tech admins: {users.filter(u => u.tech_admin).length} · Companies: {Array.from(new Set(users.map(u => u.company).filter(Boolean))).length}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-full">
                                    <Users className="w-6 h-6 text-gray-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm p-6 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Technicians</p>
                                    {usersLoading ? (
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                                            <span className="text-gray-400">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className="font-bold text-gray-900 text-2xl">{users ? users.filter(u => u.role === 'technician' || u.tech_admin).length : 0}</p>
                                    )}
                                </div>
                                <div className="bg-green-50 p-3 rounded-full">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All Users table */}
                    <div className="bg-white shadow-sm p-4 border rounded-lg mt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900 text-sm">All users <span className="text-gray-500 font-medium text-sm">{users ? users.length : '—'}</span></h3>
                            </div>

                            <div className="flex items-center flex-1 md:flex-none md:justify-end space-x-2">
                                <div className="flex items-center w-full md:w-64 border rounded-lg bg-gray-50 px-2 py-1">
                                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                                    <input placeholder="Search" className="bg-transparent outline-none text-sm w-full" />
                                </div>

                                <button className="flex items-center gap-2 px-2 py-1 border rounded-md text-sm text-gray-600 hover:bg-gray-50">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"/></svg>
                                    <span className="text-sm">Filters</span>
                                </button>

                                <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
                                    <Dialog.Trigger asChild>
                                        <button className="bg-black text-white px-2 py-1 rounded-md text-sm">Add user</button>
                                    </Dialog.Trigger>

                                    <Dialog.Portal>
                                        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                                        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
                                            <div className="flex items-start justify-between">
                                                <Dialog.Title className="text-lg font-semibold text-gray-900">Add user</Dialog.Title>
                                                <Dialog.Close className="text-gray-400 hover:text-gray-600 rounded-full p-1">✕</Dialog.Close>
                                            </div>

                                            <AddUserForm autoFocus={addOpen} onCreate={(newUser) => {
                                                // prepend to users for immediate UI update
                                                setUsers(prev => prev ? [newUser, ...prev] : [newUser]);
                                                setAddOpen(false);
                                                showToast({ title: 'User created', description: `${newUser.email} was created`, variant: 'success' });
                                            }} onNotify={(t: { title: string; description?: string; variant?: 'success'|'error'|'info' }) => showToast(t)} />
                                        </Dialog.Content>
                                    </Dialog.Portal>
                                </Dialog.Root>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-3 py-2 w-10 text-left text-xs text-gray-500">
                                            <input type="checkbox" className="h-3 w-3 text-blue-600 rounded border-gray-300" />
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Email</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Role</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Last active</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Cost_center</th>
                                        <th className="px-3 py-2 w-8" />
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usersLoading && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">Loading users...</td>
                                        </tr>
                                    )}

                                    {usersError && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-4 text-center text-sm text-red-600">{usersError}</td>
                                        </tr>
                                    )}

                                    {!usersLoading && !usersError && users && users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">No users found</td>
                                        </tr>
                                    )}

                                    {users && users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <input type="checkbox" className="h-3 w-3 text-blue-600 rounded border-gray-300" />
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 mr-3">
                                                        {user.email.split('@')[0].split('.').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{user.email.split('@')[0]}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.role ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100">{user.role}</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-100">No role</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{user.company ?? '—'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-400">⋮</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/* Toasts */}
        <Toast.Provider swipeDirection="right">
            <Toast.Root open={toastOpen} onOpenChange={setToastOpen} className={`bg-white border p-3 rounded shadow-sm ${toastVariant === 'error' ? 'border-red-200' : toastVariant === 'success' ? 'border-green-200' : 'border-gray-200'}`}>
                <Toast.Title className="font-medium text-sm">{toastTitle}</Toast.Title>
                {toastDesc && <Toast.Description className="text-xs text-gray-600">{toastDesc}</Toast.Description>}
                <Toast.Action asChild altText="Dismiss toast">
                    <button className="text-xs text-blue-600">Dismiss</button>
                </Toast.Action>
            </Toast.Root>
            <Toast.Viewport className="fixed bottom-4 right-4 w-[360px] z-50" />
        </Toast.Provider>
        </>
    );
}

// Simple AddUserForm placed in the same file for now
function AddUserForm({ onCreate, autoFocus, onNotify }: { onCreate: (u: ApiUser) => void, autoFocus?: boolean, onNotify?: (t: { title: string; description?: string; variant?: 'success'|'error'|'info' }) => void }) {
    const [email, setEmail] = useState('');
    const [costCode, setCostCode] = useState('soltrack');
    const [role, setRole] = useState<'fc'|'inv'|'accounts'|'technician'|'admin'|'master'>('fc');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    type EmailResult = { success?: boolean; messageId?: string; accepted?: string[]; rejected?: string[]; envelope?: Record<string, unknown>; error?: string } | null;
    const [emailResult, setEmailResult] = useState<EmailResult>(null);

    const emailRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (autoFocus && emailRef.current) {
            emailRef.current.focus();
        }
    }, [autoFocus]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Get current session access token to authorize the server POST
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Missing authorization');
            }
            const res = await fetch('/api/master/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ email, role, cost_code: costCode }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to create user');
            const created = data.user;
            onCreate(created as ApiUser);
            // Show email send diagnostic info (if any) so the operator can see accepted/rejected
            if (data.emailResult) setEmailResult(data.emailResult);
            if (onNotify) onNotify({ title: 'User created', description: `${email} created` , variant: 'success' });
            setEmail('');
            setRole('fc');
            setCostCode('soltrack');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            if (onNotify) onNotify({ title: 'Error creating user', description: msg, variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4">
            <div className="grid gap-3">
                <label className="text-sm text-gray-500">Email</label>
                <input ref={emailRef} required disabled={submitting} type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-sm text-gray-500">Cost center</label>
                        <div className="relative mt-1">
                            <select value={costCode} onChange={e => setCostCode(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white appearance-none pr-8 shadow-sm">
                                <option value="soltrack">soltrack</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-600">▾</div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="text-sm text-gray-500">Role</label>
                        <div className="relative mt-1">
                            <select value={role} onChange={e => setRole(e.target.value as 'fc'|'inv'|'accounts'|'technician'|'admin'|'master')} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white appearance-none pr-8 shadow-sm">
                                <option value="fc">Fleet Controller (fc)</option>
                                <option value="inv">Inventory Manager (inv)</option>
                                <option value="accounts">Accounts (accounts)</option>
                                <option value="technician">Technician (tech)</option>
                                <option value="admin">Administrator (admin)</option>
                                <option value="master">Master (master)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-600">▾</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button type="submit" disabled={submitting} className="inline-flex items-center bg-black text-white px-4 py-2 rounded-md text-sm shadow-sm hover:bg-gray-900">
                        {submitting ? 'Adding…' : 'Add user'}
                    </button>
                </div>
                {emailResult && (
                    <div className="mt-4 p-3 bg-gray-50 border rounded text-xs text-gray-700">
                        <div className="font-medium text-sm mb-1">Email diagnostics</div>
                        <div>Success: {String((emailResult as EmailResult)?.success ?? true)}</div>
                        <div>MessageId: {(emailResult as EmailResult)?.messageId ?? '—'}</div>
                        <div>Accepted: {Array.isArray((emailResult as EmailResult)?.accepted) ? (emailResult as EmailResult)?.accepted!.join(', ') : String((emailResult as EmailResult)?.accepted ?? '—')}</div>
                        <div>Rejected: {Array.isArray((emailResult as EmailResult)?.rejected) ? (emailResult as EmailResult)?.rejected!.join(', ') : String((emailResult as EmailResult)?.rejected ?? '—')}</div>
                        <div className="text-xs text-gray-500 mt-2">If the recipient was accepted by the SMTP server but you didn&apos;t receive the mail, check spam/quarantine or ensure your mail domain SPF/DKIM is configured.</div>
                    </div>
                )}
            </div>
        </form>
    );
}