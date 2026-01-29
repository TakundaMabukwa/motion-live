#!/bin/bash

# Session Cleanup Script for Digital Ocean Droplet
# Add to crontab: */10 * * * * /path/to/cleanup-sessions.sh

# Load environment variables
source /path/to/your/.env.local

# Run the cleanup function
psql "$DATABASE_URL" -c "SELECT close_inactive_sessions();"
