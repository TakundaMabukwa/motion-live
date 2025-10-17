// app/api/stock/technician/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ProcessedStockItem {
  id: string;
  quantity: string;
  technician_email: string;
  code: string;
  description: string;
  supplier: string;
  cost_excl_vat_zar: number;
  usd: number;
  stock_type: string;
}

// Helper function to map suppliers to stock types
function getStockTypeFromSupplier(supplier: string): string {
  const supplierTypeMap: { [key: string]: string } = {
    'ITURAN': 'Tracking Equipment',
    'VUEWO': 'Electronics',
    'METTAX': 'Electronics',
    'MOVON': 'Electronics',
    'PFK': 'Hardware',
    'TID': 'Electronics',
    'TECHNOTON': 'Hardware',
    'CST ELECTRONICS': 'Electronics',
    'HARTECH': 'Hardware',
    'LOCAL': 'Accessories',
    'MIX': 'Accessories',
    'REGAL SECURITY': 'Hardware',
    'NANOTECH': 'Accessories',
    'SUNFIELD NEW ENERGY': 'Hardware',
    'SANJI': 'Accessories',
    'TechCorp': 'Tracking Equipment',
    'MobileNet': 'Accessories',
    'HardwareCo': 'Hardware',
    'SignalTech': 'Accessories',
    'PowerCorp': 'Hardware'
  };
  
  return supplierTypeMap[supplier] || 'Hardware';
}

