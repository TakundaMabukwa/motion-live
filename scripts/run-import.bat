@echo off
echo 📦 Installing required packages...
npm install xlsx @supabase/supabase-js dotenv

echo 🚀 Running vehicle import...
node scripts/import-vehicles.js

echo ✅ Import completed!
pause