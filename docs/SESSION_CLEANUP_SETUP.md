# Session Cleanup Setup for Digital Ocean Droplet

## Option 1: Using Node.js Script (Recommended)

1. SSH into your droplet
2. Navigate to your project directory
3. Make script executable:
```bash
chmod +x scripts/cleanup-sessions.js
```

4. Add to crontab (runs every 10 minutes):
```bash
crontab -e
```

Add this line:
```
*/10 * * * * cd /path/to/motion-live && node scripts/cleanup-sessions.js >> /var/log/session-cleanup.log 2>&1
```

## Option 2: Direct Database Call

1. Add to crontab:
```bash
crontab -e
```

Add this line (replace with your connection string):
```
*/10 * * * * psql "postgresql://user:pass@host:5432/db" -c "SELECT close_inactive_sessions();" >> /var/log/session-cleanup.log 2>&1
```

## Option 3: Using pg_cron (If Supabase supports it)

Run this SQL once:
```sql
SELECT cron.schedule('close-inactive-sessions', '*/10 * * * *', 'SELECT close_inactive_sessions();');
```

## Manual Testing

Test the cleanup function:
```bash
node scripts/cleanup-sessions.js
```

Or via SQL:
```sql
SELECT close_inactive_sessions();
```

## Verify Cron Job

Check if cron job is running:
```bash
crontab -l
tail -f /var/log/session-cleanup.log
```
