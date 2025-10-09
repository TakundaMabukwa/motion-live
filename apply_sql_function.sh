#!/bin/bash

# This script applies the updated technician validation SQL function to your Supabase project
# Usage: ./apply_sql_function.sh YOUR_SUPABASE_URL YOUR_SUPABASE_KEY

# Check if required arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 YOUR_SUPABASE_URL YOUR_SUPABASE_KEY"
    exit 1
fi

SUPABASE_URL=$1
SUPABASE_KEY=$2

echo "Applying technician booking validation function..."

# Execute the SQL function using curl
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "sql_string": "$(cat update_technician_validation.sql)"
}
EOF

echo -e "\nDone! The function should now be updated."
echo "Test the function using: SELECT * FROM check_technician_availability('Technician Name', '2023-06-15T10:00:00Z');"