-- Run this SQL in your Supabase SQL Editor
-- It will create a function that joins public.users with auth.users

CREATE OR REPLACE FUNCTION get_users_with_auth(email_pattern TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  first_login BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role,
    u.first_login,
    u.created_at,
    au.last_sign_in_at
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.email ILIKE email_pattern
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_with_auth(TEXT) TO authenticated, service_role;
