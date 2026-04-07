const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/vehicles/[costCode]/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
`      if (!deduped.has(code)) {
        deduped.set(code, {
          cost_code: code,
          company: option?.company || "",
        });
      }
`,
`      if (!deduped.has(code)) {
        deduped.set(code, {
          cost_code: code,
          company: option?.company || "",
          validated: option?.validated || false,
          total_amount_locked: option?.total_amount_locked || false,
          total_amount_locked_value: option?.total_amount_locked_value ?? null,
          total_amount_locked_by: option?.total_amount_locked_by || null,
          total_amount_locked_at: option?.total_amount_locked_at || null,
        });
      }
`
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched matching cost center fields');
