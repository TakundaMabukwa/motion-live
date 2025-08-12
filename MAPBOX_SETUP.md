# Mapbox Setup Guide

## Environment Variables

Create a `.env.local` file in your project root with the following content:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=eyJ1IjoicmVuZGVuaS1kZXYiLCJhIjoiY21kM2c3OXQ4MDJqczlqbzNwcDZvaCJ9.6skTnPcXqD7h24o9mfuQnw
```

## Important Notes

1. **File Location**: The `.env.local` file must be in the project root directory (same level as `package.json`)
2. **Naming**: Must be exactly `.env.local` (not `.env` or `.env.local.txt`)
3. **Restart Required**: After creating/updating the `.env.local` file, restart your Next.js development server
4. **Git Ignore**: The `.env.local` file is already in `.gitignore` and won't be committed to version control

## Verification

To verify the token is working:

1. Create the `.env.local` file with the token above
2. Restart your development server (`npm run dev` or `yarn dev`)
3. Navigate to an FC account page and click on the "Live Map" tab
4. The Mapbox map should load successfully

## Current Implementation

The VehicleMapView component now:
- Uses the hardcoded token as a fallback
- Shows all account vehicles as cards
- Updates cards with live data when available
- Displays live vehicle locations on the map
- Auto-refreshes every 30 seconds
- Shows vehicle status (Live/Offline) based on data availability

## Troubleshooting

If the map still doesn't load:

1. Check browser console for errors
2. Verify the `.env.local` file exists and has the correct content
3. Ensure you've restarted the development server
4. Check that `mapbox-gl` is installed (`npm list mapbox-gl`)
5. Clear browser cache and reload the page
