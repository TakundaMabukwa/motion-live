'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { checkAuthSession, handleAuthError } from '@/lib/auth-session-utils';
import {
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Package,
  Wrench,
  Settings,
  Eye,
  Edit,
  FileText,
  TrendingUp,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Shield,
  Car,
  Play,
  Camera,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { toast } from 'sonner';
import StartJobModal from '../components/StartJobModal';
import CreateRepairJobModal from '../components/CreateRepairJobModal';

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

export default function Jobs() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availability, setAvailability] = useState({
    isAvailable: true,
    todaysJobs: [],
    totalJobs: 0
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showStartJobModal, setShowStartJobModal] = useState(false);
  const [showCreateRepairJobModal, setShowCreateRepairJobModal] = useState(false);

  const itemsPerPage = 50;
  const pathname = usePathname();
  const router = useRouter();

  // Define fetchUserInfoAndJobs at component level so it can be called from handleJobStarted
    const fetchUserInfoAndJobs = async () => {
      try {
        setLoading(true);
        
        // Check authentication session first
        const hasValidSession = await checkAuthSession(router);
        if (!hasValidSession) {
          return;
        }
        
        // First, get user info
        const userResponse = await fetch('/api/tech-user-info');
        if (!userResponse.ok) {
          if (userResponse.status === 401) {
            console.log('Authentication error: Session missing, redirecting to login');
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to fetch user info');
        }
        const userData = await userResponse.json();
        setUserInfo(userData);
        
        console.log('User info:', userData);
        
        // Fetch all jobs for now (remove filtering temporarily)
        let jobsUrl = '/api/jobs';
        // TODO: Re-enable filtering once technician_phone field is populated
        // if (userData.isTechAdmin) {
        //   // Tech admins see all jobs (no filters)
        // } else {
        //   // Regular techs see only their assigned jobs
        //   jobsUrl += `?technician=${encodeURIComponent(userData.user.email)}`;
        // }
        
        const jobsResponse = await fetch(jobsUrl);
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const jobsData = await jobsResponse.json();
        
        console.log('🔍 Jobs API Response:', jobsData);
        console.log('📋 Jobs URL used:', jobsUrl);
        console.log('👤 User data:', userData);
        console.log('📊 Jobs count:', jobsData.quotes?.length || 0);
        console.log('🔧 Is tech admin:', userData.isTechAdmin);
        // Transform the data to match the expected structure
        const transformedJobs = (jobsData.quotes || []).map(quote => ({
          ...quote,
          // Add a jobs array to maintain compatibility with existing code
          jobs: [{
            id: quote.id,
            date: quote.job_date,
            time: quote.start_time,
            technician: quote.technician_phone,
            product_name: quote.job_description || 'Job Service'
          }]
        }));
        
        setUserJobs(transformedJobs);
        
        // Calculate availability
        calculateAvailability(transformedJobs);
        
      } catch (error) {
        console.error('Error fetching user info and jobs:', error);
        const handled = await handleAuthError(error, router);
        if (!handled) {
        toast.error('Failed to load jobs');
        }
      } finally {
        setLoading(false);
      }
    };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch user info and jobs
  useEffect(() => {
    const initializePage = async () => {
      // Check session first
      const hasValidSession = await checkAuthSession(router);
      if (hasValidSession) {
    fetchUserInfoAndJobs();
      }
    };
    
    initializePage();
  }, []);

  // Calculate availability based on jobs
  const calculateAvailability = (jobs: Job[]) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const todaysJobs = jobs.filter(job => {
      if (!job.job_date) return false;
      const jobDate = job.job_date.split('T')[0];
      return jobDate === todayString;
    });

    setAvailability({
      isAvailable: todaysJobs.length < 5, // Available if less than 5 jobs today
      todaysJobs,
      totalJobs: jobs.length
    });
  };

  // Get job statistics
  const getJobStats = () => {
    const totalNew = userJobs.filter(job => job.job_status === 'created' && !job.technician_phone).length;
    const totalOpen = userJobs.filter(job => job.job_status === 'created' && job.technician_phone).length;
    const totalCompleted = userJobs.filter(job => job.job_status === 'completed').length;
    const totalRepair = userJobs.filter(job => job.repair === true).length;
    const serviceUpcoming = userJobs.filter(job => {
      if (!job.job_date) return false;
      const jobDate = new Date(job.job_date);
      const today = new Date();
      return jobDate >= today;
    }).length;

    return {
      totalNew,
      totalOpen,
      totalCompleted,
      totalRepair,
      serviceUpcoming
    };
  };

  // Get status color for badges
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
    console.log('🎯 Job clicked!');
    console.log('📋 Job details:', job);
    console.log('🆔 Job ID:', job.id);
    console.log('🔢 Job Number:', job.job_number);
    
    try {
      // Fetch full job details
      const response = await fetch(`/api/job-cards/${job.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      const fullJobData = await response.json();
      
      console.log('📋 Full job data fetched:', fullJobData);
      toast.success(`Job ${job.job_number} loaded successfully!`);
      
      setSelectedJob(fullJobData);
      setShowStartJobModal(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    }
  };

  const handleJobStarted = (jobData: Job) => {
    // Update the job in the local state
    setUserJobs(prev => prev.map(job => 
      job.id === jobData.id ? { ...job, ...jobData } : job
    ));
    
    toast.success(`Job ${jobData.job_number} started successfully! Status: Active`);
    setShowStartJobModal(false);
    
    // Refresh the jobs data
    fetchUserInfoAndJobs();
  };

  const handleCompleteRepairJob = async (job: Job) => {
    try {
      // Update job status to completed
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
        toast.success(`Repair job ${job.job_number} completed successfully! Vehicle will be automatically added to vehicles table.`);
        // Refresh the jobs data
        fetchUserInfoAndJobs();
      } else {
        throw new Error(`Failed to complete job: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing repair job:', error);
      toast.error(`Failed to complete repair job: ${error.message}`);
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
        const result = await response.json();
        toast.success(`Vehicle added to inventory successfully!`);
        // Refresh the jobs data
        fetchUserInfoAndJobs();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add vehicle: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding vehicle to inventory:', error);
      toast.error(`Failed to add vehicle to inventory: ${error.message}`);
    }
  };

  const stats = getJobStats();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-3 text-slate-600">Loading jobs...</span>
        </div>
      </div>
    );
  }

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

  const OnHandTable = ({ jobs }: { jobs: any[] }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job Card</th>
              <th className="p-4 font-medium text-slate-700 text-left">Odo Reading</th>
              <th className="p-4 font-medium text-slate-700 text-left">Registration</th>
              <th className="p-4 font-medium text-slate-700 text-left">Opened</th>
              <th className="p-4 font-medium text-slate-700 text-left">Last Updated</th>
              <th className="p-4 font-medium text-slate-700 text-left">Description</th>
              <th className="p-4 font-medium text-slate-700 text-left">Technician</th>
              <th className="p-4 font-medium text-slate-700 text-left">Created By</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-slate-500 text-center">
                  No results
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr key={job.jobCard || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                  <td className="p-4 font-medium text-slate-900">{job.jobCard}</td>
                  <td className="p-4 text-slate-600">{job.odoReading}</td>
                  <td className="p-4 text-slate-600">{job.registration}</td>
                  <td className="p-4 text-slate-600">{job.opened}</td>
                  <td className="p-4 text-slate-600">{job.lastUpdated}</td>
                  <td className="p-4 text-slate-600">{job.description}</td>
                  <td className="p-4 text-slate-600">{job.technician}</td>
                  <td className="p-4 text-slate-600">{job.createdBy}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="mb-2 font-bold text-slate-900 text-xl sm:text-2xl">My Jobs</h2>
              {userInfo && (
                <p className="text-slate-600 text-sm sm:text-base">
                  {userInfo.isTechAdmin 
                    ? "Viewing all jobs (Admin)" 
                    : `Your jobs (${userInfo.user.email.split('@')[0]})`
                  }
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowCreateRepairJobModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              <Plus className="mr-2 w-4 h-4" />
              <span className="sm:inline">Create Repair Job</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="new" className="text-xs sm:text-sm">New</TabsTrigger>
            <TabsTrigger value="open" className="text-xs sm:text-sm">Open</TabsTrigger>
            <TabsTrigger value="repair" className="text-xs sm:text-sm">Repair</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Done</TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="gap-3 sm:gap-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Today's Jobs
                    </CardTitle>
                    <Clock className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-2xl sm:text-3xl">{stats.serviceUpcoming}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      <span className="hidden sm:inline">Scheduled for today</span>
                      <span className="sm:hidden">Today</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      New Jobs
                    </CardTitle>
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalNew}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Awaiting assignment
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Active Jobs
                    </CardTitle>
                    <Wrench className="w-4 h-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalOpen}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Currently assigned
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Completed
                    </CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalCompleted}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Successfully completed
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Repair Jobs
                    </CardTitle>
                    <Wrench className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.totalRepair}</div>
                    <p className="flex items-center mt-1 text-purple-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Total repair jobs
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* All Jobs Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All My Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'created' && !job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="open" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'created' && job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="repair" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Repair Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const filteredJobs = userJobs.filter(job => {
                      // Filter for repair jobs
                      if (job.repair !== true) return false;
                      
                      // Tech admins can see all repair jobs
                      if (userInfo?.isTechAdmin) return true;
                      
                      // Regular technicians can only see their own repair jobs
                      return job.technician_phone === userInfo?.user?.email;
                    });
                    
                    console.log('🔧 Repair Jobs Filtering:', {
                      totalJobs: userJobs.length,
                      repairJobs: userJobs.filter(job => job.repair === true).length,
                      filteredJobs: filteredJobs.length,
                      userEmail: userInfo?.user?.email,
                      isTechAdmin: userInfo?.isTechAdmin,
                      sampleJob: userJobs.find(job => job.repair === true)
                    });
                    
                    return <JobTable jobs={filteredJobs} />;
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.job_status === 'completed')} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

      {/* QR Code Scanner */}
      {selectedJob && (
        <StartJobModal
          isOpen={showStartJobModal}
          onClose={() => setShowStartJobModal(false)}
          job={selectedJob}
          userJobs={userJobs}
          onJobStarted={handleJobStarted}
          onJobCompleted={(jobData) => {
            // Handle job completion if needed
            toast.success(`Job ${jobData.job_number} completed successfully!`);
            setShowStartJobModal(false);
            fetchUserInfoAndJobs();
          }}
        />
      )}

      {/* Create Repair Job Modal */}
      <CreateRepairJobModal
        isOpen={showCreateRepairJobModal}
        onClose={() => setShowCreateRepairJobModal(false)}
        userInfo={userInfo}
        onJobCreated={(jobData) => {
          toast.success(`Repair job ${jobData.job_number} created successfully!`);
          setShowCreateRepairJobModal(false);
          fetchUserInfoAndJobs();
        }}
      />
    </div>
  );
}