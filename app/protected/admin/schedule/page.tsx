"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Calendar, Package, Phone, Mail, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Function to convert color names to hex codes
const getColorHex = (colorName) => {
    const colorMap = {
        'blue': '#3B82F6',
        'violet': '#8B5CF6',
        'yellow': '#F59E0B',
        'maroon': '#DC2626',
        'black': '#1F2937',
        'red': '#EF4444',
        'green': '#10B981',
        'purple': '#8B5CF6',
        'orange': '#F97316',
        'pink': '#EC4899',
        'cyan': '#06B6D4',
        'indigo': '#6366F1',
        'emerald': '#059669',
        'teal': '#14B8A6',
        'lime': '#84CC16',
        'amber': '#F59E0B',
        'rose': '#F43F5E',
        'slate': '#64748B',
        'gray': '#6B7280',
        'zinc': '#71717A',
        'neutral': '#737373',
        'stone': '#78716C'
    };
    
    return colorMap[colorName?.toLowerCase()] || '#6B7280'; // Default to gray if color not found
};

export default function CalendarApp() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState('');
    const [jobs, setJobs] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
    const [teamAvailability, setTeamAvailability] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [technicianColors, setTechnicianColors] = useState({});

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            console.log('Fetching jobs for calendar...');
            const response = await fetch('/api/job-cards/schedule');
            console.log('Schedule API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Schedule API error:', errorText);
                throw new Error(`Failed to fetch jobs: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Fetched jobs:', data.jobs);
            console.log('Jobs by date:', data.jobsByDate);
            console.log('Total jobs:', data.total);
            
            // Group jobs by date
            const jobsByDate = {};
            const technicianJobs = {}; // Track all jobs for each technician
            const colors = {}; // Track technician colors
            
            if (!data.jobs || data.jobs.length === 0) {
                console.log('No jobs returned from API');
                setJobs({});
                setTechnicianColors({});
                setLoading(false);
                return;
            }
            
            data.jobs?.forEach(job => {
                console.log('Processing job:', job);
                console.log('Job date:', job.job_date);
                console.log('Technician name:', job.technician_name);
                console.log('Technician color:', job.technician_color);
                
                if (job.job_date && job.technician_name) {
                    const dateKey = job.job_date.split('T')[0]; // Extract date part only
                    console.log('Date key:', dateKey);
                    
                    if (!jobsByDate[dateKey]) {
                        jobsByDate[dateKey] = [];
                    }
                    
                    const jobData = {
                        id: job.id,
                        customerName: job.customer_name,
                        customerEmail: job.customer_email,
                        customerPhone: job.customer_phone,
                        customerAddress: job.job_location,
                        productName: job.job_description || 'Job Service',
                        quantity: 1,
                        technician: job.technician_name,
                        technicianEmail: job.technician_phone, // This contains the email
                        technicianColor: getColorHex(job.technician_color), // Convert color name to hex
                        time: job.start_time ? new Date(job.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD',
                        date: dateKey,
                        jobType: job.job_type,
                        status: job.status,
                        priority: job.priority,
                        totalAmount: job.estimated_cost || 0,
                        subtotal: job.estimated_cost || 0,
                        vehicleRegistration: job.vehicle_registration,
                        estimatedDuration: job.estimated_duration_hours
                    };
                    
                    console.log('Processed job data:', jobData);
                    jobsByDate[dateKey].push(jobData);
                    
                    // Track technician jobs for availability
                    if (!technicianJobs[job.technician_name]) {
                        technicianJobs[job.technician_name] = [];
                    }
                    technicianJobs[job.technician_name].push(jobData);
                    
                    // Track technician colors
                    colors[job.technician_name] = getColorHex(job.technician_color);
                } else {
                    console.log('Job skipped - missing date or technician:', { 
                        hasDate: !!job.job_date, 
                        hasTechnician: !!job.technician_name,
                        job: job 
                    });
                }
            });
            
            console.log('Jobs grouped by date:', jobsByDate);
            console.log('Technician colors:', colors);
            setJobs(jobsByDate);
            setTechnicianColors(colors);
            
            // Calculate team availability
            calculateTeamAvailability(technicianJobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const calculateTeamAvailability = (technicianJobs) => {
        const availability = {};
        
        Object.keys(technicianJobs).forEach(technicianName => {
            const jobs = technicianJobs[technicianName];
            const now = currentTime;
            
            // Check if technician is currently busy
            const isCurrentlyBusy = jobs.some(job => {
                if (!job.start_time) return false;
                const jobDate = new Date(job.date + 'T' + job.time);
                const jobEndTime = new Date(jobDate.getTime() + ((job.estimatedDuration || 2) * 60 * 60 * 1000));
                
                return now >= jobDate && now <= jobEndTime;
            });
            
            // Get today's jobs
            const today = now.toISOString().split('T')[0];
            const todaysJobs = jobs.filter(job => job.date === today);
            
            // Use technician email if available, otherwise use name
            const technicianEmail = jobs[0]?.technicianEmail || technicianName;
            const technicianColor = jobs[0]?.technicianColor || getColorHex('gray');
            
            availability[technicianEmail] = {
                isAvailable: !isCurrentlyBusy,
                todaysJobs: todaysJobs,
                totalJobs: jobs.length,
                technicianName: technicianName,
                technicianColor: technicianColor
            };
        });
        
        console.log('Team availability updated:', availability);
        setTeamAvailability(availability);
    };

    // Helper function to get priority color
    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Helper function to get priority text color for calendar display
    const getPriorityTextColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
            case 'high':
                return 'text-red-700';
            case 'medium':
                return 'text-yellow-700';
            case 'low':
                return 'text-green-700';
            default:
                return 'text-gray-700';
        }
    };

    useEffect(() => {
        fetchJobs();
        // Set today as selected date
        const today = new Date();
        const dateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
        setSelectedDate(dateKey);
    }, []);

    // Recalculate availability when current time changes or jobs change
    useEffect(() => {
        if (Object.keys(jobs).length > 0) {
            const technicianJobs = {};
            Object.values(jobs).flat().forEach(job => {
                if (!technicianJobs[job.technician]) {
                    technicianJobs[job.technician] = [];
                }
                technicianJobs[job.technician].push(job);
            });
            console.log('Recalculating availability for technicians:', Object.keys(technicianJobs));
            calculateTeamAvailability(technicianJobs);
        }
    }, [currentTime, jobs]);

    const getDaysInMonth = (date) => {
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

    const navigateMonth = (direction) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(prevDate.getMonth() + direction);
            return newDate;
        });
    };

    const formatDateKey = (year, month, day) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleDateClick = (day) => {
        if (day) {
            const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
            setSelectedDate(dateKey);
        }
    };

    const getEventsForDate = (day) => {
        if (!day) return [];
        const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
        return jobs[dateKey] || [];
    };

    const handleJobClick = (job) => {
        setSelectedJob(job);
        setJobDetailsOpen(true);
    };

    const selectedEvents = jobs[selectedDate] || [];
    const days = getDaysInMonth(currentDate);

    return (
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 min-h-screen">
            <div className="mx-auto max-w-7xl">
                {/* Header with Title and Legend */}
                <div className="mb-6">
                    <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
                        <div>
                            <h1 className="font-bold text-gray-900 text-3xl">Admin Schedule</h1>
                            <p className="mt-1 text-gray-600">Manage and view all scheduled jobs</p>
                        </div>
                        
                        {/* Technician Color Legend */}
                        {Object.keys(technicianColors).length > 0 && (
                            <Card className="lg:w-auto">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-gray-700 text-sm">Technician Colors</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(technicianColors).map(([name, color]) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <div 
                                                    className="border border-gray-300 rounded-full w-3 h-3"
                                                    style={{ backgroundColor: color }}
                                                ></div>
                                                <span className="text-gray-600 text-xs">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
                    {/* Calendar Section - Left Side */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 pb-4 rounded-t-lg text-white">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="font-bold text-2xl">
                                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => navigateMonth(-1)}
                                            className="bg-white/20 hover:bg-white/30 p-0 border-white/30 w-8 h-8 text-white"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => navigateMonth(1)}
                                            className="bg-white/20 hover:bg-white/30 p-0 border-white/30 w-8 h-8 text-white"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Days of week header */}
                                <div className="gap-0 grid grid-cols-7 bg-gray-50 mb-0 border-b">
                                    {DAYS.map(day => (
                                        <div key={day} className="p-3 font-medium text-gray-600 text-sm text-center">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar grid */}
                                <div className="gap-0 grid grid-cols-7 border border-gray-200 rounded-b-lg overflow-hidden">
                                    {days.map((day, index) => {
                                        const events = getEventsForDate(day);
                                        const dateKey = day ? formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                                        const isSelected = dateKey === selectedDate;
                                        const isToday = dateKey === new Date().toISOString().split('T')[0];

                                        return (
                                            <div
                                                key={index}
                                                className={`
                                                    min-h-[120px] p-2 border border-gray-100 cursor-pointer transition-all duration-200
                                                    ${day ? 'hover:bg-blue-50 hover:shadow-md' : 'bg-gray-25'}
                                                    ${isSelected ? 'bg-blue-100 border-blue-300 shadow-inner' : ''}
                                                    ${isToday ? 'bg-yellow-50 border-yellow-200' : ''}
                                                    ${!day ? 'bg-gray-50' : 'bg-white'}
                                                `}
                                                onClick={() => handleDateClick(day)}
                                            >
                                                {day && (
                                                    <>
                                                        <div className={`mb-2 font-medium text-sm ${
                                                            isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
                                                        }`}>
                                                            {day}
                                                            {isToday && (
                                                                <span className="bg-blue-100 ml-1 px-1.5 py-0.5 rounded-full text-blue-600 text-xs">
                                                                    Today
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {events.map((event, eventIndex) => (
                                                                <TooltipProvider key={eventIndex}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div
                                                                                className="shadow-sm hover:shadow-md p-2 border-l-4 rounded-lg text-xs transition-all duration-200 cursor-pointer"
                                                                                style={{
                                                                                    backgroundColor: `${event.technicianColor}15`,
                                                                                    borderLeftColor: event.technicianColor,
                                                                                    color: event.technicianColor
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleJobClick(event);
                                                                                }}
                                                                            >
                                                                                <div className="mb-1 font-semibold truncate">
                                                                                    {event.customerName}
                                                                                </div>
                                                                                <div className="opacity-90 mb-1 text-xs">
                                                                                    <Clock className="inline mr-1 w-3 h-3" />
                                                                                    {event.time}
                                                                                </div>
                                                                                <div className="flex items-center gap-1 mb-1">
                                                                                    <div 
                                                                                        className="rounded-full w-2 h-2"
                                                                                        style={{ backgroundColor: event.technicianColor }}
                                                                                    ></div>
                                                                                    <span className="opacity-80 text-xs">{event.technician}</span>
                                                                                </div>
                                                                                {event.priority && (
                                                                                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${getPriorityColor(event.priority)}`}>
                                                                                        {event.priority}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-xs">
                                                                            <div className="space-y-1">
                                                                                <p className="font-medium">{event.customerName}</p>
                                                                                <p className="text-sm">Time: {event.time}</p>
                                                                                <p className="text-sm">Technician: {event.technician}</p>
                                                                                <p className="text-sm">Type: {event.jobType}</p>
                                                                                {event.priority && (
                                                                                    <p className="text-sm">Priority: {event.priority}</p>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Side - Team Availability and Job Cards */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Team Availability Section */}
                        <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-lg text-white">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Team Availability
                                    </CardTitle>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={fetchJobs}
                                        className="bg-white/20 hover:bg-white/30 p-1 border-white/30 w-8 h-8 text-white"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {Object.keys(teamAvailability).length === 0 ? (
                                        <p className="text-gray-500 text-sm">No technicians assigned to jobs</p>
                                    ) : (
                                        Object.entries(teamAvailability).map(([technicianEmail, availability]) => (
                                            <div key={technicianEmail} className="flex justify-between items-center bg-gray-50 p-3 border border-gray-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    {availability.isAvailable ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div 
                                                                className="border border-gray-300 rounded-full w-3 h-3"
                                                                style={{ backgroundColor: availability.technicianColor }}
                                                            ></div>
                                                            <p className="font-medium text-sm">
                                                                {availability.technicianName || technicianEmail.split('@')[0]}
                                                            </p>
                                                        </div>
                                                        <p className="text-gray-500 text-xs">
                                                            {availability.todaysJobs.length} job(s) today
                                                        </p>
                                                        {technicianEmail.includes('@') && (
                                                            <p className="text-gray-400 text-xs">
                                                                {technicianEmail}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge 
                                                    variant={availability.isAvailable ? "default" : "secondary"}
                                                    className={availability.isAvailable ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}
                                                >
                                                    {availability.isAvailable ? "Available" : "Busy"}
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-gray-200 border-t">
                                    <p className="text-gray-500 text-xs">
                                        Last updated: {currentTime.toLocaleTimeString()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selected Date Jobs */}
                        <Card className="bg-white/80 shadow-xl backdrop-blur-sm border-0">
                            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg text-white">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Jobs for {selectedDate}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {selectedEvents.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No jobs scheduled for this date</p>
                                    ) : (
                                        selectedEvents.map((event, index) => (
                                            <div
                                                key={index}
                                                className="hover:bg-gray-50 hover:shadow-md p-3 border border-gray-200 rounded-lg transition-all duration-200 cursor-pointer"
                                                onClick={() => handleJobClick(event)}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-medium text-sm">{event.customerName}</h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.time}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2 text-gray-600 text-xs">
                                                    <p className="flex items-center gap-2">
                                                        <Package className="w-3 h-3" />
                                                        <span>{event.productName}</span>
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="border border-gray-300 rounded-full w-3 h-3"
                                                            style={{ backgroundColor: event.technicianColor }}
                                                        ></div>
                                                        <span>{event.technician}</span>
                                                    </div>
                                                    {event.priority && (
                                                        <Badge className={`text-xs ${getPriorityColor(event.priority)}`}>
                                                            {event.priority}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Job Details Dialog */}
            <Dialog open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-xl">Job Details</DialogTitle>
                    </DialogHeader>
                    {selectedJob && (
                        <div className="space-y-6">
                            {/* Customer Information */}
                            <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                                <h3 className="flex items-center gap-2 mb-3 font-semibold text-blue-900 text-lg">
                                    <User className="w-5 h-5" />
                                    Customer Information
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium">{selectedJob.customerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-blue-600" />
                                        <span>{selectedJob.customerEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                        <span>{selectedJob.customerPhone}</span>
                                    </div>
                                    {selectedJob.customerAddress && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 w-4 h-4 text-blue-600" />
                                            <span>{selectedJob.customerAddress}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Job Details */}
                            <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                                <h3 className="flex items-center gap-2 mb-3 font-semibold text-green-900 text-lg">
                                    <Calendar className="w-5 h-5" />
                                    Job Details
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-green-600" />
                                        <span><strong>Date:</strong> {selectedJob.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-green-600" />
                                        <span><strong>Time:</strong> {selectedJob.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="border border-gray-300 rounded-full w-4 h-4"
                                            style={{ backgroundColor: selectedJob.technicianColor }}
                                        ></div>
                                        <span><strong>Technician:</strong> {selectedJob.technician}</span>
                                    </div>
                                    {selectedJob.technicianEmail && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-green-600" />
                                            <span><strong>Technician Email:</strong> {selectedJob.technicianEmail}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-green-600" />
                                        <span><strong>Job Type:</strong> {selectedJob.jobType}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 text-green-600">📊</span>
                                        <span><strong>Status:</strong> {selectedJob.status}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 text-green-600">⚡</span>
                                        <span><strong>Priority:</strong> </span>
                                        <Badge className={getPriorityColor(selectedJob.priority)}>
                                            {selectedJob.priority}
                                        </Badge>
                                    </div>
                                    {selectedJob.vehicleRegistration && (
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 text-green-600">🚗</span>
                                            <span><strong>Vehicle:</strong> {selectedJob.vehicleRegistration}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Products */}
                            <div className="bg-purple-50 p-4 border border-purple-200 rounded-lg">
                                <h3 className="flex items-center gap-2 mb-3 font-semibold text-purple-900 text-lg">
                                    <Package className="w-5 h-5" />
                                    Products to Install
                                </h3>
                                <div className="bg-white p-4 border border-purple-200 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{selectedJob.productName}</p>
                                            <p className="text-gray-600 text-sm">Quantity: {selectedJob.quantity}</p>
                                        </div>
                                        <Badge className="bg-purple-500 text-white">
                                            R {selectedJob.subtotal?.toFixed(2) || selectedJob.totalAmount?.toFixed(2) || '0.00'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}