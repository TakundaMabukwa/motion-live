const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/vehicles/[costCode]/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
'{currentCostCenter?.total_amount_locked_by\n                          ? `By ${currentCostCenter.total_amount_locked_by}`\n                          : "By current user"}',
'{currentCostCenter?.total_amount_locked_by_email ||\n                          currentCostCenter?.total_amount_locked_by ||\n                          "Current user"}'
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched lock display email');
