import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendUserCredentials } from '@/lib/email';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase env vars not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, tech_admin, energyrite, cost_code, company, created_at')
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error('GET /api/master/users error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, cost_code } = body || {};

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase env vars not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Authorization: require caller to be a master admin
    const authHeader = req.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer (.*)$/i);
    if (!tokenMatch) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const accessToken = tokenMatch[1];

    // Get user from token
    const { data: callerData } = await supabase.auth.getUser(accessToken);
    const caller = callerData?.user;
    if (!caller?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check role in users table
    const { data: callerRows } = await supabase.from('users').select('role').eq('id', caller.id).limit(1);
    const callerRole = callerRows && callerRows.length ? callerRows[0].role : null;
    if (callerRole !== 'master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create user in auth with default password
    const pw = '123456';
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: pw,
      email_confirm: true,
    });

    let userId: string | undefined;

    if (createError) {
      console.error('createUser error', createError.message);
      // Try to find an existing users row by email
      const { data: existingUsers } = await supabase.from('users').select('*').eq('email', email).limit(1);
      if (existingUsers && existingUsers.length) {
        userId = existingUsers[0].id;
      } else {
        // As a last resort, look up the auth user via admin.listUsers (paginated)
        try {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 100 });
          if (!listError && listData) {
            const ld = listData as unknown;
            if (typeof ld === 'object' && ld !== null) {
              const maybe = ld as Record<string, unknown>;
              const usersVal = maybe['users'];
              if (Array.isArray(usersVal)) {
                for (const u of usersVal) {
                  if (typeof u === 'object' && u !== null) {
                    const uObj = u as Record<string, unknown>;
                    const uEmail = uObj['email'];
                    const uId = uObj['id'];
                    if (typeof uEmail === 'string' && uEmail === email && typeof uId === 'string') {
                      userId = uId;
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('listUsers fallback error', e);
        }
      }
    } else {
      const createdUser = createData?.user;
      userId = createdUser?.id;
    }

    // Wait for the trigger-created users row to appear (trigger on auth.create_user may insert it).
    // We prefer updating that row rather than inserting a new one.
    let userRow = null;
    const start = Date.now();
    const pollTimeout = 20000; // wait up to 20s for the trigger to run
    while (Date.now() - start < pollTimeout) {
      const { data: rows } = await supabase.from('users').select('*').eq('id', userId).limit(1);
      if (rows && rows.length) {
        userRow = rows[0];
        break;
      }
      // wait briefly
      await new Promise((r) => setTimeout(r, 800));
    }

    if (userRow) {
      // Update role/company as requested on the existing row
      const { data: updated, error: updateErr } = await supabase.from('users').update({
        role: role ?? undefined,
        cost_code: cost_code ?? 'soltrack',
        company: 'Soltrack',
      }).eq('id', userId).select().single();
      if (updateErr) {
        console.error('Error updating users row by id:', updateErr);
        return NextResponse.json({ error: updateErr.message ?? String(updateErr) }, { status: 500 });
      }
      userRow = updated;
    } else {
      // If the trigger didn't create the row yet, try to find and update by email (possible pre-existing row)
      const { data: existingByEmail, error: byEmailErr } = await supabase.from('users').select('*').eq('email', email).limit(1);
      if (byEmailErr) {
        console.error('Error querying users by email:', byEmailErr);
        return NextResponse.json({ error: byEmailErr.message ?? String(byEmailErr) }, { status: 500 });
      }

      if (existingByEmail && existingByEmail.length) {
        const existing = existingByEmail[0];
        const { data: updated, error: updateErr } = await supabase.from('users').update({
          role: role ?? undefined,
          cost_code: cost_code ?? 'soltrack',
          company: 'Soltrack',
        }).eq('id', existing.id).select().single();
        if (updateErr) {
          console.error('Error updating users row by email:', updateErr);
          return NextResponse.json({ error: updateErr.message ?? String(updateErr) }, { status: 500 });
        }
        userRow = updated;
      } else {
        // No users row found: do not insert a new row here — the users row should be created by the auth trigger.
        const msg = 'Users row not yet created by auth trigger; please check your Supabase auth->db trigger or increase the polling timeout.';
        console.error(msg, { userId, email });
        return NextResponse.json({ error: msg, debug: { userId, email } }, { status: 500 });
      }
    }

  // If we successfully created the auth user above, send them credentials via the shared email helper
    let emailResultForResponse: unknown = undefined;
    if (!createError) {
      try {
        const systemName = 'Solflo';
        const systemUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

        // Await the email send but bound by a timeout so it doesn't hang indefinitely.
        const sendPromise = sendUserCredentials({ email, password: pw, role: role ?? '', systemName, systemUrl });
        const timeoutPromise = new Promise((res) => setTimeout(() => res({ success: false, error: 'email timeout' }), 8000));
        const emailResult = (await Promise.race([sendPromise, timeoutPromise])) as unknown;
        emailResultForResponse = emailResult;

        // Log diagnostic fields from the email helper so we can see if SMTP accepted the recipient
        type EmailSendResult = { messageId?: string; accepted?: string[]; rejected?: string[]; envelope?: Record<string, unknown>; success?: boolean; error?: string };
        const detailed = emailResult as unknown as EmailSendResult;
        if (!detailed || (detailed && !detailed.success)) {
          console.error('Failed to send credentials email:', detailed?.error ?? emailResult);
        } else {
          console.log('Credentials email sent to:', email, 'result:', {
            messageId: detailed.messageId,
            accepted: detailed.accepted,
            rejected: detailed.rejected,
            envelope: detailed.envelope,
          });
        }
      } catch (emailErr) {
        console.error('Error sending credentials email:', emailErr);
        emailResultForResponse = { success: false, error: String(emailErr) };
      }
    }

    // If createUser failed (duplicate email) but we located an existing auth user or users row,
    // notify the recipient that an account already exists (no password sent).
    if (createError) {
      try {
        const { sendExistingAccountNotification } = await import('@/lib/email');
        const systemName = 'Solflo';
        const systemUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
        const res = await sendExistingAccountNotification({ email, systemName, systemUrl });
        emailResultForResponse = res;
        console.log('Existing-account notification result:', res);
      } catch (e) {
        console.error('Error sending existing account notification:', e);
      }
    }

    return NextResponse.json({ user: userRow, emailResult: emailResultForResponse });
  } catch (err) {
    console.error('POST /api/master/users error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
