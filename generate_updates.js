const fs = require('fs');

const csv = fs.readFileSync('cost_centers.csv', 'utf-8');
const lines = csv.split('\n').slice(1); // Skip header

console.log('-- Update new_account_number in vehicles table based on cost_centers.csv');
console.log('BEGIN;\n');

lines.forEach(line => {
    if (!line.trim()) return;
    
    const match = line.match(/^"?([^"]*?)"?,(.+)$/);
    if (!match) return;
    
    let company = match[1].trim();
    const costCode = match[2].trim();
    
    // Escape single quotes for SQL
    company = company.replace(/'/g, "''");
    
    console.log(`UPDATE public.vehicles SET new_account_number = '${costCode}' WHERE TRIM(company) = '${company}';`);
});

console.log('\nCOMMIT;');
