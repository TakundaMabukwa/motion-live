'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { checkAuthSession, handleAuthError } from '@/lib/auth-session-utils';
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
  Play,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import StartJobModal from './components/StartJobModal';
import CreateRepairJobModal from './components/CreateRepairJobModal';
import NewStockNotification from './components/NewStockNotification';
import BootStock from './boot-stock/page';

interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  vehicle_registration: string;
  job_description: string;
  job_date: string;
  start_time: string;
  job_status: string;
  job_type: string;
  technician_phone: string;
  [key: string]: any;
}

interface UserInfo {
  user: {
    id: string;
    email: string;
    role: string;
  };
  isTechAdmin: boolean;
}

export default function Dashboard() {
  const [userRole, setUserRole] = useState('technician');
  const [userEmail, setUserEmail] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showStartJobModal, setShowStartJobModal] = useState(false);
  const [showCreateRepairJobModal, setShowCreateRepairJobModal] = useState(false);
  const [jobStats, setJobStats] = useState([
    { title: 'New Jobs', value: 0, change: '+0 today', color: 'bg-blue-500', icon: Plus },
    { title: 'Open Jobs', value: 0, change: '+0 since yesterday', color: 'bg-orange-500', icon: Clock },
    { title: 'Jobs Completed', value: 0, change: '+0 this week', color: 'bg-green-500', icon: CheckCircle },
    { title: 'Awaiting Parts', value: 0, change: '+0 since yesterday', color: 'bg-yellow-500', icon: AlertCircle }
  ]);

  const router = useRouter();

  const fetchUserInfoAndJobs = async () => {
    try {
      setLoading(true);
      
      const hasValidSession = await checkAuthSession(router);
      if (!hasValidSession) {
        return;
      }
      
      const userResponse = await fetch('/api/tech-user-info');
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch user info');
      }
      const userData = await userResponse.json();
      setUserInfo(userData);
      setUserRole(userData.user.role);
      setUserEmail(userData.user.email);
      
      let jobsUrl = '/api/jobs';
      const jobsResponse = await fetch(jobsUrl);
      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const jobsData = await jobsResponse.json();
      
      const transformedJobs = (jobsData.quotes || []).map(quote => ({
        ...quote,
        jobs: [{
          id: quote.id,
          date: quote.job_date,
          time: quote.start_time,
          technician: quote.technician_phone,
          product_name: quote.job_description || 'Job Service'
        }]
      }));
      
      setUserJobs(transformedJobs);
      setJobs(transformedJobs);
      
      const newJobs = transformedJobs.filter(job => job.job_status === 'created' && !job.technician_phone).length;
      const openJobs = transformedJobs.filter(job => job.job_status === 'created' && job.technician_phone).length;
      const completedJobs = transformedJobs.filter(job => job.job_status === 'completed').length;
      const awaitingParts = transformedJobs.filter(job => job.job_status === 'awaiting_parts').length;

      setJobStats([
        { title: 'New Jobs', value: newJobs, change: `+${newJobs} today`, color: 'bg-blue-500', icon: Plus },
        { title: 'Open Jobs', value: openJobs, change: `+${openJobs} since yesterday`, color: 'bg-orange-500', icon: Clock },
        { title: 'Jobs Completed', value: completedJobs, change: `+${completedJobs} this week`, color: 'bg-green-500', icon: CheckCircle },
        { title: 'Awaiting Parts', value: awaitingParts, change: `+${awaitingParts} since yesterday`, color: 'bg-yellow-500', icon: AlertCircle }
      ]);
      
    } catch (error) {
      console.error('Error fetching user info and jobs:', error);
      const handled = await handleAuthError(error, router);
      if (!handled) {
        sonnerToast.error('Failed to load jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      const hasValidSession = await checkAuthSession(router);
      if (hasValidSession) {
        fetchUserInfoAndJobs();
      }
    };
    
    initializePage();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'created':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      const fullJobData = await response.json();
      
      sonnerToast.success(`Job ${job.job_number} loaded successfully!`);
      
      setSelectedJob(fullJobData);
      setShowStartJobModal(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      sonnerToast.error('Failed to load job details');
    }
  };

  const handleJobStarted = (jobData: Job) => {
    setUserJobs(prev => prev.map(job => 
      job.id === jobData.id ? { ...job, ...jobData } : job
    ));
    
    sonnerToast.success(`Job ${jobData.job_number} started successfully! Status: Active`);
    setShowStartJobModal(false);
    
    fetchUserInfoAndJobs();
  };

  const handleCompleteRepairJob = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_status: 'Completed',
          completion_date: new Date().toISOString(),
          end_time: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        sonnerToast.success(`Repair job ${job.job_number} completed successfully! Vehicle will be automatically added to vehicles table.`);
        fetchUserInfoAndJobs();
      } else {
        throw new Error(`Failed to complete job: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing repair job:', error);
      sonnerToast.error(`Failed to complete repair job: ${error.message}`);
    }
  };

  const handleAddVehicleToInventory = async (job: Job) => {
    try {
      const response = await fetch(`/api/job-cards/${job.id}/add-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        sonnerToast.success(`Vehicle added to inventory successfully!`);
        fetchUserInfoAndJobs();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add vehicle: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding vehicle to inventory:', error);
      sonnerToast.error(`Failed to add vehicle to inventory: ${error.message}`);
    }
  };

  const JobTable = ({ jobs, showProgress = false }: { jobs: Job[], showProgress?: boolean }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Mobile Card View */}
      <div className="block sm:hidden">
        {jobs.length === 0 ? (
          <div className="py-12 text-slate-500 text-center">
            No jobs found
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {jobs.map((job, index) => (
              <div key={job.id || index} className="bg-slate-50 p-3 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 text-sm">{job.customer_name}</h3>
                    <p className="text-slate-600 text-xs mt-1">{job.job_description || 'N/A'}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(job.job_status)} text-xs`}>
                    {job.job_status === 'created' ? 'New' : job.job_status}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {job.job_type === 'repair' && job.job_status === 'created' ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleStartJob(job)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleCompleteRepairJob(job)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ) : job.job_type === 'repair' && job.job_status === 'Active' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleCompleteRepairJob(job)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete Job
                    </Button>
                  ) : job.job_status === 'Completed' ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleAddVehicleToInventory(job)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Add to Vehicles
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleStartJob(job)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start Job
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job Type</th>
              <th className="p-4 font-medium text-slate-700 text-left">Customer</th>
              <th className="p-4 font-medium text-slate-700 text-left">Status</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-slate-500 text-center">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr key={job.id || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                  <td className="p-4">
                    <Badge variant="outline" className={getStatusColor(job.job_status)}>
                      {job.job_status === 'created' ? 'New' : job.job_status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-slate-900">{job.customer_name}</div>
                      <div className="text-slate-600 text-sm">{job.job_description || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getStatusColor(job.job_status)}>
                      {job.job_status === 'created' ? 'New' : job.job_status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {job.job_type === 'repair' && job.job_status === 'created' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStartJob(job)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCompleteRepairJob(job)}
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </Button>
                        </>
                      ) : job.job_type === 'repair' && job.job_status === 'Active' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCompleteRepairJob(job)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </Button>
                      ) : job.job_status === 'Completed' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddVehicleToInventory(job)}
                          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Package className="w-4 h-4" />
                          Add Vehicle
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartJob(job)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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

        {/* All Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>All My Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <JobTable jobs={userJobs} />
          </CardContent>
        </Card>

      {/* Modals */}
      {selectedJob && (
        <StartJobModal
          isOpen={showStartJobModal}
          onClose={() => setShowStartJobModal(false)}
          job={selectedJob}
          userJobs={userJobs}
          onJobStarted={handleJobStarted}
          onJobCompleted={(jobData) => {
            sonnerToast.success(`Job ${jobData.job_number} completed successfully!`);
            setShowStartJobModal(false);
            fetchUserInfoAndJobs();
          }}
        />
      )}

      <CreateRepairJobModal
        isOpen={showCreateRepairJobModal}
        onClose={() => setShowCreateRepairJobModal(false)}
        userInfo={userInfo}
        onJobCreated={(jobData) => {
          sonnerToast.success(`Repair job ${jobData.job_number} created successfully!`);
          setShowCreateRepairJobModal(false);
          fetchUserInfoAndJobs();
        }}
      />

      {/* New Stock Notification */}
      <NewStockNotification userEmail={userEmail} />

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
    </div >
  );
}