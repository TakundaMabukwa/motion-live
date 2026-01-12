'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Activity } from 'lucide-react';

export default function UserActivityPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const filteredUsers = users.filter(user => {
    const allowedRoles = ['fc', 'accounts', 'inv', 'admin', 'tech'];
    return allowedRoles.includes(user.role);
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (lastLogin) => {
    if (!lastLogin) return 'bg-gray-500';
    const diffMs = new Date() - new Date(lastLogin);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'bg-green-500';
    if (diffDays <= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Activity</h1>
          <p className="text-gray-600">Monitor user login activity and status</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="font-medium">{filteredUsers.length} Users</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredUsers.filter(u => formatLastLogin(u.last_sign_in_at) === 'Today').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredUsers.filter(u => {
                if (!u.last_sign_in_at) return false;
                const diffMs = new Date() - new Date(u.last_sign_in_at);
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Never Logged In</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredUsers.filter(u => !u.last_sign_in_at).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Status</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Email</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Role</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Last Login</th>
                                        <th className="px-3 py-2 text-left text-xs text-gray-500">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">Loading users...</td>
                                        </tr>
                                    )}

                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(user.last_sign_in_at)}`}></div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 mr-2">
                                                        {user.email.split('@')[0].split('.').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                                                    </div>
                                                    <div className="text-xs text-gray-900">{user.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100">
                                                    {user.role || 'No role'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                                <span className={`${!user.last_sign_in_at ? 'text-red-600' : ''}`}>
                                                    {formatLastLogin(user.last_sign_in_at)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}