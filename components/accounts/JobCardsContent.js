'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Wrench, 
  Clock, 
  CheckCircle, 
  Filter,
  Download
} from 'lucide-react';

export default function JobCardsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  // Mock data for job cards
  const jobCards = [
    {
      id: 'JC001',
      title: 'Equipment Installation',
      customer: 'ABC Company',
      status: 'active',
      priority: 'high',
      assignedTo: 'John Doe',
      startDate: '2024-01-15',
      estimatedHours: 8,
      description: 'Install new tracking system for fleet vehicles'
    },
    {
      id: 'JC002',
      title: 'System Maintenance',
      customer: 'XYZ Corp',
      status: 'completed',
      priority: 'medium',
      assignedTo: 'Jane Smith',
      startDate: '2024-01-10',
      estimatedHours: 4,
      description: 'Regular maintenance of existing tracking equipment'
    },
    {
      id: 'JC003',
      title: 'Equipment Repair',
      customer: 'DEF Industries',
      status: 'pending',
      priority: 'high',
      assignedTo: 'Mike Johnson',
      startDate: '2024-01-20',
      estimatedHours: 6,
      description: 'Repair malfunctioning GPS tracking device'
    }
  ];

  const filteredJobCards = jobCards.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Job Cards Management</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Job Card
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <Wrench className="w-4 h-4" />
            <span>Active Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search job cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredJobCards
              .filter(job => job.status === 'active')
              .map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Customer:</span>
                        <p className="text-gray-900">{job.customer}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Assigned To:</span>
                        <p className="text-gray-900">{job.assignedTo}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Start Date:</span>
                        <p className="text-gray-900">{job.startDate}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Est. Hours:</span>
                        <p className="text-gray-900">{job.estimatedHours}h</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="font-medium text-gray-500">Description:</span>
                      <p className="text-gray-900 mt-1">{job.description}</p>
                    </div>
                    <div className="flex items-center justify-end space-x-2 mt-4">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">Update Status</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto w-12 h-12 mb-4 text-gray-300" />
            <p>No pending job cards at the moment.</p>
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="mx-auto w-12 h-12 mb-4 text-gray-300" />
            <p>No completed job cards to display.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
