'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  QrCode, 
  Printer, 
  Download,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function JobQRCode({ 
  isOpen, 
  onClose, 
  jobCard 
}) {
  const [qrCodeData, setQrCodeData] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (isOpen && jobCard) {
      generateQRCode();
    }
  }, [isOpen, jobCard]);

  const generateQRCode = () => {
    if (!jobCard) return;

    // Create job information data
    const jobData = {
      job_number: jobCard.job_number,
      customer_name: jobCard.customer_name,
      customer_address: jobCard.customer_address,
      job_type: jobCard.job_type,
      job_status: jobCard.job_status,
      ip_address: jobCard.ip_address,
      parts_required: jobCard.parts_required,
      completion_date: jobCard.completion_date,
      technician_name: jobCard.technician_name,
      quotation_number: jobCard.quotation_number
    };

    const dataString = JSON.stringify(jobData);
    setQrCodeData(dataString);

    // Generate QR code using a free API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dataString)}`;
    setQrCodeUrl(qrCodeUrl);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the QR code');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job QR Code - ${jobCard?.job_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .job-info {
              margin-top: 20px;
              text-align: left;
            }
            .job-info h2 {
              margin: 0 0 10px 0;
              color: #2563eb;
            }
            .job-info p {
              margin: 5px 0;
              font-size: 14px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 300px;
              height: auto;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="job-info">
              <h2>Job Information</h2>
              <p><strong>Job Number:</strong> ${jobCard?.job_number || 'N/A'}</p>
              <p><strong>Customer:</strong> ${jobCard?.customer_name || 'N/A'}</p>
              <p><strong>Job Type:</strong> ${jobCard?.job_type || 'N/A'}</p>
              <p><strong>Status:</strong> ${jobCard?.job_status || 'N/A'}</p>
              <p><strong>IP Address:</strong> ${jobCard?.ip_address || 'N/A'}</p>
              <p><strong>Technician:</strong> ${jobCard?.technician_name || 'N/A'}</p>
              <p><strong>Completion Date:</strong> ${jobCard?.completion_date ? new Date(jobCard.completion_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="Job QR Code" />
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              Scan this QR code to view complete job information
            </p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `job-qr-${jobCard?.job_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded successfully');
  };

  if (!jobCard) return null;

  return (
         <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Job QR Code: {jobCard.job_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job Information Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Customer:</span>
                  <span className="ml-2">{jobCard.customer_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Job Type:</span>
                  <span className="ml-2">{jobCard.job_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2">{jobCard.job_status || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">IP Address:</span>
                  <span className="ml-2">{jobCard.ip_address || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

                     {/* QR Code */}
           {qrCodeUrl && (
             <div className="flex justify-center">
               <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                 <img 
                   src={qrCodeUrl} 
                   alt="Job QR Code" 
                   className="w-64 max-w-full h-64"
                 />
               </div>
             </div>
           )}

                     {/* Action Buttons */}
           <div className="flex flex-wrap justify-center gap-3">
             <Button 
               onClick={handlePrint}
               className="bg-blue-600 hover:bg-blue-700"
             >
               <Printer className="mr-2 w-4 h-4" />
               Print QR Code
             </Button>
             <Button 
               onClick={handleDownload}
               variant="outline"
             >
               <Download className="mr-2 w-4 h-4" />
               Download
             </Button>
           </div>

          <div className="text-gray-500 text-xs text-center">
            <p>This QR code contains complete job information</p>
            <p>Scan with any QR code reader to view details</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 