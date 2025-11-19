@echo off
echo Deploying Supabase Edge Function...

REM Replace YOUR_PROJECT_REF with your actual Supabase project reference ID
supabase functions deploy bulk-invoice-excel --project-ref YOUR_PROJECT_REF

echo Edge function deployed successfully!
echo Remember to set SUPABASE_SERVICE_ROLE_KEY in your edge function secrets
pause