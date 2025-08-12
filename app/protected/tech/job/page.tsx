'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Play
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { toast } from 'sonner';
import VinScanner from '../components/VinScanner';
import { QRCodeScanner } from '@/components/ui/QRCodeScanner';
import { VehicleDetailsPopup } from '@/components/ui/VehicleDetailsPopup';

export default function Jobs() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [userJobs, setUserJobs] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availability, setAvailability] = useState({
    isAvailable: true,
    todaysJobs: [],
    totalJobs: 0
  });
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<any>(null);

  const itemsPerPage = 50;
  const pathname = usePathname();
  const router = useRouter();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch user info and jobs
  useEffect(() => {
    const fetchUserInfoAndJobs = async () => {
      try {
        setLoading(true);
        
        // First, get user info
        const userResponse = await fetch('/api/tech-user-info');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user info');
        }
        const userData = await userResponse.json();
        setUserInfo(userData);
        
        console.log('User info:', userData);
        
        // Then fetch jobs - load all jobs based on email address, except if user is admin where role is "tech"
        let jobsUrl = '/api/jobs?role=tech';
        if (!userData.isTechAdmin) {
          // Regular tech users see only their jobs by email
          jobsUrl += `&technician=${encodeURIComponent(userData.user.email)}`;
        }
        // Tech admins see all jobs where role is "tech"
        
        const jobsResponse = await fetch(jobsUrl);
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const jobsData = await jobsResponse.json();
        
        console.log('API Response:', jobsData);
        console.log('User jobs:', jobsData.quotes);
        console.log('Jobs URL:', jobsUrl);
        console.log('User data:', userData);
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
        console.error('Error fetching data:', error);
        toast.error('Failed to load job data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfoAndJobs();
  }, []);

  // Recalculate availability when current time changes
  useEffect(() => {
    if (userJobs.length > 0) {
      calculateAvailability(userJobs);
    }
  }, [currentTime, userJobs]);

  const calculateAvailability = (jobs) => {
    const now = currentTime;
    
    // Check if user is currently busy
    const isCurrentlyBusy = jobs.some(quote => {
      if (!quote.job_date || !quote.start_time) return false;
      
      const jobDate = new Date(quote.job_date);
      const jobEndTime = new Date(jobDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour jobs
      
      return now >= jobDate && now <= jobEndTime;
    });
    
    // Get today's jobs
    const today = now.toISOString().split('T')[0];
    const todaysJobs = jobs.filter(quote => {
      if (!quote.job_date) return false;
      const jobDate = quote.job_date.split('T')[0];
      return jobDate === today;
    });
    
    setAvailability({
      isAvailable: !isCurrentlyBusy,
      todaysJobs: todaysJobs,
      totalJobs: jobs.length
    });
  };

  const getJobStats = () => {
    const allJobs = userJobs || [];
    const totalNew = allJobs.filter(job => job.status === 'created').length;
    const totalOpen = allJobs.filter(job => job.status === 'created' && job.technician_phone).length;
    const totalCompleted = allJobs.filter(job => job.status === 'completed').length;
    const serviceUpcoming = availability.todaysJobs.length;
    const licensesExpiring = 0; // Could be calculated from vehicle data
    const inForRepairs = allJobs.filter(job => job.job_type === 'repair').length;
    const active = totalNew + totalOpen;

    return { totalNew, totalOpen, totalCompleted, serviceUpcoming, licensesExpiring, inForRepairs, active };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
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

  const handleVinScan = (job) => {
    setSelectedJob(job);
    setShowVinScanner(true);
  };

  const handleVehicleFound = (vehicle) => {
    setSelectedVehicle(vehicle);
    toast.success(`Vehicle ${vehicle.registration_number} selected for job`);
    // Here you can add logic to associate the vehicle with the job
    console.log('Vehicle selected for job:', { job: selectedJob, vehicle });
  };

  const handleCloseVinScanner = () => {
    setShowVinScanner(false);
    setSelectedJob(null);
    setSelectedVehicle(null);
  };

  const handleStartJob = (job: any) => {
    setSelectedJob(job);
    setShowQRScanner(true);
  };

  const handleJobVerified = async (jobData: any) => {
    // Job number verified, now check for vehicle details
    try {
      // Check if vehicle exists in vehicles_ip table
      const response = await fetch(`/api/vehicles-ip?registration=${selectedJob?.vehicle_registration || ''}&vin=${selectedJob?.vin_number || ''}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.vehicles && data.vehicles.length > 0) {
          // Vehicle exists, proceed with VIN scanning
          setCurrentVehicle(data.vehicles[0]);
          console.log('Vehicle found:', data.vehicles[0]);
          // You can add VIN scanning logic here
        } else {
          // Vehicle not found, show vehicle details popup
          setShowVehicleDetails(true);
        }
      } else {
        // Error checking vehicle, show vehicle details popup
        setShowVehicleDetails(true);
      }
    } catch (error) {
      console.error('Error checking vehicle:', error);
      setShowVehicleDetails(true);
    }
  };

  const handleVehicleAdded = (vehicleData: any) => {
    setCurrentVehicle(vehicleData);
    console.log('Vehicle added:', vehicleData);
    // You can add VIN scanning logic here
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

  const JobTable = ({ jobs, showProgress = false }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-slate-200 border-b">
            <tr>
              <th className="p-4 font-medium text-slate-700 text-left">Job Type</th>
              <th className="p-4 font-medium text-slate-700 text-left">Customer</th>
              <th className="p-4 font-medium text-slate-700 text-left">Products</th>
              <th className="p-4 font-medium text-slate-700 text-left">Scheduled Date</th>
              <th className="p-4 font-medium text-slate-700 text-left">Status</th>
              <th className="p-4 font-medium text-slate-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-slate-500 text-center">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr key={job.id || index} className="hover:bg-slate-50 border-slate-100 border-b transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(job.status || 'created')}>
                        {job.job_type || 'Install'}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-900">{job.customer_name}</td>
                  <td className="p-4 text-slate-600">
                    {job.job_description || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-600">
                    {job.job_date && job.start_time 
                      ? `${job.job_date.split('T')[0]} at ${job.start_time.split('T')[1]?.split('.')[0] || 'No time'}`
                      : 'Not scheduled'
                    }
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={getStatusColor(job.status)}>
                      {job.status === 'created' ? 'New' : job.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStartJob(job)}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="w-4 h-4" />
                        Start Job
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVinScan(job)}
                        className="flex items-center gap-1"
                      >
                        <Car className="w-4 h-4" />
                        Scan VIN
                      </Button>
                      <Button size="sm" variant="outline">
                        <Calendar className="w-4 h-4" />
                      </Button>
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

  const OnHandTable = ({ jobs }) => (
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
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="mb-2 font-bold text-slate-900 text-2xl">My Jobs</h2>
          {userInfo && (
            <p className="text-slate-600">
              {userInfo.isTechAdmin 
                ? "Viewing all assigned jobs (Admin Access)" 
                : `Viewing your assigned jobs (${userInfo.user.email})`
              }
            </p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="new">New Jobs</TabsTrigger>
            <TabsTrigger value="open">Open Jobs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                    <CardTitle className="font-medium text-slate-600 text-sm">
                      Today's Jobs
                    </CardTitle>
                    <Clock className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-slate-900 text-3xl">{stats.serviceUpcoming}</div>
                    <p className="flex items-center mt-1 text-green-600 text-xs">
                      <TrendingUp className="mr-1 w-3 h-3" />
                      Scheduled for today
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
                  <JobTable jobs={userJobs.filter(job => job.status === 'created' && !job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="open" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.status === 'created' && job.technician_phone)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobTable jobs={userJobs.filter(job => job.status === 'completed')} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

      {/* VIN Scanner */}
      <VinScanner
        isOpen={showVinScanner}
        onClose={handleCloseVinScanner}
        jobId={selectedJob?.id}
        customerName={selectedJob?.customer_name}
        customerEmail={selectedJob?.customer_email}
      />

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onJobVerified={handleJobVerified}
        expectedJobNumber={selectedJob?.job_number || selectedJob?.id}
      />

      {/* Vehicle Details Popup */}
      <VehicleDetailsPopup
        isOpen={showVehicleDetails}
        onClose={() => setShowVehicleDetails(false)}
        onVehicleAdded={handleVehicleAdded}
        jobData={selectedJob}
      />
    </div>
  );
}