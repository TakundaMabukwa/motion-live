'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ClientSignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onComplete: (url: string) => void;
}

export default function ClientSignaturePad({ isOpen, onClose, job, onComplete }: ClientSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [clientName, setClientName] = useState('');
  const [signOffDate, setSignOffDate] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setSignOffDate(`${yyyy}-${mm}-${dd}`);
      setClientName(job?.customer_name || job?.client_name || '');
      setIsChecked(false);
      setHasSignature(false);
    }
  }, [isOpen, job]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(2, 2);
    };

    resizeCanvas();

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: '#000000',
      minWidth: 1.5,
      maxWidth: 3.0,
      velocityFilterWeight: 0.7,
    });

    pad.addEventListener('endStroke', () => {
      setHasSignature(!pad.isEmpty());
    });

    signaturePadRef.current = pad;

    return () => {
      pad.off();
    };
  }, [isOpen]);

  const handleClear = useCallback(() => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error('Please provide a signature');
      return;
    }
    if (!clientName.trim()) {
      toast.error('Please enter the client name');
      return;
    }
    if (!isChecked) {
      toast.error('Please confirm sign-off');
      return;
    }

    setIsSaving(true);
    try {
      const signatureData = signaturePadRef.current.toDataURL('image/png');

      const response = await fetch(`/api/job-cards/${job.id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          client_name: clientName.trim(),
          sign_off_date: signOffDate,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save');

      toast.success('Signature saved!');
      onComplete(result.url);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  }, [clientName, signOffDate, isChecked, job?.id, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="z-[100] fixed inset-0 flex items-center justify-center bg-black/60 p-2">
      <div className="bg-white shadow-2xl rounded-2xl w-full h-full max-w-[100vw] max-h-[100vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Client Sign-Off</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 gap-5 overflow-auto">
          {/* Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Job Number</Label>
              <Input value={job?.job_number || ''} readOnly className="bg-gray-50 h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Client Name *</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Date</Label>
              <Input type="date" value={signOffDate} readOnly className="bg-gray-50 h-11" />
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-3 shrink-0">
            <Checkbox
              id="signoff-confirm"
              checked={isChecked}
              onCheckedChange={(val) => setIsChecked(val === true)}
            />
            <Label htmlFor="signoff-confirm" className="text-sm text-gray-700 cursor-pointer select-none">
              I am happy with the work done and I sign off
            </Label>
          </div>

          {/* Signature Canvas */}
          <div className="flex-1 flex flex-col min-h-0">
            <Label className="text-sm font-medium text-gray-700 mb-2 shrink-0">Signature *</Label>
            <div className="relative flex-1 min-h-[200px] border-2 border-gray-300 rounded-xl bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full touch-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClear} type="button">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Clear
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasSignature || !isChecked || !clientName.trim()}
              className="bg-green-600 hover:bg-green-700 min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Signature'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
