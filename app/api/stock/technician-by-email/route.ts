import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface InventoryItem {
  description: string;
  count: number;
}

interface SupplierInventory {
  [itemCode: string]: InventoryItem;
}

interface Inventory {
  [supplier: string]: SupplierInventory | InventoryItem;
}

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

function getStockTypeFromSupplier(supplier: string): string {
  const typeMap: { [key: string]: string } = {
    'VISIONWORKS': 'Tracking Equipment',
    'METTAX': 'Tracking Equipment',
    'NANOTECH': 'Accessories',
    'SUNFIELD NEW ENERGY': 'Hardware',
    'SANJI': 'Electronics'
  };
  return typeMap[supplier] || 'General';
}

const COMPLETE_INVENTORY: Inventory = {
  "VISIONWORKS": {
    "VW-4S1": { "description": "4CH FHD/AHD HDD MDVR", "count": 0 },
    "VW-8S1": { "description": "8CH FHD/AHD HDD MDVR", "count": 0 },
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const { data: technicianStock, error } = await supabase
      .from('tech_stock')
      .select('stock, technician_email')
      .eq('technician_email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching technician stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const techStockObj: Inventory = technicianStock?.stock || {};
    const mergedStock: Inventory = JSON.parse(JSON.stringify(COMPLETE_INVENTORY));

    Object.entries(techStockObj).forEach(([supplier, items]) => {
      if (!mergedStock[supplier]) mergedStock[supplier] = {};
      const supplierItems = items as SupplierInventory | InventoryItem;
      if ((supplierItems as InventoryItem).count !== undefined || (supplierItems as InventoryItem).description !== undefined) {
        const itemData = supplierItems as InventoryItem;
        const existing = (mergedStock[supplier] as SupplierInventory)[supplier] || {};
        (mergedStock[supplier] as SupplierInventory)[supplier] = {
          description: itemData.description ?? existing.description ?? supplier,
          count: typeof itemData.count === 'number' ? (itemData.count as number) : (existing.count ?? 0)
        };
      } else {
        Object.entries(supplierItems as SupplierInventory).forEach(([itemCode, itemData]) => {
          const existing = (mergedStock[supplier] as SupplierInventory)[itemCode] || {};
          (mergedStock[supplier] as SupplierInventory)[itemCode] = {
            description: itemData?.description ?? existing.description ?? itemCode,
            count: typeof itemData?.count === 'number' ? (itemData.count as number) : (existing.count ?? 0)
          };
        });
      }
    });

    const stockData = mergedStock;
    const processedStock: ProcessedStockItem[] = [];

    Object.entries(stockData).forEach(([supplier, supplierItems]) => {
      const supItems = supplierItems as SupplierInventory | InventoryItem;
      if ((supItems as InventoryItem).count !== undefined || (supItems as InventoryItem).description !== undefined) {
        const itemData = supItems as InventoryItem;
        processedStock.push({
          id: `${supplier}-${supplier}`,
          quantity: (itemData.count || 0).toString(),
          technician_email: email,
          code: supplier,
          description: itemData.description || 'No description available',
          supplier: supplier,
          cost_excl_vat_zar: 0,
          usd: 0,
          stock_type: getStockTypeFromSupplier(supplier)
        });
      } else {
        const supplierItemsTyped = supItems as SupplierInventory;
        Object.entries(supplierItemsTyped).forEach(([itemCode, itemData]) => {
          processedStock.push({
            id: `${supplier}-${itemCode}`,
            quantity: (itemData.count || 0).toString(),
            technician_email: email,
            code: itemCode,
            description: itemData.description || 'No description available',
            supplier: supplier,
            cost_excl_vat_zar: 0,
            usd: 0,
            stock_type: getStockTypeFromSupplier(supplier)
          });
        });
      }
    });

    return NextResponse.json({ 
      stock: processedStock,
      total_items: processedStock.length
    });
  } catch (error) {
    console.error('Error in technician stock GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}