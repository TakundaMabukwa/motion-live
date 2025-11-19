@echo off
echo Installing dependencies...
npm install

echo Running inventory import...
node scripts/import-inventory-excel.js "%1"

pause