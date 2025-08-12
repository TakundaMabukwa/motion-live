"use client";

import Link from 'next/link';
import { Users, FileText, Home, Settings } from 'lucide-react';
import { useState } from 'react';
import { LogoutButton } from '@/components/logout-button';

const mockUsers = [
  { id: 1, name: 'John Smith', email: 'john.smith@company.com', currentRole: 'admin', status: 'Active' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.j@company.com', currentRole: 'technician', status: 'Active' },
  { id: 3, name: 'Mike Davis', email: 'mike.davis@company.com', currentRole: 'fc', status: 'Inactive' },
  { id: 4, name: 'Lisa Wilson', email: 'lisa.w@company.com', currentRole: 'inv', status: 'Active' },
  { id: 5, name: 'Tom Brown', email: 'tom.brown@company.com', currentRole: 'accounts', status: 'Active' },
  { id: 6, name: 'Emma Taylor', email: 'emma.t@company.com', currentRole: 'technician', status: 'Active' },
  { id: 7, name: 'James Wilson', email: 'james.w@company.com', currentRole: 'admin', status: 'Inactive' },
  { id: 8, name: 'Anna Martinez', email: 'anna.m@company.com', currentRole: 'fc', status: 'Active' },
];

const roles = ['fc', 'inv', 'admin', 'technician', 'accounts'];

export default function UsersPage() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const handleAssignRole = (userId: number) => {
    setSelectedUser(userId);
    // In a real app, this would open a modal or dropdown
    alert(`Role assignment for User ID: ${userId}`);
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-100 text-red-800',
      technician: 'bg-blue-100 text-blue-800',
      fc: 'bg-green-100 text-green-800',
      inv: 'bg-yellow-100 text-yellow-800',
      accounts: 'bg-purple-100 text-purple-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

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
            <h2 className="font-bold text-gray-900 text-3xl">User Management</h2>
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors">
              Add New User
            </button>
          </div>
          
          {/* Users Table */}
          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">All Users</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="divide-y divide-gray-200 min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Current Role
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
                  {mockUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-500 text-sm">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.currentRole)}`}>
                          {user.currentRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-sm whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleAssignRole(user.id)}
                            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 px-3 py-1 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-white text-xs"
                          >
                            <Settings className="mr-1 w-3 h-3" />
                            Assign Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Selection Panel */}
          <div className="bg-white shadow-sm mt-8 p-6 border rounded-lg">
            <h3 className="mb-4 font-semibold text-gray-900 text-lg">Available Roles</h3>
            <div className="gap-3 grid grid-cols-2 md:grid-cols-5">
              {roles.map((role) => (
                <div key={role} className={`p-3 border rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors ${getRoleColor(role)}`}>
                  <div className="font-medium capitalize">{role}</div>
                  <div className="mt-1 text-xs">
                    {role === 'fc' && 'Finance Controller'}
                    {role === 'inv' && 'Inventory Manager'}
                    {role === 'admin' && 'Administrator'}
                    {role === 'technician' && 'Technical Support'}
                    {role === 'accounts' && 'Accounts Manager'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}