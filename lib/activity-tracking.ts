import { createClient } from '@/lib/supabase/client';

export type ActivityAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'PAGE_VIEW' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'SEARCH' 
  | 'EXPORT' 
  | 'DOWNLOAD'
  | 'UPLOAD';

export interface ActivityLogParams {
  actionType: ActivityAction;
  actionDescription?: string;
  pageUrl?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: ActivityLogParams) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const sessionId = sessionStorage.getItem('session_id');

    await supabase.from('user_activity_logs').insert({
      session_id: sessionId,
      user_id: user.id,
      email: user.email,
      action_type: params.actionType,
      action_description: params.actionDescription,
      page_url: params.pageUrl || window.location.pathname,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      metadata: params.metadata
    });
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

export async function startSession() {
  try {
    console.log('startSession called');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user found');
      return;
    }

    console.log('User found:', user.email);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('User role:', userData?.role);

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        email: user.email,
        role: userData?.role
      })
      .select()
      .single();

    if (error) {
      console.error('Session insert error:', error);
      return;
    }

    if (data) {
      console.log('Session created:', data.id);
      sessionStorage.setItem('session_id', data.id);
      await logActivity({ 
        actionType: 'LOGIN', 
        actionDescription: 'User logged in' 
      });
    }
  } catch (error) {
    console.error('Session start error:', error);
  }
}

export async function endSession() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await logActivity({ 
      actionType: 'LOGOUT', 
      actionDescription: 'User logged out' 
    });

    await supabase
      .from('user_sessions')
      .update({ logout_time: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('logout_time', null);

    sessionStorage.removeItem('session_id');
  } catch (error) {
    console.error('Session end error:', error);
  }
}

export async function updateActivity() {
  try {
    const sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) return;

    const supabase = createClient();
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Activity update error:', error);
  }
}
