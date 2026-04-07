const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
`  const handleContinue = () => {
    if (!customerGroup) return;
    const accountNumbers = customerGroup.all_new_account_numbers;
    router.push(`/protected/fc/validate/cost-centers/${encodeURIComponent(accountNumbers)}`);
  };
`,
`  const handleContinue = () => {
    const rawAccountNumbers = [
      customerGroup?.all_new_account_numbers,
      customerData?.all_new_account_numbers,
      searchParams?.get('account'),
      customerData?.new_account_number,
    ]
      .find((value) => typeof value === 'string' && value.trim().length > 0) || '';

    const normalizedAccountNumbers = Array.from(
      new Set(
        rawAccountNumbers
          .split(',')
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    if (normalizedAccountNumbers.length === 0) {
      toast.error('No cost centers found for this customer yet');
      return;
    }

    router.push(
      `/protected/fc/validate/cost-centers/${encodeURIComponent(normalizedAccountNumbers.join(','))}`,
    );
  };
`
);
text = text.replace(
`          <Button
            onClick={handleContinue}
          >
`,
`          <Button
            onClick={handleContinue}
            disabled={loading || !customerData}
          >
`
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched fc handleContinue');
