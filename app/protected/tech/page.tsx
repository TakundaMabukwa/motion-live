'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  Eye,
  Package,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'react-hot-toast';
import BootStock from './boot-stock/page';

export default function Dashboard() {
  const [userRole, setUserRole] = useState('technician');
  const [userEmail, setUserEmail] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState([
    { title: 'New Jobs', value: 0, change: '+0 today', color: 'bg-blue-500', icon: Plus },
    { title: 'Open Jobs', value: 0, change: '+0 since yesterday', color: 'bg-orange-500', icon: Clock },
    { title: 'Jobs Completed', value: 0, change: '+0 this week', color: 'bg-green-500', icon: CheckCircle },
    { title: 'Awaiting Parts', value: 0, change: '+0 since yesterday', color: 'bg-yellow-500', icon: AlertCircle }
  ]);

  useEffect(() => {
    const fetchUserAndJobs = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Authentication error:', authError);
          setLoading(false);
          return;
        }
        
        if (user) {
          const response = await fetch('/api/technicians/jobs');
          if (response.ok) {
            const data = await response.json();
            setJobs(data.jobs || []);
            setUserRole(data.userRole);
            setUserEmail(data.userEmail);
            
            const newJobs = data.jobs.filter(job => job.status === 'New' || job.job_status === 'New').length;
            const openJobs = data.jobs.filter(job => 
              job.status === 'In Progress' || 
              job.job_status === 'In Progress' || 
              job.status === 'Pending' || 
              job.job_status === 'Pending'
            ).length;
            const completedJobs = data.jobs.filter(job => 
              job.status === 'Completed' || 
              job.job_status === 'Completed'
            ).length;
            const awaitingParts = data.jobs.filter(job => 
              job.status === 'Awaiting Parts' || 
              job.job_status === 'Awaiting Parts'
            ).length;

            setJobStats([
              { title: 'New Jobs', value: newJobs, change: `+${newJobs} today`, color: 'bg-blue-500', icon: Plus },
              { title: 'Open Jobs', value: openJobs, change: `+${openJobs} since yesterday`, color: 'bg-orange-500', icon: Clock },
              { title: 'Jobs Completed', value: completedJobs, change: `+${completedJobs} this week`, color: 'bg-green-500', icon: CheckCircle },
              { title: 'Awaiting Parts', value: awaitingParts, change: `+${awaitingParts} since yesterday`, color: 'bg-yellow-500', icon: AlertCircle }
            ]);
          } else {
            toast.error('Failed to fetch jobs');
          }
        } else {
          toast.error('Authentication failed');
        }
      } catch (error) {
        console.error('Error fetching user and jobs:', error);
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndJobs();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="font-bold text-gray-900 text-3xl mb-2">Technician Dashboard</h1>
          <p className="text-gray-600">Welcome to your technician portal</p>
        </div>
            {/* Job Statistics */}
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                      <div className="bg-slate-200 rounded w-20 h-4 animate-pulse"></div>
                      <div className="bg-slate-200 p-2 rounded-full animate-pulse">
                        <div className="w-4 h-4"></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-200 mb-2 rounded w-16 h-8 animate-pulse"></div>
                      <div className="bg-slate-200 rounded w-24 h-3 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                jobStats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                        <CardTitle className="font-medium text-slate-600 text-sm">
                          {stat.title}
                        </CardTitle>
                        <div className={`p-2 rounded-full ${stat.color}`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="font-bold text-slate-900 text-3xl">{stat.value}</div>
                        <p className="flex items-center mt-1 text-green-600 text-xs">
                          <TrendingUp className="mr-1 w-3 h-3" />
                          {stat.change}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* User Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">Role:</span>
                      <div className="bg-slate-200 rounded w-20 h-5 animate-pulse"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">Email:</span>
                      <div className="bg-slate-200 rounded w-32 h-5 animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">Role:</span>
                      <Badge variant={userRole === 'tech_admin' ? 'default' : 'secondary'}>
                        {userRole === 'tech_admin' ? 'Tech Admin' : 'Technician'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">Email:</span>
                      <span className="text-slate-600 text-sm">{userEmail || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-slate-500 text-center">No recent jobs found.</p>
                ) : (
                  <div className="space-y-4">
                    {jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex justify-between items-center hover:bg-slate-50 p-4 border border-slate-200 rounded-lg transition-colors">
                        <div className="flex items-center space-x-4">
                          <Badge variant="secondary">
                            {job.status || job.job_status || 'New'}
                          </Badge>
                          <div>
                            <p className="font-medium text-slate-900">{job.job_number || job.id}</p>
                            <p className="text-slate-500 text-sm">{job.customer_name || 'N/A'}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-1 w-3 h-3" />
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>


        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </div>
  );
}