// Define the complete inventory structure here as fallback
const COMPLETE_INVENTORY = {
  "CST ELECTRONICS": {
    "ML9092 TSL/2.2K": { "description": "TAG READER WITH 2K RESISTOR 24V", "count": 0 }
  },
  "HARTECH": {
    "FLAT PANIC BUTTON": { "description": "FLAT PANIC BUTTON ROUND", "count": 0 },
    "BUZZER": { "description": "BUZZER (24V 95dB 30 X 16mm PNL MNT WTH WIRES)", "count": 0 },
    "Panic Button Steel": { "description": "SKY- Industrial Panic", "count": 0 }
  },
  "ITURAN": {
    "P08STARLINK4GFUEL": { "description": "SKYLINK PRO FUEL PROBE ONLY", "count": 0 },
    "PR3300 - SCOUT HARNESS": { "description": "RS232 ADAPTOR", "count": 0 },
    "P08LINADAPTOR": { "description": "SKYLINK LIN ADAPTER", "count": 0 },
    "P08SCOOTER": { "description": "Skylink Motorbike", "count": 0 },
    "P03STARLINKBATTERY": { "description": "Skylink Lite", "count": 0 },
    "PR08CIA": { "description": "CIA KIT", "count": 0 },
    "P08PALSTAR": { "description": "Skylink Voice Kit Unit", "count": 0 },
    "PR09": { "description": "Driver Safety Harness", "count": 0 },
    "P08KETEXPENSESLINS": { "description": "SKYLINK KEYPAD", "count": 0 },
    "P08MSAFETY": { "description": "Skylink M Safety Kit", "count": 0 },
    "P08STARLINKTM": { "description": "Skylink Scout Advanced 24v", "count": 0 },
    "P08KETWPROOF": { "description": "KEYBOARD WATERPROOF FOR STARLINK", "count": 0 },
    "P03ONBATIGNAUMICROSIM": { "description": "Ituran StarLink OnBatt 4G AU IGN MicroSim", "count": 0 },
    "P08STARLINK3GEUR": { "description": "SKY - STARLINK UNIT", "count": 0 },
    "P08STARLINKTRAILER4GLA": { "description": "SKY-Trailer/asset 4G", "count": 0 },
    "P08CASAE": { "description": "Skylink I DATA", "count": 0 },
    "PR08": { "description": "SKY - EXTERNAL GPS", "count": 0 },
    "P08OBDSAFETY": { "description": "Skylink OBD Plugin", "count": 0 },
    "P30DALASKEY": { "description": "DALLAS TAG ITURAN", "count": 0 },
    "PR01 - 4G RF": { "description": "SKY-  4G RF PRO", "count": 0 },
    "P08ICAN2": { "description": "Skylink I CAN", "count": 0 },
    "P08STARLINK4GAU": { "description": "ITURAN STARLINK 4G AU", "count": 0 },
    "P05KITNZR": { "description": "SKY - STARLINK SPARE HARNESS", "count": 0 },
    "E CAN": { "description": "SKY - J1708 E-CAN", "count": 0 },
    "P03STARLINKONBATGREEN": { "description": "SKY - STARLINK ONBATT 2G", "count": 0 }
  },
  "LOCAL": {
    "HS-SSD-WAVE(S)-2048G": { "description": "HIKVISION 2TB SSD - LOCAL SUPPLIERS", "count": 0 },
    "HS-SSD-WAVE(S)-1024G": { "description": "HIKVISION 1TB SSD - LOCAL SUPPLIERS", "count": 0 },
    "MC26": { "description": "SKY - ROLLER SHUTTER - REAR DOOR SENSOR", "count": 0 }
  },
  "MIX": {
    "440FT0599": { "description": "FM GSM ANTENNA (PENTA-BAND GSM ANT)", "count": 0 },
    "440FT0653": { "description": "FM COMMUNICATOR (FM3617i)", "count": 0 },
    "440FT0694-1": { "description": "FM GPS ANTENNA (FM GLONASS GPS ANT)", "count": 0 },
    "FM CODE PLUG HARNESS": { "description": "FM CODE PLUG HARNESS", "count": 0 },
    "FM MAIN HARNESS MP5": { "description": "FM MAIN HARNESS MP5", "count": 0 },
    "440FT0073": { "description": "FM Blue Driver Tag", "count": 0 },
    "FM3316": { "description": "FM 3316 Communicator", "count": 0 },
    "440FT0808": { "description": "FM 3316 Replacement Battery", "count": 0 },
    "440FT09": { "description": "BEAME BEACON U0061MT - MK6", "count": 0 }
  },
  "MOVON": {
    "MDAS-GPS": { "description": "MOVON GPS", "count": 0 },
    "MDAS-VIBRATOR": { "description": "SEAT-VIBRATOR FOR MDAS-9", "count": 0 },
    "MOVON - R CAMERA": { "description": "Rear Camera + 5 m Cable", "count": 0 },
    "MOVON - CAN READER": { "description": "Contactless Can Reader", "count": 0 },
    "MDAS-9 (32G)": { "description": "MDAS MEMORY CARD (32G)", "count": 0 },
    "MDAS-9": { "description": "Advanced Driver Assistance System", "count": 0 }
  },
  "PFK": {
    "852631": { "description": "NON-IR CAMERA", "count": 0 },
    "720001": { "description": "PFK - 720 INTERLOCK", "count": 0 },
    "852632": { "description": "OUTSIDE INFRARED CAMERA", "count": 0 },
    "720420S": { "description": "PFK AUTO HARNESS 24-WAY VBS LOW", "count": 0 },
    "852630": { "description": "INFRARED CAMERA", "count": 0 },
    "660803": { "description": "PFK - MIC + SPEAKERS", "count": 0 },
    "660850": { "description": "PFK - PANIC BUTTON", "count": 0 },
    "852454": { "description": "PFK - EXT CABLE 5M", "count": 0 },
    "720853": { "description": "COMMS Cable", "count": 0 },
    "852452": { "description": "PFK - CABLE RCA+DC-MINIDIN 75R 10M", "count": 0 },
    "852453": { "description": "CABLE RCA+MINIDIN 75R 15M", "count": 0 },
    "852450": { "description": "PFK - EXT CABLE 3M", "count": 0 },
    "852650": { "description": "BRACKET", "count": 0 },
    "720960": { "description": "PFK - OVERIDE SWITCH", "count": 0 },
    "720652S": { "description": "BLOW TUBE PACK OF 25", "count": 0 }
  },
  "REGAL SECURITY": {
    "TAMP001": { "description": "WATERPROOF ANTI TAMPER BOX", "count": 0 }
  },
  "TECHNOTON": {
    "DUT-E ATS-4": { "description": "DUT-E ATS-4-CALIBRATION TOOL", "count": 0 },
    "DUT-E FASTENING PLATE PACK": { "description": "DUT-E FASTENING PLATE PACK.10 PCS", "count": 0 },
    "DUT-E FUEL TANK": { "description": "DUT-E FUEL TANK HOLE PLUG", "count": 0 },
    "DUT-E KDC 1000": { "description": "DUT-E KDC 1000MM PROBE EXTENTION", "count": 0 },
    "DUT-E KDC 500": { "description": "DUT-E KDC 500MM PROBE EXTENTION", "count": 0 },
    "DUT-E FP CT": { "description": "DUT-E FASTENING PLATE (CONCAVE)", "count": 0 },
    "DUT-E S6 2SC-100": { "description": "DUT-E 1M EXTENTION CABLE FOR FUEL PROBE", "count": 0 },
    "DUT-E S6 SC-CW-150": { "description": "DUT-E 1.5M EXTENTION CABLE FOR FUEL PROBE", "count": 0 },
    "DUT-E 3SC": { "description": "DUT-E T CONNECTOR", "count": 0 },
    "DUT-E CAN L=1000": { "description": "DUT-E 1000MM FUEL PROBE", "count": 0 },
    "DUT-E S6 2SC-300": { "description": "DUT-E 3M EXTENTION CABLE FOR FUEL PROBE", "count": 0 },
    "DUT-E CABLE S6 SC-CW-700": { "description": "DUT-E 7M MAIN HARNESS FOR FUEL PROBE", "count": 0 }
  },
  "TID": {
    "TD-G720A": { "description": "TD-G720A PoC Radio without NFC, network version A", "count": 0 },
    "TD-Extra bracket for TD-M6 mobile radio": { "description": "Extra bracket for TD-M6 mobile radio", "count": 0 },
    "TD-Extra car power cord for TD-M6 mobile radio": { "description": "Extra car power cord for TD-M6 mobile radio", "count": 0 },
    "TD-Extra GPS antenna for TD-M6 mobile radio": { "description": "Extra GPS antenna for TD-M6 mobile radio", "count": 0 },
    "TD-Extra LTE antenna for TD-G700 radio": { "description": "Extra LTE antenna for TD-G700 radio", "count": 0 },
    "TD-Extra LTE antenna for TD-M6 mobile radio": { "description": "Extra LTE antenna for TD-M6 mobile radio", "count": 0 },
    "TD-Extra microphone for TD-M6 mobile radio": { "description": "Extra microphone for TD-M6 mobile radio", "count": 0 },
    "TD-USB charging Cable with Power plug for TD-G720": { "description": "USB charging Cable with Power plug for TD-G720", "count": 0 },
    "TD-BLUETOOTH BUTTON": { "description": "TD-TID BLUETOOTH BUTTON COMPATIBLE WITH REAL-PTT", "count": 0 },
    "TD-G720": { "description": "TD-G720 Linux PoC radio with NFC, network version", "count": 0 },
    "TD-M6": { "description": "TD-M6 PoC Mobile Radio network version A,", "count": 0 },
    "NFC Tags (Round Type)": { "description": "NFC Tags (Round Type)", "count": 0 },
    "TD-Extra Desk Charger for TD-G720 radio": { "description": "Extra Desk Charger for TD-G720 radio", "count": 0 }
  },
  "VUEWO": {
    "VW-203": { "description": "A2 DRIVER FACING CAMERA 720P", "count": 0 },
    "VW-302": { "description": "PLATE-EMBEDDED CAMERA 720P", "count": 0 },
    "VW-402": { "description": "SIDE VIEW WATERPROOF CAMERA", "count": 0 },
    "VW-400": { "description": "AHD SONY CMOS OUTSIDE CAMERA", "count": 0 },
    "VW-VM-709": { "description": "INDUSTRIAL SCREEN 7 INCH", "count": 0 },
    "VW-4S1-GF": { "description": "4CH DUAL SD CARD MDVR, COMPACT SIZE", "count": 0 },
    "VW-A4-AI": { "description": "AI DASHCAM", "count": 0 },
    "VW-DMS01": { "description": "DMS CAMERA (DRIVER FACING)", "count": 0 },
    "VW-808": { "description": "PEDESTRIAN DETECTION CAMERA", "count": 0 },
    "VW- A2 POWER CABLES": { "description": "A2 POWER CABLES", "count": 0 },
    "VW-800": { "description": "PEDESTRIAN DETECTION CAMERA 1080P", "count": 0 },
    "VW-WIFI DONGLE": { "description": "WIFI DONGLE FOR MDVR", "count": 0 },
    "VW-4H-GF": { "description": "4CH FHD/AHD HDD MDVR", "count": 0 },
    "VW-8H1-GF": { "description": "8CH FHD/AHD HDD MDVR", "count": 0 },
    "VW-502": { "description": "DUAL LENS VEHICLE AHD CAMERA", "count": 0 },
    "VW-502-F": { "description": "ROAD FACING 1080P, 2.5mm LENS, PAL", "count": 0 },
    "VW-A2-2GFW / A3": { "description": "DUAL DASHCAM 4G, GPS", "count": 0 },
    "VW-TF-256": { "description": "SD CARD 256", "count": 0 },
    "VW-306": { "description": "720P AHD ROAD FACING", "count": 0 },
    "VW-306M": { "description": "720 AHD DRIVER FACING CAMERA", "count": 0 },
    "VW-EC-5": { "description": "5 METER 4 PIN AVIATION CABLE", "count": 0 },
    "VW-300": { "description": "VEHICLE AHD REAR VIEW CAMERA", "count": 0 },
    "VW-MEC-5": { "description": "EXTENSION CABLE FOR A3 DASHCAM", "count": 0 },
    "VW-ADAS": { "description": "ADAS CAMERA (ROAD FACING AI)", "count": 0 },
    "VW-EC6-5": { "description": "EXTENTION CABLE 6 PIN 5 METER", "count": 0 },
    "VW-DVR GPS": { "description": "DVR-GPS ANTENNA", "count": 0 },
    "VW-DVR GSM": { "description": "DVR-GSM ANTENNA", "count": 0 },
    "VW-A2 GPS": { "description": "A2 GPS ANTENNA", "count": 0 },
    "VW-A2 MOUNTING BRACKET": { "description": "A2 MOUNTING BRACKET", "count": 0 },
    "VW-303": { "description": "1080P, DRIVER FACING, BUILT IN MIC, IR LED PAL", "count": 0 },
    "VW-304": { "description": "720P AHD DRIVER FACING", "count": 0 },
    "VW-4S1-AI": { "description": "5CH AI MDVR", "count": 0 },
    "VW-100": { "description": "AHD SONY CMOS IN CAB VIEW", "count": 0 },
    "VW-VM-701": { "description": "7\" TFT LCD VEHICLE MONITOR", "count": 0 },
    "VW-SD-512": { "description": "512GB SD CARD", "count": 0 },
    "VW-100IP": { "description": "IP CAMERA DRIVER FACING", "count": 0 },
    "VW-S480": { "description": "2.5\" SSD 480 GB", "count": 0 },
    "VW-EC-3": { "description": "3 METER 4 PIN AVIATION CABLE", "count": 0 },
    "VW-SP01": { "description": "ALERTS SPEAKER FOR AI", "count": 0 },
    "VW-MIC": { "description": "EXTERNAL MIC VW", "count": 0 },
    "VW-DMS01 - BRACKET": { "description": "DMS01-BRACKET", "count": 0 },
    "VW-A3-POWER CABLE": { "description": "A3-POWER CABLE", "count": 0 },
    "VW-EC-10": { "description": "10 METER 4 PIN AVIATION CABLE", "count": 0 }
  },
  "NANOTECH": {
    "NANOTECH WINDSHIELD PROTECTOR": { "description": "WINDSHIELD PROTECTOR", "count": 0 }
  },
  "METTAX": {
    "MTX-MC904 EU": { "description": "MDVR MINI", "count": 0 },
    "MTX - SD CARD": { "description": "SD CARD 512GB", "count": 0 },
    "MTX-MC820E": { "description": "ROAD FACING ADAS CAM", "count": 0 },
    "MTX-MC821B": { "description": "DRIVER FACING A PILLAR", "count": 0 },
    "MTX-MC833": { "description": "DRIVER FACING CAM NO AI", "count": 0 },
    "MTX-MC804A": { "description": "REAR VIEW 1080P CAMERA", "count": 0 },
    "MTX-MC807I": { "description": "IP CAMERA", "count": 0 },
    "MTX-MC808K": { "description": "OUTSIDE SIDE VIEW CAM", "count": 0 },
    "MTX-5M IPC 6 PIN": { "description": "5M IP CAMERA CABLE 6 PINS", "count": 0 },
    "MTX-SPEAKER": { "description": "SPEAKER", "count": 0 },
    "MTX-MC401L": { "description": "4G DASHCAM 4CH", "count": 0 },
    "MTX-CABLE 15M": { "description": "15 METER EXT CABLE", "count": 0 },
    "MTX-CABLE 5M": { "description": "5 METER EXT CABLE", "count": 0 },
    "MTX-CABLE 10M": { "description": "10 METER EXT CABLE", "count": 0 }
  },
  "SUNFIELD NEW ENERGY": {
    "SOLAR PANELS": { "description": "FLEXIBLE SOLAR PANEL", "count": 0 }
  },
  "SANJI": {
    "SKY-EARLY WARNING": { "description": "SKY 2 FOB + RECEIVER", "count": 0 }
  },
  "Temperature Probe": { "description": "SKY - Temperature Probe", "count": 0 }
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: technicianStock, error } = await supabase
      .from('tech_stock')
      .select('stock, technician_email')
      .eq('technician_email', user.email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching technician stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Use the technician's stock data if it exists, otherwise use the complete inventory
    const stockData = technicianStock?.stock || COMPLETE_INVENTORY;
    const processedStock: ProcessedStockItem[] = [];

    // Parse the nested structure: supplier -> item_code -> {count, description}
    Object.entries(stockData).forEach(([supplier, supplierItems]) => {
      Object.entries(supplierItems as any).forEach(([itemCode, itemData]: [string, any]) => {
        processedStock.push({
          id: `${supplier}-${itemCode}`, // Create unique ID
          quantity: (itemData.count || 0).toString(), // Always include count, default to 0
          technician_email: user.email!,
          code: itemCode,
          description: itemData.description || 'No description available',
          supplier: supplier,
          cost_excl_vat_zar: 0,
          usd: 0,
          stock_type: getStockTypeFromSupplier(supplier)
        });
      });
    });

    console.log(`Processed ${processedStock.length} stock items for technician ${user.email}`);

    return NextResponse.json({ 
      stock: processedStock,
      total_items: processedStock.length
    });
  } catch (error) {
    console.error('Error in technician stock GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, new_quantity } = body as { id: string; new_quantity: number };
    if (!id || typeof new_quantity !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing technician stock
    const { data: technicianStock, error } = await supabase
      .from('tech_stock')
      .select('stock')
      .eq('technician_email', user.email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching technician stock for PATCH:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stockData = technicianStock?.stock || {};

    // id format: "SUPPLIER-ITEMCODE"
    const splitIndex = id.indexOf('-');
    if (splitIndex === -1) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    const supplier = id.slice(0, splitIndex);
    const itemCode = id.slice(splitIndex + 1);

    // Ensure supplier object exists
    if (!stockData[supplier]) {
      stockData[supplier] = {};
    }

    if (!stockData[supplier][itemCode]) {
      stockData[supplier][itemCode] = { description: itemCode, count: new_quantity };
    } else {
      stockData[supplier][itemCode].count = new_quantity;
    }

    // Try to update existing tech_stock row for this technician
    const { data: updatedRows, error: updateError } = await supabase
      .from('tech_stock')
      .update({ stock: stockData })
      .eq('technician_email', user.email)
      .select();

    if (updateError) {
      console.error('Error updating technician stock:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      // No existing row; insert a new one
      const { error: insertError } = await supabase
        .from('tech_stock')
        .insert({ technician_email: user.email!, stock: stockData });

      if (insertError) {
        console.error('Error inserting technician stock:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'inserted' });
    }

    return NextResponse.json({ success: true, action: 'updated' });
  } catch (error) {
    console.error('Error in technician stock PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}