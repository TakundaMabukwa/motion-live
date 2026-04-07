const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/vehicles/[costCode]/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
`          total_amount_locked_by: option?.total_amount_locked_by || null,
          total_amount_locked_at: option?.total_amount_locked_at || null,`,
`          total_amount_locked_by: option?.total_amount_locked_by || null,
          total_amount_locked_by_email: option?.total_amount_locked_by_email || null,
          total_amount_locked_at: option?.total_amount_locked_at || null,`
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched dedupe email field');
