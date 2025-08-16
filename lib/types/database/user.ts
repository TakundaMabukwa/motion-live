/**
 * User database entity type
 * Represents a user in the users table
 */
export interface User {
  id: string; // uuid, references auth.users
  email: string;
  name?: string;
  avatar_url?: string;
  role?: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
