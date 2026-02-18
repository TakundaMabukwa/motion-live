const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importSRSVehicles() {
  const workbook = XLSX.readFile('./app/api/vehicles/SRS Spreadsheet.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} vehicles to import`);

  const vehicles = data.map(row => ({
    new_account_number: 'SRS-0001',
    company: 'SRS',
    reg: row['VEHICLE REGISTRATION']?.toString().trim() || null,
    fleet_number: row['FLEET NUMBER']?.toString().trim() || null,
    a2_dash_cam: row['CAMERA SERIAL ']?.toString().trim() || null,
    corpconnect_sim_no: row['SIM: ']?.toString().trim() || null,
    corpconnect_data_no: row['DATA_1']?.toString().trim() || null,
    sim_id: row['SIM ID']?.toString().trim() || null,
  }));

  console.log('Sample mapped vehicle:', vehicles[0]);
  console.log(`\nInserting ${vehicles.length} vehicles...`);

  const { data: inserted, error } = await supabase
    .from('vehicles_duplicate')
    .insert(vehicles)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Successfully inserted ${inserted.length} vehicles for SRS-0001`);
  }
}

importSRSVehicles();
