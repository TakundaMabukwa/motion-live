import pkg from "xlsx";
import * as fs from "node:fs";

const XLSX = pkg;

function processExcel(inputFile, outputFile) {
  // Read the workbook
  const workbook = XLSX.readFile(inputFile);

  // Use sheet by name
  const sheetName = "IP Addresses matched to vehicle";
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.error(`❌ Sheet "${sheetName}" not found in file.`);
    return;
  }

  // Convert sheet to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const seen = new Set();
  const uniqueData = [];

  for (const row of data) {
    const accountNum = row["new_account_number"];

    if (accountNum && !seen.has(accountNum)) {
      seen.add(accountNum);
      uniqueData.push(row); // keep full row
    }
  }

  if (uniqueData.length === 0) {
    console.warn("⚠️ No records found — check headers or sheet name.");
  }

  // Convert back to sheet and CSV
  const newWorksheet = XLSX.utils.json_to_sheet(uniqueData);
  const newCSV = XLSX.utils.sheet_to_csv(newWorksheet);

  fs.writeFileSync(outputFile, newCSV, "utf8");
  console.log(`✅ Processed file saved as: ${outputFile}`);
}

// Run
processExcel("cust.xlsx", "outputfile.csv");
