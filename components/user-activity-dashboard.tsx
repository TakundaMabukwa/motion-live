'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Session {
  id: string;
  email: string;
  role: string;
  login_time: string;
  logout_time: string | null;
  session_duration_minutes: number | null;
  last_activity: string;
}

interface UserGroup {
  email: string;
  role: string;
  sessions: Session[];
  lastLogin: Session;
}

export default function UserActivityDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchSessions = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const res = await fetch(`/api/user-sessions?${params}`);
    const data = await res.json();
    
    setSessions(data.sessions || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Active';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const userGroups: UserGroup[] = Object.values(
    sessions.reduce((acc, session) => {
      if (!acc[session.email]) {
        acc[session.email] = {
          email: session.email,
          role: session.role,
          sessions: [],
          lastLogin: session
        };
      }
      acc[session.email].sessions.push(session);
      if (new Date(session.login_time) > new Date(acc[session.email].lastLogin.login_time)) {
        acc[session.email].lastLogin = session;
      }
      return acc;
    }, {} as Record<string, UserGroup>)
  );

  const toggleUser = (email: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedUsers(newExpanded);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Activity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
          <Button onClick={fetchSessions}>Apply</Button>
        </CardContent>
      </Card>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Logins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : userGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No sessions found</td>
                </tr>
              ) : (
                userGroups.map((user) => (
                  <React.Fragment key={user.email}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(user.lastLogin.login_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!user.lastLogin.logout_time ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-gray-500">Offline</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.sessions.length}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleUser(user.email)}
                        >
                          {expandedUsers.has(user.email) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                    {expandedUsers.has(user.email) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700 mb-2">All Sessions</h4>
                            <table className="min-w-full">
                              <thead>
                                <tr className="text-xs text-gray-500">
                                  <th className="text-left py-2">Login Time</th>
                                  <th className="text-left py-2">Logout Time</th>
                                  <th className="text-left py-2">Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {user.sessions
                                  .sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime())
                                  .map((session) => (
                                    <tr key={session.id} className="text-sm">
                                      <td className="py-2">{formatDate(session.login_time)}</td>
                                      <td className="py-2">
                                        {session.logout_time ? formatDate(session.logout_time) : <span className="text-green-600">Active</span>}
                                      </td>
                                      <td className="py-2">{formatDuration(session.session_duration_minutes)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
