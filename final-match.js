const fs = require('fs');
const csv = require('csv-parser');

// Read current categories
const currentCats = [];
fs.createReadStream('./current cats.csv')
  .pipe(csv())
  .on('data', (row) => {
    currentCats.push({ code: row.code, description: row.description });
  })
  .on('end', () => {
    // Read stock descriptions with BOM handling
    const stockDescriptions = [];
    fs.createReadStream('./STOCK DESCRIPTION (1).csv')
      .pipe(csv({ 
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '') // Remove BOM
      }))
      .on('data', (row) => {
        stockDescriptions.push({ code: row.CODE, description: row.DESCRIPTION });
      })
      .on('end', () => {
        console.log('-- Matching codes with proper descriptions:');
        
        const matches = [];
        currentCats.forEach(cat => {
          const match = stockDescriptions.find(stock => stock.code === cat.code);
          if (match) {
            matches.push({
              code: cat.code,
              currentDesc: cat.description,
              stockDesc: match.description
            });
          }
        });

        console.log(`Found ${matches.length} matching codes:\n`);
        matches.forEach(match => {
          console.log(`${match.code}:`);
          console.log(`  Current: ${match.currentDesc}`);
          console.log(`  Stock:   ${match.stockDesc}`);
          console.log('');
        });

        // Generate SQL for matched items
        console.log('\n-- SQL to update categories with proper descriptions:');
        matches.forEach(match => {
          const escapedDescription = match.stockDesc.replace(/'/g, "''");
          console.log(`INSERT INTO inventory_categories (code, description) VALUES ('${match.code}', '${escapedDescription}') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`);
        });
      });
  });