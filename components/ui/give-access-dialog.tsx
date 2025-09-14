"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserPlus } from "lucide-react";

interface GiveAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function GiveAccessDialog({ open, onOpenChange, clientName }: GiveAccessDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [systems, setSystems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [systemsLoaded, setSystemsLoaded] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // Fetch systems when dialog opens (only if not already loaded)
  useEffect(() => {
    if (open && !systemsLoaded) {
      fetchSystems();
    }
  }, [open, systemsLoaded]);

  const fetchSystems = async () => {
    setLoadingSystems(true);
    try {
      const response = await fetch('/api/systems');
      if (response.ok) {
        const result = await response.json();
        setSystems(result.data || []);
        setSystemsLoaded(true);
      } else {
        console.error('Failed to fetch systems');
        setSystems([]);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
      setSystems([]);
    } finally {
      setLoadingSystems(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !role || !selectedSystem) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setIsSubmitting(true);
    setProgressMessage("Creating user account...");
    
    try {
      // Grant access in a single API call
      const response = await fetch('/api/users/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          role: role,
          systemId: selectedSystem,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant access');
      }

      const selectedSystemName = systems.find(s => s.id.toString() === selectedSystem)?.system_name || 'Unknown System';
      
      toast({
        variant: "success",
        title: "Access Granted Successfully!",
        description: `${email} has been granted ${role} access to ${selectedSystemName} for ${clientName}. Login credentials sent via email.`,
      });

      // Reset form and close dialog
      setEmail("");
      setRole("");
      setSelectedSystem("");
      setProgressMessage("");
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error granting access:', error);
      toast({
        variant: "destructive",
        title: "Access Grant Failed",
        description: error.message || 'Failed to grant access. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setProgressMessage("");
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail("");
      setRole("");
      setSelectedSystem("");
      setProgressMessage("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Grant Access
          </DialogTitle>
          <DialogDescription>
            Give access to {clientName} by creating a user account and assigning a role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="gap-4 grid py-4">
            <div className="gap-2 grid">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            
             <div className="gap-2 grid">
               <Label htmlFor="role">Role *</Label>
               <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select a role" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                   <SelectItem value="driver">Driver</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="gap-2 grid">
               <Label htmlFor="system">System *</Label>
               <Select value={selectedSystem} onValueChange={setSelectedSystem} disabled={isSubmitting || loadingSystems}>
                 <SelectTrigger>
                   <SelectValue placeholder={loadingSystems ? "Loading systems..." : "Select a system"} />
                 </SelectTrigger>
                 <SelectContent>
                   {systems.map((system) => (
                     <SelectItem key={system.id} value={system.id.toString()}>
                       {system.system_name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
          
          {isSubmitting && progressMessage && (
            <div className="py-2">
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progressMessage}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
               {isSubmitting ? (
                 <>
                   <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                   Creating Account...
                 </>
               ) : (
                 <>
                   <UserPlus className="mr-2 w-4 h-4" />
                   Grant Access
                 </>
               )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
