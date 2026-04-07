const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/cost-centers/[accountNumbers]/page.js');
let text = fs.readFileSync(file, 'utf8');

const oldHeader = [
  '                <th className="px-4 py-2 border-b text-left">Company</th>',
  '                <th className="px-4 py-2 border-b text-left">Action</th>',
].join('\n');
const newHeader = [
  '                <th className="px-4 py-2 border-b text-left">Company</th>',
  '                <th className="px-4 py-2 border-b text-left">Lock Status</th>',
  '                <th className="px-4 py-2 border-b text-left">Action</th>',
].join('\n');
text = text.replace(oldHeader, newHeader);

const oldCell = [
  '                  <td className="px-4 py-2 border-b">{costCenter.company || \'-\'}</td>',
  '                  <td className="px-4 py-2 border-b">',
].join('\n');
const newCell = [
  '                  <td className="px-4 py-2 border-b">{costCenter.company || \'-\'}</td>',
  '                  <td className="px-4 py-2 border-b align-top">',
  '                    {costCenter.total_amount_locked ? (',
  '                      <div className="space-y-1 text-xs text-blue-700">',
  '                        <div className="font-semibold text-blue-900">Locked</div>',
  '                        <div>',
  '                          Amount: {costCenter.total_amount_locked_value != null ? `R ${Number(costCenter.total_amount_locked_value).toFixed(2)}` : \'-\'}',
  '                        </div>',
  '                        <div>',
  '                          By: {costCenter.total_amount_locked_by_email || costCenter.total_amount_locked_by || \'-\'}',
  '                        </div>',
  '                        <div>',
  '                          At: {costCenter.total_amount_locked_at ? new Date(costCenter.total_amount_locked_at).toLocaleString(\'en-ZA\') : \'-\'}',
  '                        </div>',
  '                      </div>',
  '                    ) : (',
  '                      <span className="text-xs text-gray-400">Not locked</span>',
  '                    )}',
  '                  </td>',
  '                  <td className="px-4 py-2 border-b">',
].join('\n');
text = text.replace(oldCell, newCell);

fs.writeFileSync(file, text, 'utf8');
console.log('patched cost center lock list');
