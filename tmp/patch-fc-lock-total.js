const fs = require('fs');
const path = require('path');

const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/vehicles/[costCode]/page.js');
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  '  const [savingField, setSavingField] = useState(null);\r\n  const [lockingVehicleId, setLockingVehicleId] = useState(null);',
  '  const [savingField, setSavingField] = useState(null);\r\n  const [lockingCostCenterTotal, setLockingCostCenterTotal] = useState(false);'
);

text = text.replace(
`  const currentCostCenterName = useMemo(() => {
    if (!costCode) return "";
    const matched = matchingCostCenters.find(
      (item) => item.cost_code === costCode,
    );
    return matched?.company || costCode;
  }, [matchingCostCenters, costCode]);
`,
`  const currentCostCenter = useMemo(() => {
    if (!costCode) return null;
    return (
      matchingCostCenters.find((item) => item.cost_code === costCode) || null
    );
  }, [matchingCostCenters, costCode]);

  const currentCostCenterName = currentCostCenter?.company || costCode || "";
`
);

const oldLockStart = text.indexOf('  const lockVehicleAmount = async () => {');
const oldLockEnd = text.indexOf('  const handleNewVehicleChange = (field, value) => {');
if (oldLockStart === -1 || oldLockEnd === -1) throw new Error('Could not find lockVehicleAmount block');
const newLockBlock = `  const lockCostCenterTotal = async () => {
    if (!costCode) {
      toast.error("No cost center provided");
      return;
    }

    if (currentCostCenter?.total_amount_locked) {
      toast.info("This cost center total is already locked");
      return;
    }

    try {
      setLockingCostCenterTotal(true);
      const response = await fetch("/api/cost-centers/validate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost_code: costCode,
          validated: Boolean(currentCostCenter?.validated),
          total_amount_locked: true,
          total_amount_locked_value: Number(filteredVehiclesGrandTotal.toFixed(2)),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.details || result?.error || "Failed to lock total amount",
        );
      }

      setCostCenterOptions((prev) =>
        prev.map((option) =>
          option.cost_code === costCode ? { ...option, ...result } : option,
        ),
      );
      toast.success("Cost center total locked successfully");
    } catch (error) {
      toast.error("Failed to lock total amount: " + error.message);
    } finally {
      setLockingCostCenterTotal(false);
    }
  };

`;
text = text.slice(0, oldLockStart) + newLockBlock + text.slice(oldLockEnd);

text = text.replace(
`          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mt-4">
            {(data.amount_locked || vehicle.amount_locked) && (
              <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Amount locked
                {(data.amount_locked_by || vehicle.amount_locked_by) ? \` by \${data.amount_locked_by || vehicle.amount_locked_by}\` : ""}
                {(data.amount_locked_at || vehicle.amount_locked_at) ? \` on \${new Date(data.amount_locked_at || vehicle.amount_locked_at).toLocaleString("en-ZA")}\` : ""}
              </div>
            )}
            <div className="flex items-center justify-between">
`,
`          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between">
`
);

text = text.replace(
`                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={lockVehicleAmount}
                    disabled={saving || lockingVehicleId === vehicle.id || editedData.amount_locked === true || vehicle.amount_locked === true}
                  >
                    {lockingVehicleId === vehicle.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    {editedData.amount_locked === true || vehicle.amount_locked === true ? "Amount Locked" : "Lock Amount"}
                  </Button>
                  <Button size="sm" onClick={saveVehicle} disabled={saving || lockingVehicleId === vehicle.id}>
`,
`                  <Button size="sm" onClick={saveVehicle} disabled={saving}>
`
);

text = text.replace(
`          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center justify-end gap-6 px-6 py-5">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Grand Total
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {formatCurrency(filteredVehiclesGrandTotal)}
                </p>
              </div>
            </CardContent>
          </Card>
`,
`          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Grand Total
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatCurrency(filteredVehiclesGrandTotal)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Total total_rental_sub for the currently visible vehicles.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  {currentCostCenter?.total_amount_locked && (
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
                </div>
              </div>
            </CardContent>
          </Card>
`
);

fs.writeFileSync(file, text, 'utf8');
console.log('patched page');
