const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/api/cost-centers/route.ts');
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('async function attachLockedByEmails')) {
  const insertAfter = 'function extractMatchingCodes(allCodes = "", prefix = "") {\n  return allCodes\n    .split(",")\n    .map((code) => code.trim().toUpperCase())\n    .filter((code) => code.startsWith(`${prefix}-`));\n}\n';
  const helper = `\nasync function attachLockedByEmails(supabase, rows = []) {\n  if (!Array.isArray(rows) || rows.length === 0) return rows || [];\n\n  const userIds = [\n    ...new Set(\n      rows\n        .map((row) => row?.total_amount_locked_by)\n        .filter((value) => typeof value === \"string\" && value.trim().length > 0),\n    ),\n  ];\n\n  if (userIds.length === 0) {\n    return rows.map((row) => ({\n      ...row,\n      total_amount_locked_by_email: null,\n    }));\n  }\n\n  const { data: userRows, error } = await supabase\n    .from(\"users\")\n    .select(\"id, email\")\n    .in(\"id\", userIds);\n\n  if (error) {\n    console.error(\"Error fetching lock owner emails:\", error);\n    return rows.map((row) => ({\n      ...row,\n      total_amount_locked_by_email: null,\n    }));\n  }\n\n  const emailMap = Object.fromEntries(\n    (userRows || []).map((user) => [user.id, user.email || null]),\n  );\n\n  return rows.map((row) => ({\n    ...row,\n    total_amount_locked_by_email: row?.total_amount_locked_by\n      ? emailMap[row.total_amount_locked_by] || null\n      : null,\n  }));\n}\n`;
  text = text.replace(insertAfter, insertAfter + helper);
}

text = text.replace('      return NextResponse.json(data || []);', '      return NextResponse.json(await attachLockedByEmails(supabase, data || []));');
text = text.replace('      return NextResponse.json(data || []);', '      return NextResponse.json(await attachLockedByEmails(supabase, data || []));');
text = text.replace('    return NextResponse.json(data || []);', '    return NextResponse.json(await attachLockedByEmails(supabase, data || []));');
text = text.replace('        return NextResponse.json(costCodes);', '        return NextResponse.json(await attachLockedByEmails(supabase, costCodes));');

fs.writeFileSync(file, text, 'utf8');
console.log('patched cost center route email lookup');
