const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excelPath = 'components/accounts/NEW - Consolidated Solflo Template (3).xlsx';
const companiesPath = 'scripts/companies.json';

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

const companyMap = {};
companies.forEach(c => {
  const key = c.company.toLowerCase().trim();
  companyMap[key] = c.cost_code;
});

const vehicles = data.map(row => {
  const companyName = (row['Company Name: '] || '').toString().trim();
  const costCode = companyMap[companyName.toLowerCase()] || null;
  
  return {
    company: companyName || null,
    new_account_number: costCode,
    fleet_number: row['Fleet number: '] || null,
    reg: row['Reg: '] || null,
    make: row['Make: '] || null,
    model: row['Model: '] || null,
    vin: row['VIN: '] || null,
    engine: row['Engine: '] || null,
    year: row['Year: '] || null,
    colour: row['Colour: '] || null,
    skylink_trailer_unit_serial_number: row['Skylink Trailer Unit - Serial number:'] || null,
    skylink_trailer_unit_ip: row['Skylink Trailer Unit - IP: '] || null,
    sky_on_batt_ign_unit_serial_number: row['Sky On Batt Ign Unit - Serial number:'] || null,
    sky_on_batt_ign_unit_ip: row['Sky On Batt Ign Unit - IP: '] || null,
    skylink_voice_kit_serial_number: row['Skylink Voice Kit - Serial number:'] || null,
    skylink_voice_kit_ip: row['Skylink Voice Kit - IP: '] || null,
    sky_scout_12v_serial_number: row['Sky Scout 12V - Serial number:'] || null,
    sky_scout_12v_ip: row['Sky Scout 12V - IP: '] || null,
    sky_scout_24v_serial_number: row['Sky Scout 24V - Serial number:'] || null,
    sky_scout_24v_ip: row['Sky Scout 24V - IP: '] || null,
    skylink_pro_serial_number: row['Skylink Pro - Serial number:'] || null,
    skylink_pro_ip: row['Skylink Pro - IP: '] || null,
    skylink_sim_card_no: row['Skylink sim card no: '] || null,
    skylink_data_number: row['Skylink data number: '] || null,
    total_rental: row['Total Rental: '] || null,
    total_sub: row['Total Sub: '] || null
  };
});

console.log(`Total vehicles: ${vehicles.length}`);
console.log(`With cost codes: ${vehicles.filter(v => v.new_account_number).length}`);
console.log(`Sample:`, vehicles[0]);

(async () => {
  const batchSize = 100;
  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize);
    const { error } = await supabase.from('vehicles_duplicate').insert(batch);
    if (error) console.error(`Batch ${i}-${i+batch.length} error:`, error);
    else console.log(`Inserted ${i}-${i+batch.length}`);
  }
  console.log('Done!');
})();
