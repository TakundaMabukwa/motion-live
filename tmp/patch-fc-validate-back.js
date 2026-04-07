const fs = require('fs');
const path = require('path');
const file = path.join('C:/Users/mabuk/Desktop/Dashboards/motion-live', 'app/protected/fc/validate/page.js');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
`  return (
    <div className="p-6 space-y-6">
      <DashboardHeader 
        title={isInitialDataEntry ? "Customer Data Collection" : "Customer Data Validation"}
        subtitle={customerGroup ? (customerGroup.legal_names || customerGroup.company_group) : 'Loading customer information...'}
      />
`,
`  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <DashboardHeader 
          title={isInitialDataEntry ? "Customer Data Collection" : "Customer Data Validation"}
          subtitle={customerGroup ? (customerGroup.legal_names || customerGroup.company_group) : 'Loading customer information...'}
        />
        <Button variant="outline" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
`
);
text = text.replace(
`      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-3">
`,
`      <div className="flex items-center justify-end pt-6 border-t">
        <div className="flex gap-3">
`
);
fs.writeFileSync(file, text, 'utf8');
console.log('patched fc validate back button');
