#!/usr/bin/env node

const path = require('path');
const XLSX = require('xlsx');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const FILE_PATH = path.join('stock-uploads', 'Ituran Costings.xlsx');
const SOURCE_WORKBOOK = 'Ituran Costings.xlsx';

const SHEET_CONFIGS = [
  {
    name: 'NEW CASH PRICE LIST',
    pricingModel: 'cash',
    kind: 'section-list',
    sectionCol: 1,
    itemProductCol: 2,
    itemDescriptionCol: 3,
    priceCols: [4],
    installationCols: [5],
    subscriptionCols: [],
    rentalCols: [],
    discountCols: [],
    quantityCols: [],
  },
  {
    name: 'NEW RENTALS',
    pricingModel: 'rental',
    kind: 'section-list',
    sectionCol: 1,
    itemProductCol: 2,
    itemDescriptionCol: 3,
    priceCols: [],
    installationCols: [5],
    subscriptionCols: [],
    rentalCols: [4],
    discountCols: [],
    quantityCols: [],
  },
  {
    name: 'CAMERA CASH',
    pricingModel: 'cash',
    kind: 'camera-cash',
  },
  {
    name: 'CAMERA DEAL',
    pricingModel: 'deal',
    kind: 'deal-sheet',
    sectionCol: 1,
    itemProductCol: 2,
    itemDescriptionCol: 3,
    priceCols: [8, 5],
    installationCols: [13],
    subscriptionCols: [15],
    rentalCols: [9],
    discountCols: [],
    quantityCols: [],
  },
  {
    name: 'WIRELESS DEAL',
    pricingModel: 'deal',
    kind: 'deal-sheet',
    sectionCol: 1,
    itemProductCol: 2,
    itemDescriptionCol: 3,
    priceCols: [8, 5],
    installationCols: [13],
    subscriptionCols: [15],
    rentalCols: [9],
    discountCols: [],
    quantityCols: [],
  },
  {
    name: 'PTT RADIO QUOTATION',
    pricingModel: 'quotation',
    kind: 'quote-sheet',
  },
  {
    name: 'PTT RENTAL QUOTATION',
    pricingModel: 'rental-quotation',
    kind: 'rental-quote-sheet',
  },
];

function clean(value) {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined || value === false) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumber(row, indexes) {
  for (const index of indexes) {
    const value = toNumber(row[index]);
    if (value !== 0) return value;
  }
  return 0;
}

function isSectionLabel(value) {
  const text = clean(value);
  if (!text) return false;
  if (text.length < 3) return false;
  return text === text.toUpperCase();
}

function createMainRow(section, config, sortOrder, children) {
  return {
    id: randomUUID(),
    parent_id: null,
    is_main_item: true,
    sort_order: sortOrder,
    source_sheet: config.name,
    source_workbook: SOURCE_WORKBOOK,
    pricing_model: config.pricingModel,
    notes: `${config.name} - ${section}`,
    type: config.name,
    product: section,
    description: section,
    category: section,
    price: children.reduce((sum, child) => sum + child.price, 0),
    quantity: 1,
    discount: children.reduce((sum, child) => sum + child.discount, 0),
    rental: children.reduce((sum, child) => sum + child.rental, 0),
    installation: children.reduce((sum, child) => sum + child.installation, 0),
    subscription: children.reduce((sum, child) => sum + child.subscription, 0),
  };
}

function buildChild(section, config, sortOrder, product, description, values, notes = '') {
  return {
    id: randomUUID(),
    parent_id: null,
    is_main_item: false,
    sort_order: sortOrder,
    source_sheet: config.name,
    source_workbook: SOURCE_WORKBOOK,
    pricing_model: config.pricingModel,
    notes: notes || null,
    type: config.name,
    product: clean(product),
    description: clean(description) || null,
    category: clean(section),
    price: values.price,
    quantity: values.quantity || 1,
    discount: values.discount,
    rental: values.rental,
    installation: values.installation,
    subscription: values.subscription,
  };
}

function parseSectionList(rows, config) {
  const groups = [];
  let currentSection = '';
  let currentChildren = [];
  let sectionSort = 0;
  let childSort = 0;

  const flush = () => {
    if (!currentSection || currentChildren.length === 0) return;
    const main = createMainRow(currentSection, config, sectionSort, currentChildren);
    const children = currentChildren.map((child) => ({ ...child, parent_id: main.id }));
    groups.push({ main, children });
  };

  for (const row of rows) {
    const sectionLabel = clean(row[config.sectionCol]);
    const product = clean(row[config.itemProductCol]);

    if (isSectionLabel(sectionLabel) && !product) {
      flush();
      currentSection = sectionLabel;
      currentChildren = [];
      sectionSort += 1;
      childSort = 0;
      continue;
    }

    if (!currentSection || !product) continue;
    if (product === 'TOTAL') continue;

    const values = {
      price: firstNumber(row, config.priceCols),
      rental: firstNumber(row, config.rentalCols),
      installation: firstNumber(row, config.installationCols),
      subscription: firstNumber(row, config.subscriptionCols),
      discount: firstNumber(row, config.discountCols),
      quantity: firstNumber(row, config.quantityCols) || 1,
    };

    if (Object.values(values).every((value) => value === 0) && !clean(row[config.itemDescriptionCol])) {
      continue;
    }

    childSort += 1;
    currentChildren.push(
      buildChild(
        currentSection,
        config,
        childSort,
        product,
        row[config.itemDescriptionCol],
        values
      )
    );
  }

  flush();
  return groups;
}

