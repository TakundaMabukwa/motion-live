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
    // Read stock descriptions
    const stockDescriptions = [];
    fs.createReadStream('./STOCK DESCRIPTION (1).csv')
      .pipe(csv())
      .on('data', (row) => {
        stockDescriptions.push({ code: row.CODE, description: row.DESCRIPTION });
      })
      .on('end', () => {
        // Match and update descriptions
        const updatedCategories = currentCats.map(cat => {
          const match = stockDescriptions.find(stock => stock.code === cat.code);
          return {
            code: cat.code,
            description: match ? match.description : cat.description
          };
        });

        // Output SQL statements
        console.log('-- SQL statements to update inventory_categories table');
        updatedCategories.forEach(cat => {
          const escapedDescription = cat.description.replace(/'/g, "''");
          console.log(`INSERT INTO inventory_categories (code, description) VALUES ('${cat.code}', '${escapedDescription}') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`);
        });

        // Show matches found
        const matches = updatedCategories.filter(cat => {
          const original = currentCats.find(c => c.code === cat.code);
          return original && original.description !== cat.description;
        });
        
        console.log(`\n-- Found ${matches.length} matches with updated descriptions:`);
        matches.forEach(match => {
          console.log(`-- ${match.code}: ${match.description}`);
        });
      });
  });