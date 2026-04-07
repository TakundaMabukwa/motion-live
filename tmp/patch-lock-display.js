const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/vehicles/[costCode]/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
`                  {currentCostCenter?.total_amount_locked && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <div className="font-semibold">Total locked</div>
                      <div>
                        {currentCostCenter?.total_amount_locked_value != null
                          ? formatCurrency(currentCostCenter.total_amount_locked_value)
                          : formatCurrency(filteredVehiclesGrandTotal)}
                      </div>
                      <div className="text-xs text-blue-700">
                        {currentCostCenter?.total_amount_locked_by
                          ? \`By \${currentCostCenter.total_amount_locked_by}\`
                          : "By current user"}
                        {currentCostCenter?.total_amount_locked_at
                          ? \` on \${new Date(currentCostCenter.total_amount_locked_at).toLocaleString("en-ZA")}\`
                          : ""}
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={lockCostCenterTotal}
                    disabled={lockingCostCenterTotal || currentCostCenter?.total_amount_locked}
                    className="min-w-[170px]"
                  >
                    {lockingCostCenterTotal ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {currentCostCenter?.total_amount_locked
                      ? "Total Locked"
                      : "Lock Total"}
                  </Button>
`,
`                  {currentCostCenter?.total_amount_locked && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <div className="font-semibold">Total locked</div>
                      <div className="mt-1 text-base font-semibold text-blue-950">
                        {currentCostCenter?.total_amount_locked_value != null
                          ? formatCurrency(currentCostCenter.total_amount_locked_value)
                          : formatCurrency(filteredVehiclesGrandTotal)}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-blue-700">
                        <div>
                          <span className="font-semibold">Locked By:</span>{" "}
                          {currentCostCenter?.total_amount_locked_by || "Current user"}
                        </div>
                        <div>
                          <span className="font-semibold">Locked At:</span>{" "}
                          {currentCostCenter?.total_amount_locked_at
                            ? new Date(currentCostCenter.total_amount_locked_at).toLocaleString("en-ZA")
                            : "Pending"}
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={lockCostCenterTotal}
                    disabled={lockingCostCenterTotal || currentCostCenter?.total_amount_locked}
                    variant={currentCostCenter?.total_amount_locked ? "secondary" : "default"}
                    className="min-w-[170px]"
                  >
                    {lockingCostCenterTotal ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : currentCostCenter?.total_amount_locked ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {currentCostCenter?.total_amount_locked
                      ? "Total Locked"
                      : "Lock Total"}
                  </Button>
`
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched lock display');