function parseCameraCash(rows, config) {
  const groups = [];
  const sections = [
    { name: 'HARDWARE', start: 6, end: 19, subscriptionMode: false },
    { name: 'MONTHLY SUBS', start: 24, end: 34, subscriptionMode: true },
  ];

  sections.forEach((section, index) => {
    const children = [];
    let childSort = 0;

    for (let i = section.start; i <= section.end; i += 1) {
      const row = rows[i] || [];
      const product = clean(row[1]);
      if (!product || product === 'TOTAL') continue;

      const values = section.subscriptionMode
        ? {
            price: 0,
            rental: 0,
            installation: 0,
            subscription: toNumber(row[3]),
            discount: 0,
            quantity: 1,
          }
        : {
            price: toNumber(row[2]),
            rental: 0,
            installation: toNumber(row[3]),
            subscription: 0,
            discount: 0,
            quantity: 1,
          };

      childSort += 1;
      children.push(buildChild(section.name, config, childSort, product, '', values));
    }

    if (children.length) {
      const main = createMainRow(section.name, config, index + 1, children);
      groups.push({ main, children: children.map((child) => ({ ...child, parent_id: main.id })) });
    }
  });

  return groups;
}

function parseQuoteSheet(rows, config, rentalMode = false) {
  const groups = [];
  const sections = [
    { name: 'HARDWARE', start: 6, end: 18, monthly: false },
    { name: 'MONTHLY SUBS', start: 24, end: 34, monthly: true },
  ];

  sections.forEach((section, index) => {
    const children = [];
    let childSort = 0;

    for (let i = section.start; i <= section.end; i += 1) {
      const row = rows[i] || [];
      const product = clean(row[1]);
      if (!product || product === 'TOTAL') continue;

      const values = section.monthly
        ? {
            price: 0,
            rental: 0,
            installation: 0,
            subscription: toNumber(row[3]),
            discount: 0,
            quantity: 1,
          }
        : rentalMode
        ? {
            price: 0,
            rental: toNumber(row[2]),
            installation: toNumber(row[3]),
            subscription: 0,
            discount: 0,
            quantity: 1,
          }
        : {
            price: toNumber(row[2]),
            rental: 0,
            installation: toNumber(row[3]),
            subscription: 0,
            discount: 0,
            quantity: 1,
          };

      childSort += 1;
      children.push(buildChild(section.name, config, childSort, product, '', values));
    }

    if (children.length) {
      const main = createMainRow(section.name, config, index + 1, children);
      groups.push({ main, children: children.map((child) => ({ ...child, parent_id: main.id })) });
    }
  });

  return groups;
}

function parseSheet(rows, config) {
  switch (config.kind) {
    case 'section-list':
    case 'deal-sheet':
      return parseSectionList(rows, config);
    case 'camera-cash':
      return parseCameraCash(rows, config);
    case 'quote-sheet':
      return parseQuoteSheet(rows, config, false);
    case 'rental-quote-sheet':
      return parseQuoteSheet(rows, config, true);
    default:
      return [];
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const workbook = XLSX.readFile(FILE_PATH);

  const { error: deleteError } = await supabase
    .from('bill_of_items')
    .delete()
    .eq('source_workbook', SOURCE_WORKBOOK);

  if (deleteError) {
    throw new Error(`Failed to clear previous ${SOURCE_WORKBOOK} rows: ${deleteError.message}`);
  }

  const rowsToInsert = [];
  const summary = [];

  for (const config of SHEET_CONFIGS) {
    const sheet = workbook.Sheets[config.name];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const groups = parseSheet(rows, config);

    groups.forEach((group) => {
      rowsToInsert.push(group.main, ...group.children);
    });

    summary.push({
      sheet: config.name,
      groups: groups.length,
      items: groups.reduce((sum, group) => sum + group.children.length, 0),
    });
  }

  if (rowsToInsert.length === 0) {
    throw new Error('No bill-of-items rows were parsed from workbook');
  }

  const batchSize = 500;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('bill_of_items').insert(batch);
    if (error) {
      throw new Error(`Insert failed at batch ${i / batchSize + 1}: ${error.message}`);
    }
  }

  console.log(`Imported ${rowsToInsert.length} rows into bill_of_items from ${SOURCE_WORKBOOK}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
