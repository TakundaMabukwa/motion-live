'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Clock,
  MapPin,
  User,
  Shield,
  Eye,
  Edit,
  FileText,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Briefcase,
  Car,
  Play
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { toast } from 'sonner';
import VinScanner from '../components/VinScanner';
import { JobDetailsPopup } from '@/components/ui/JobDetailsPopup';
import { QRCodeScanner } from '@/components/ui/QRCodeScanner';
import { VehicleDetailsPopup } from '@/components/ui/VehicleDetailsPopup';
import StartJobModal from '../components/StartJobModal';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [calendarEvents, setCalendarEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<any>(null);
  const [showStartJobModal, setShowStartJobModal] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  // Fetch user info and jobs
  useEffect(() => {
    const fetchUserInfoAndJobs = async () => {
      try {
        setLoading(true);
        
        // Fetch jobs using our new technicians API endpoint
        const jobsResponse = await fetch('/api/technicians/jobs');
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const jobsData = await jobsResponse.json();
        
        console.log('Jobs API Response:', jobsData);
        console.log('User role:', jobsData.userRole);
        console.log('User email:', jobsData.userEmail);
        console.log('Jobs count:', jobsData.jobs?.length || 0);
        
        // Set user info from the jobs API response
        setUserInfo({
          user: { email: jobsData.userEmail },
          isTechAdmin: jobsData.userRole === 'tech_admin'
        });
        
        // Group jobs by date for calendar display
        const eventsByDate = {};
        jobsData.jobs?.forEach(job => {
          console.log('Processing job:', job);
          // Check if job has a date (job_date, due_date, or start_time)
          let jobDate = job.job_date || job.due_date || job.start_time;
          
          if (jobDate) {
            const dateKey = jobDate.split('T')[0]; // Extract date part from timestamp
            if (!eventsByDate[dateKey]) {
              eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push({
              id: job.id,
              title: job.customer_name || job.job_description || 'Job Service',
              time: job.start_time ? job.start_time.split('T')[1]?.split('.')[0] : 'No time set',
              assignee: job.technician_phone || job.technician_name || 'Unassigned',
              location: job.customer_address || job.job_location || 'No address',
              customerName: job.customer_name || 'N/A',
              customerEmail: job.customer_email || 'N/A',
              customerPhone: job.customer_phone || 'N/A',
              customerAddress: job.customer_address || 'N/A',
              productName: job.job_description || 'Job Service',
              quantity: 1,
              technician: job.technician_phone || job.technician_name,
              date: dateKey,
              jobType: job.job_type || 'Service',
              totalAmount: job.estimated_cost || job.quotation_total_amount || job.actual_cost || 0,
              subtotal: job.estimated_cost || job.quotation_subtotal || 0,
              status: job.status || job.job_status || 'New',
              priority: job.priority || 'Medium',
              jobStatus: job.job_status || job.status || 'New',
            });
          }
        });
        
        console.log('Events by date:', eventsByDate);
        setCalendarEvents(eventsByDate);
        
        // Set today as selected date
        const today = new Date();
        const dateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
        setSelectedDate(dateKey);
        
        toast.success(`Calendar loaded! Found ${Object.values(eventsByDate).flat().length} jobs`);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfoAndJobs();
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    const segments = pathname.split('/').filter(Boolean);
    segments.pop();
    const newPath = `/${segments.join('/')}/boot-stock`;
    router.push(newPath);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'Install': return 'bg-blue-500';
      case 'Repair': return 'bg-orange-500';
      case 'De-Install': return 'bg-red-500';
      case 'Maintenance': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    setSelectedJob(event);
    setJobDetailsOpen(true);
  };

  const handleVinScan = (job) => {
    setSelectedJob(job);
    setShowVinScanner(true);
  };

  const handleStartJob = (job: any) => {
    setSelectedJob(job);
    setShowStartJobModal(true);
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

  const handleVehicleFound = (vehicle) => {
    setSelectedVehicle(vehicle);
    toast.success(`Vehicle ${vehicle.registration_number} selected for job`);
    // Here you can add logic to associate the vehicle with the job
    console.log('Vehicle selected for job:', { job: selectedJob, vehicle });
  };

  const handleJobStarted = (jobData: any) => {
    // Update the job in the calendar events
    setCalendarEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(dateKey => {
        updated[dateKey] = updated[dateKey].map(event => 
          event.id === jobData.id ? { ...event, ...jobData } : event
        );
      });
      return updated;
    });
    
    toast.success(`Job ${jobData.job_number} started successfully! Status: Active`);
    setShowStartJobModal(false);
    
    // Refresh the calendar data to show updated status
    setTimeout(() => {
      const fetchUserInfoAndJobs = async () => {
        try {
          const jobsResponse = await fetch('/api/technicians/jobs');
          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            
            const eventsByDate = {};
            jobsData.jobs?.forEach(job => {
              let jobDate = job.job_date || job.due_date || job.start_time;
              
              if (jobDate) {
                const dateKey = jobDate.split('T')[0];
                if (!eventsByDate[dateKey]) {
                  eventsByDate[dateKey] = [];
                }
                eventsByDate[dateKey].push({
                  id: job.id,
                  title: job.customer_name || job.job_description || 'Job Service',
                  time: job.start_time ? job.start_time.split('T')[1]?.split('.')[0] : 'No time set',
                  assignee: job.technician_phone || job.technician_name || 'Unassigned',
                  location: job.customer_address || job.job_location || 'No address',
                  customerName: job.customer_name || 'N/A',
                  customerEmail: job.customer_email || 'N/A',
                  customerPhone: job.customer_phone || 'N/A',
                  customerAddress: job.customer_address || 'N/A',
                  productName: job.job_description || 'Job Service',
                  quantity: 1,
                  technician: job.technician_phone || job.technician_name,
                  date: dateKey,
                  jobType: job.job_type || 'Service',
                  totalAmount: job.estimated_cost || job.quotation_total_amount || job.actual_cost || 0,
                  subtotal: job.estimated_cost || job.quotation_subtotal || 0,
                  status: job.status || job.job_status || 'New',
                  priority: job.priority || 'Medium',
                  jobStatus: job.job_status || job.status || 'New',
                });
              }
            });
            
            setCalendarEvents(eventsByDate);
          }
        } catch (error) {
          console.error('Error refreshing calendar data:', error);
        }
      };
      fetchUserInfoAndJobs();
    }, 1000);
  };

  const handleJobCompleted = (jobData: any) => {
    // Update the job in the calendar events
    setCalendarEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(dateKey => {
        updated[dateKey] = updated[dateKey].map(event => 
          event.id === jobData.id ? { ...event, ...jobData } : event
        );
      });
      return updated;
    });
    
    toast.success(`Job ${jobData.job_number} completed successfully! Status: Completed`);
    
    // Refresh the calendar data to show updated status
    setTimeout(() => {
      const fetchUserInfoAndJobs = async () => {
        try {
          const jobsResponse = await fetch('/api/technicians/jobs');
          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            
            const eventsByDate = {};
            jobsData.jobs?.forEach(job => {
              let jobDate = job.job_date || job.due_date || job.start_time;
              
              if (jobDate) {
                const dateKey = jobDate.split('T')[0];
                if (!eventsByDate[dateKey]) {
                  eventsByDate[dateKey] = [];
                }
                eventsByDate[dateKey].push({
                  id: job.id,
                  title: job.customer_name || job.job_description || 'Job Service',
                  time: job.start_time ? job.start_time.split('T')[1]?.split('.')[0] : 'No time set',
                  assignee: job.technician_phone || job.technician_name || 'Unassigned',
                  location: job.customer_address || job.job_location || 'No address',
                  customerName: job.customer_name || 'N/A',
                  customerEmail: job.customer_email || 'N/A',
                  customerPhone: job.customer_phone || 'N/A',
                  customerAddress: job.customer_address || 'N/A',
                  productName: job.job_description || 'Job Service',
                  quantity: 1,
                  technician: job.technician_phone || job.technician_name,
                  date: dateKey,
                  jobType: job.job_type || 'Service',
                  totalAmount: job.estimated_cost || job.quotation_total_amount || job.actual_cost || 0,
                  subtotal: job.estimated_cost || job.quotation_subtotal || 0,
                  status: job.status || job.job_status || 'New',
                  priority: job.priority || 'Medium',
                  jobStatus: job.job_status || job.status || 'New',
                });
              }
            });
            
            setCalendarEvents(eventsByDate);
          }
        } catch (error) {
          console.error('Error refreshing calendar data:', error);
        }
      };
      fetchUserInfoAndJobs();
    }, 1000);
  };

  const handleEndJob = (job: any) => {
    setSelectedJob(job);
    setShowStartJobModal(true);
  };

  const handleCloseVinScanner = () => {
    setShowVinScanner(false);
    setSelectedJob(null);
    setSelectedVehicle(null);
  };

  const days = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="mb-2 font-bold text-slate-900 text-2xl">Calendar</h2>
          <p className="text-slate-600">View and manage your calendar schedule</p>
          
          {/* User Role and Job Count Info */}
          {loading ? (
            <div className="bg-slate-50 mt-4 p-4 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-700 text-sm">Role:</span>
                    <div className="bg-slate-200 rounded w-20 h-5 animate-pulse"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-700 text-sm">Email:</span>
                    <div className="bg-slate-200 rounded w-32 h-5 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-700 text-sm">Total Jobs:</span>
                  <div className="bg-slate-200 rounded w-16 h-5 animate-pulse"></div>
                </div>
              </div>
              <div className="bg-slate-200 mt-2 rounded w-48 h-3 animate-pulse"></div>
            </div>
          ) : userInfo ? (
            <div className="bg-slate-50 mt-4 p-4 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-700 text-sm">Role:</span>
                    <Badge variant={userInfo.isTechAdmin ? 'default' : 'secondary'}>
                      {userInfo.isTechAdmin ? 'Tech Admin' : 'Technician'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-700 text-sm">Email:</span>
                    <span className="text-slate-600 text-sm">{userInfo.user.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-700 text-sm">Total Jobs:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {Object.values(calendarEvents).flat().length}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-slate-500 text-xs">
                {userInfo.isTechAdmin 
                  ? 'Showing all jobs in the system' 
                  : 'Showing jobs assigned to your email address'
                }
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="text-slate-600"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                // Re-fetch data
                const fetchUserInfoAndJobs = async () => {
                  try {
                    // Fetch jobs using our new technicians API endpoint
                    const jobsResponse = await fetch('/api/technicians/jobs');
                    if (!jobsResponse.ok) {
                      throw new Error('Failed to fetch jobs');
                    }
                    const jobsData = await jobsResponse.json();
                    
                    console.log('Jobs API Response:', jobsData);
                    console.log('User role:', jobsData.userRole);
                    console.log('User email:', jobsData.userEmail);
                    console.log('Jobs count:', jobsData.jobs?.length || 0);
                    
                    // Set user info from the jobs API response
                    setUserInfo({
                      user: { email: jobsData.userEmail },
                      isTechAdmin: jobsData.userRole === 'tech_admin'
                    });
                    
                    // Group jobs by date for calendar display
                    const eventsByDate = {};
                    jobsData.jobs?.forEach(job => {
                      console.log('Processing job:', job);
                      // Check if job has a date (job_date, due_date, or start_time)
                      let jobDate = job.job_date || job.due_date || job.start_time;
                      
                      if (jobDate) {
                        const dateKey = jobDate.split('T')[0]; // Extract date part from timestamp
                        if (!eventsByDate[dateKey]) {
                          eventsByDate[dateKey] = [];
                        }
                        eventsByDate[dateKey].push({
                          id: job.id,
                          title: job.customer_name || job.job_description || 'Job Service',
                          time: job.start_time ? job.start_time.split('T')[1]?.split('.')[0] : 'No time set',
                          assignee: job.technician_phone || job.technician_name || 'Unassigned',
                          location: job.customer_address || job.job_location || 'No address',
                          customerName: job.customer_name || 'N/A',
                          customerEmail: job.customer_email || 'N/A',
                          customerPhone: job.customer_phone || 'N/A',
                          customerAddress: job.customer_address || 'N/A',
                          productName: job.job_description || 'Job Service',
                          quantity: 1,
                          technician: job.technician_phone || job.technician_name,
                          date: dateKey,
                          jobType: job.job_type || 'Service',
                          totalAmount: job.estimated_cost || job.quotation_total_amount || job.actual_cost || 0,
                          subtotal: job.estimated_cost || job.quotation_subtotal || 0,
                          status: job.status || job.job_status || 'New',
                          priority: job.priority || 'Medium',
                          jobStatus: job.job_status || job.status || 'New',
                        });
                      }
                    });
                    
                    console.log('Events by date:', eventsByDate);
                    setCalendarEvents(eventsByDate);
                    
                    toast.success(`Calendar refreshed! Found ${Object.values(eventsByDate).flat().length} jobs`);
                    
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                    toast.error('Failed to refresh calendar data');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchUserInfoAndJobs();
              }}
              disabled={loading}
              className="text-slate-600"
            >
              {loading ? (
                <div className="border-2 border-slate-400 border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
              ) : (
                'Refresh'
              )}
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="min-w-[120px] font-medium text-slate-900 text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
              <span className="ml-3 text-slate-600">Loading calendar...</span>
            </div>
          ) : Object.values(calendarEvents).flat().length === 0 ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="flex justify-center items-center bg-slate-100 mb-4 rounded-full w-16 h-16">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="mb-2 font-medium text-slate-900 text-lg">No jobs found</h3>
              <p className="mb-4 text-slate-500 text-center">
                {userInfo?.isTechAdmin 
                  ? 'There are no jobs in the system for this month.' 
                  : 'You have no jobs assigned to you for this month.'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  // Re-fetch data
                  const fetchUserInfoAndJobs = async () => {
                    try {
                      const jobsResponse = await fetch('/api/technicians/jobs');
                      if (!jobsResponse.ok) {
                        throw new Error('Failed to fetch jobs');
                      }
                      const jobsData = await jobsResponse.json();
                      
                      setUserInfo({
                        user: { email: jobsData.userEmail },
                        isTechAdmin: jobsData.userRole === 'tech_admin'
                      });
                      
                      const eventsByDate = {};
                      jobsData.jobs?.forEach(job => {
                        let jobDate = job.job_date || job.due_date || job.start_time;
                        
                        if (jobDate) {
                          const dateKey = jobDate.split('T')[0];
                          if (!eventsByDate[dateKey]) {
                            eventsByDate[dateKey] = [];
                          }
                          eventsByDate[dateKey].push({
                            id: job.id,
                            title: job.customer_name || job.job_description || 'Job Service',
                            time: job.start_time ? job.start_time.split('T')[1]?.split('.')[0] : 'No time set',
                            assignee: job.technician_phone || job.technician_name || 'Unassigned',
                            location: job.customer_address || job.job_location || 'No address',
                            customerName: job.customer_name || 'N/A',
                            customerEmail: job.customer_email || 'N/A',
                            customerPhone: job.customer_phone || 'N/A',
                            customerAddress: job.customer_address || 'N/A',
                            productName: job.job_description || 'Job Service',
                            quantity: 1,
                            technician: job.technician_phone || job.technician_name,
                            date: dateKey,
                            jobType: job.job_type || 'Service',
                            totalAmount: job.estimated_cost || job.quotation_total_amount || job.actual_cost || 0,
                            subtotal: job.estimated_cost || job.quotation_subtotal || 0,
                            status: job.status || job.job_status || 'New',
                            priority: job.priority || 'Medium',
                            jobStatus: job.job_status || job.status || 'New',
                          });
                        }
                      });
                      
                      setCalendarEvents(eventsByDate);
                      
                    } catch (error) {
                      console.error('Error refreshing data:', error);
                      toast.error('Failed to refresh calendar data');
                    } finally {
                      setLoading(false);
                    }
                  };
                  fetchUserInfoAndJobs();
                }}
              >
                Refresh Jobs
              </Button>
            </div>
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="font-bold text-xl">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="gap-1 grid grid-cols-7">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 font-medium text-slate-600 text-sm text-center">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {days.map((day, index) => {
                    const dateKey = day ? formatDateKey(year, month, day) : null;
                    const events = dateKey ? calendarEvents[dateKey] || [] : [];
                    const isSelected = dateKey === selectedDate;
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] p-2 border border-slate-200 cursor-pointer transition-colors ${
                          day ? 'hover:bg-slate-50' : 'bg-slate-50'
                        } ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
                        onClick={() => day && setSelectedDate(dateKey)}
                      >
                        {day && (
                          <>
                            <div className="mb-1 font-medium text-slate-900">{day}</div>
                            <div className="space-y-1">
                              {events.slice(0, 2).map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className={`${getTaskColor(event.type)} text-white text-xs p-1 rounded cursor-pointer hover:opacity-80`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="opacity-90 text-xs">{event.time}</div>
                                </div>
                              ))}
                              {events.length > 2 && (
                                <div className="text-slate-500 text-xs text-center">
                                  +{events.length - 2} more
                                </div>
                              )}
                            </div>
                            {events.length > 0 && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (events.length === 1) {
                                      const event = events[0];
                                      if (event.status === 'Active' || event.jobStatus === 'Active') {
                                        handleEndJob(event);
                                      } else {
                                        handleStartJob(event);
                                      }
                                    } else {
                                      setSelectedDate(dateKey);
                                    }
                                  }}
                                  className={`w-full text-white text-xs ${
                                    events.length === 1 && (events[0].status === 'Active' || events[0].jobStatus === 'Active')
                                      ? 'bg-red-600 hover:bg-red-700 border-red-600'
                                      : 'bg-green-600 hover:bg-green-700 border-green-600'
                                  }`}
                                >
                                  {events.length === 1 ? (
                                    <>
                                      {events[0].status === 'Active' || events[0].jobStatus === 'Active' ? (
                                        <>
                                          <Play className="mr-1 w-3 h-3" />
                                          End Job
                                        </>
                                      ) : (
                                        <>
                                          <Play className="mr-1 w-3 h-3" />
                                          Start Job
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    'View Jobs'
                                  )}
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Date Events */}
          {selectedDate && calendarEvents[selectedDate] && (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Events for {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calendarEvents[selectedDate].map((event, index) => (
                    <div key={index} className="hover:bg-slate-50 p-4 border rounded-lg transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900">{event.title}</h3>
                        <Badge className={getTaskColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                                              <div className="gap-4 grid grid-cols-2 text-slate-600 text-sm">
                          <div>
                            <p><Clock className="inline mr-1 w-4 h-4" />{event.time}</p>
                            <p><User className="inline mr-1 w-4 h-4" />{event.assignee}</p>
                          </div>
                          <div>
                            <p><MapPin className="inline mr-1 w-4 h-4" />{event.location}</p>
                            <p><Eye className="inline mr-1 w-4 h-4" />{event.customerName}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.status === 'Active' || event.jobStatus === 'Active') {
                                handleEndJob(event);
                              } else {
                                handleStartJob(event);
                              }
                            }}
                            className={`flex items-center gap-1 text-white text-xs ${
                              event.status === 'Active' || event.jobStatus === 'Active'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            {event.status === 'Active' || event.jobStatus === 'Active' ? 'End Job' : 'Start Job'}
                          </Button>
                        </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

      {/* VIN Scanner */}
      <VinScanner
        isOpen={showVinScanner}
        onClose={handleCloseVinScanner}
        jobId={selectedJob?.id}
        customerName={selectedJob?.customerName}
        customerEmail={selectedJob?.customerEmail}
      />

      {/* Job Details Popup */}
      <JobDetailsPopup
        job={selectedJob}
        isOpen={jobDetailsOpen}
        onClose={() => setJobDetailsOpen(false)}
      />

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onJobVerified={handleJobVerified}
        expectedJobNumber={selectedJob?.jobNumber || selectedJob?.id}
      />

      {/* Vehicle Details Popup */}
      <VehicleDetailsPopup
        isOpen={showVehicleDetails}
        onClose={() => setShowVehicleDetails(false)}
        onVehicleAdded={handleVehicleAdded}
        jobData={selectedJob}
      />

      {/* Start Job Modal */}
      {showStartJobModal && selectedJob && (
        <StartJobModal
          isOpen={showStartJobModal}
          onClose={() => setShowStartJobModal(false)}
          job={selectedJob}
          onJobStarted={handleJobStarted}
          onJobCompleted={handleJobCompleted}
        />
      )}
    </div>
  );
}