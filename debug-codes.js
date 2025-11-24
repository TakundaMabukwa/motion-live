const fs = require('fs');
const csv = require('csv-parser');

// Read current categories
const currentCats = [];
fs.createReadStream('./current cats.csv')
  .pipe(csv())
  .on('data', (row) => {
    currentCats.push(row.code);
  })
  .on('end', () => {
    // Read stock descriptions
    const stockCodes = [];
    fs.createReadStream('./STOCK DESCRIPTION (1).csv')
      .pipe(csv())
      .on('data', (row) => {
        stockCodes.push(row.CODE);
      })
      .on('end', () => {
        console.log('First 10 current category codes:');
        currentCats.slice(0, 10).forEach(code => console.log(`"${code}"`));
        
        console.log('\nFirst 10 stock description codes:');
        stockCodes.slice(0, 10).forEach(code => console.log(`"${code}"`));
        
        // Check for exact matches
        const matches = currentCats.filter(code => stockCodes.includes(code));
        console.log(`\nFound ${matches.length} exact matches:`);
        matches.forEach(match => console.log(`"${match}"`));
      });
  });