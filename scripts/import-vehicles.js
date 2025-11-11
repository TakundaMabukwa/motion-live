#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to find column value with whitespace handling
function getColumnValue(row, ...possibleNames) {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    
    // Try trimmed versions
    const trimmedName = name.trim();
    if (row[trimmedName] !== undefined) return row[trimmedName];
    
    // Try finding by trimmed key match
    const foundKey = Object.keys(row).find(key => key.trim() === trimmedName);
    if (foundKey && row[foundKey] !== undefined) return row[foundKey];
  }
  return null;
}

async function importVehicles() {
  try {
    console.log('📖 Reading Excel file: new.xlsx');
    const workbook = XLSX.readFile('new.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${jsonData.length} rows in Excel file`);
    console.log('📋 Available columns:', Object.keys(jsonData[0] || {}).slice(0, 10), '...');

    const vehicles = jsonData.map((row, index) => {
      try {
        return {
          company: getColumnValue(row, 'Company Name:', 'Company Name', 'company'),
          fleet_number: getColumnValue(row, 'Fleet number:', 'Fleet number', 'fleet_number'),
          reg: getColumnValue(row, 'Reg:', 'Reg', 'reg'),
          make: getColumnValue(row, 'Make:', 'Make', 'make'),
          model: getColumnValue(row, 'Model:', 'Model', 'model'),
          vin: getColumnValue(row, 'Vin:', 'VIN:', 'VIN', 'Vin', 'vin'),
          engine: getColumnValue(row, 'Engine:', 'Engine', 'engine'),
          year: getColumnValue(row, 'Year:', 'Year', 'year'),
          colour: getColumnValue(row, 'Colour:', 'Color:', 'Colour', 'Color', 'colour'),
          skylink_trailer_unit_serial_number: getColumnValue(row, 'Skylink - Trailer Unit Serial number:'),
          skylink_trailer_unit_ip: getColumnValue(row, 'Skylink - Trailer Unit IP:'),
          sky_on_batt_ign_unit_serial_number: getColumnValue(row, 'Sky on batt - Ign unit Serial number:'),
          sky_on_batt_ign_unit_ip: getColumnValue(row, 'Sky on batt - Ign unit IP:'),
          skylink_voice_kit_serial_number: getColumnValue(row, 'Skylink - Voice kit - Serial number:'),
          skylink_voice_kit_ip: getColumnValue(row, 'Skylink - Voice kit - IP:'),
          sky_scout_12v_serial_number: getColumnValue(row, 'Sky Scout - 12v - Serial number:'),
          sky_scout_12v_ip: getColumnValue(row, 'Sky Scout - 12v - IP:'),
          sky_scout_24v_serial_number: getColumnValue(row, 'Sky Scout - 24v - Serial number:'),
          sky_scout_24v_ip: getColumnValue(row, 'Sky Scout - 24v - IP:'),
          skylink_pro_serial_number: getColumnValue(row, 'Skylink Pro - Serial number:'),
          skylink_pro_ip: getColumnValue(row, 'Skylink Pro - IP:'),
          skylink_sim_card_no: getColumnValue(row, 'Skylink sim card no:'),
          skylink_data_number: getColumnValue(row, 'Skylink data number:'),
          sky_safety: getColumnValue(row, 'Sky Safety:'),
          sky_idata: getColumnValue(row, 'Sky Idata:'),
          sky_ican: getColumnValue(row, 'Sky ICAN:'),
          industrial_panic: getColumnValue(row, 'Industrial Panic:'),
          flat_panic: getColumnValue(row, 'Flat Panic:'),
          buzzer: getColumnValue(row, 'Buzzer:'),
          tag: getColumnValue(row, 'Tag', 'Tag:'),
          tag_reader: getColumnValue(row, 'Tag Reader:', 'Tag Reader'),
          keypad: getColumnValue(row, 'Keypad:', 'Keypad'),
          keypad_waterproof: getColumnValue(row, 'Keypad (Waterproof)', 'Keypad (Waterproof):'),
          early_warning: getColumnValue(row, 'Early Warning:', 'Early Warning'),
          cia: getColumnValue(row, 'CIA:', 'CIA'),
          fm_unit: getColumnValue(row, 'FM Unit', 'FM Unit:'),
          sim_card_number: getColumnValue(row, 'Sim card number:', 'Sim card number'),
          data_number: getColumnValue(row, 'Data number:', 'Data number'),
          gps: getColumnValue(row, 'GPS:', 'GPS'),
          gsm: getColumnValue(row, 'GSM:', 'GSM'),
          account_number: getColumnValue(row, 'Account number:', 'Account number'),
          total_rental: parseFloat(getColumnValue(row, 'Total Rental:', 'Total Rental')) || null,
          total_sub: parseFloat(getColumnValue(row, 'Total Sub:', 'Total Sub')) || null,
          total_rental_sub: parseFloat(getColumnValue(row, 'Total Rental & Sub:', 'Total Rental & Sub')) || null,
        };
      } catch (error) {
        console.error(`❌ Error processing row ${index + 1}:`, error.message);
        return null;
      }
    }).filter(Boolean);

    console.log(`✅ Processed ${vehicles.length} valid vehicles`);

    if (vehicles.length === 0) {
      console.log('❌ No valid vehicles to import');
      return;
    }

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      
      console.log(`📤 Inserting batch ${batchNum}/${Math.ceil(vehicles.length/batchSize)}...`);
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`❌ Batch ${batchNum} error:`, error.message);
        
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('💡 Run the SQL in scripts/add-missing-columns.sql to add missing columns');
          return;
        }
      } else {
        inserted += data.length;
        console.log(`✅ Batch ${batchNum}: ${data.length} records inserted`);
      }
    }

    console.log(`🎉 Successfully imported ${inserted} vehicles`);

  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importVehicles();
}