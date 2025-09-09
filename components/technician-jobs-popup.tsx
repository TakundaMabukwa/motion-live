"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Package } from 'lucide-react';

interface TechnicianJobsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTechnician: {
    name: string;
    email: string;
  } | null;
  technicianJobs: any[];
  technicianJobsLoading: boolean;
  onJobClick: (job: any) => void;
  getPriorityColor: (priority: string) => string;
}

export function TechnicianJobsPopup({
  isOpen,
  onClose,
  selectedTechnician,
  technicianJobs,
  technicianJobsLoading,
  onJobClick,
  getPriorityColor
}: TechnicianJobsPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {selectedTechnician?.name}'s Jobs
            {selectedTechnician?.email && (
              <span className="font-normal text-gray-500 text-sm">
                ({selectedTechnician.email})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {technicianJobsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
            <span className="ml-2 text-gray-600">Loading jobs...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="font-bold text-blue-600 text-2xl">{technicianJobs.length}</p>
                    <p className="text-blue-600 text-sm">Total Jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="font-bold text-green-600 text-2xl">
                      {technicianJobs.filter(job => job.status === 'completed' || job.status === 'Completed').length}
                    </p>
                    <p className="text-green-600 text-sm">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="font-bold text-yellow-600 text-2xl">
                      {technicianJobs.filter(job => job.status === 'pending' || job.status === 'Pending').length}
                    </p>
                    <p className="text-yellow-600 text-sm">Pending</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* List View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  All Jobs List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {technicianJobs.length === 0 ? (
                    <p className="py-4 text-gray-500 text-sm text-center">No jobs found for this technician</p>
                  ) : (
                    technicianJobs.map((job, index) => (
                      <div
                        key={index}
                        className="hover:bg-gray-50 hover:shadow-md p-3 border border-gray-200 rounded-lg transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          onJobClick(job);
                          onClose();
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">{job.customerName}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {job.date}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {job.time}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-gray-600 text-xs">
                          <p className="flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            <span>{job.productName}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <div 
                              className="border border-gray-300 rounded-full w-3 h-3"
                              style={{ backgroundColor: job.technicianColor }}
                            ></div>
                            <span>{job.technician}</span>
                          </div>
                          {job.priority && (
                            <Badge className={`text-xs ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </Badge>
                          )}
                          {job.status && (
                            <Badge variant="outline" className="text-xs">
                              {job.status}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
