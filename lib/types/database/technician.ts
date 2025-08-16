/**
 * Technician database entity type
 * Represents a technician in the technicians table
 */
export interface Technician {
  id: string; // uuid
  user_id: string; // uuid, references auth.users
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  color: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // uuid
  updated_by?: string; // uuid
  is_admin?: boolean;
}
