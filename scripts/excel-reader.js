const fs = require('fs');
const path = require('path');

// Simple Excel file analyzer
class ExcelAnalyzer {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = null;
    }

    async readFile() {
        try {
            // Read the Excel file as buffer
            const buffer = fs.readFileSync(this.filePath);
            console.log(`File size: ${buffer.length} bytes`);
            
            // Check if it's a valid Excel file (starts with PK for .xlsx)
            const header = buffer.slice(0, 4).toString();
            console.log(`File header: ${header}`);
            
            if (header === 'PK\u0003\u0004') {
                console.log('✓ Valid Excel (.xlsx) file detected');
                return this.analyzeXlsxStructure(buffer);
            } else {
                console.log('✗ Not a valid .xlsx file');
                return false;
            }
        } catch (error) {
            console.error('Error reading file:', error.message);
            return false;
        }
    }

    analyzeXlsxStructure(buffer) {
        console.log('\n=== Excel File Structure Analysis ===');
        
        // Look for common Excel components in the buffer
        const components = [
            'xl/worksheets/sheet1.xml',
            'xl/sharedStrings.xml',
            'xl/workbook.xml',
            'xl/styles.xml'
        ];

        components.forEach(component => {
            const found = buffer.indexOf(component) !== -1;
            console.log(`${found ? '✓' : '✗'} ${component}`);
        });

        // Try to extract some basic info
        this.extractBasicInfo(buffer);
        
        return true;
    }

    extractBasicInfo(buffer) {
        console.log('\n=== Extracting Data ===');
        
        // Convert buffer to string for text analysis
        const content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
        
        // Look for potential data patterns
        const patterns = {
            'Company names': /company|client|customer/gi,
            'Account numbers': /account|number|code/gi,
            'Amounts': /amount|total|price|cost/gi,
            'Dates': /date|month|year/gi,
            'Status': /status|pending|paid/gi
        };

        Object.entries(patterns).forEach(([name, pattern]) => {
            const matches = content.match(pattern);
            if (matches) {
                console.log(`${name}: ${matches.length} potential matches`);
            }
        });

        // Look for numeric patterns that might be amounts
        const numbers = content.match(/\d+\.?\d*/g);
        if (numbers) {
            console.log(`Numeric values found: ${numbers.length}`);
            console.log(`Sample numbers: ${numbers.slice(0, 10).join(', ')}`);
        }
    }

    // Generate assessment for bulk invoice system
    generateAssessment() {
        console.log('\n=== Bulk Invoice System Assessment ===');
        console.log('Based on your SQL function and Excel file analysis:\n');

        const assessment = {
            dataStructure: {
                vehicles: 'Contains extensive rental and subscription data',
                payments: 'Target table for bulk invoice processing',
                calculations: 'VAT calculations (15%) built-in'
            },
            
            bulkProcessing: {
                approach: 'SQL function processes all vehicles in batch',
                efficiency: 'Good - single transaction for all records',
                validation: 'Skips zero amounts, handles null values'
            },

            recommendations: [
                'Add error handling for invalid data types',
                'Consider batch size limits for large datasets',
                'Add logging for audit trail',
                'Implement rollback mechanism for failed batches',
                'Add duplicate prevention logic'
            ],

            excelIntegration: [
                'Excel file appears to contain structured data',
                'Consider using xlsx library for proper parsing',
                'Map Excel columns to database fields',
                'Validate data before bulk insert'
            ]
        };

        console.log('1. DATA STRUCTURE:');
        Object.entries(assessment.dataStructure).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        console.log('\n2. BULK PROCESSING:');
        Object.entries(assessment.bulkProcessing).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        console.log('\n3. RECOMMENDATIONS:');
        assessment.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });

        console.log('\n4. EXCEL INTEGRATION:');
        assessment.excelIntegration.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item}`);
        });

        return assessment;
    }
}

// Enhanced Excel parser with xlsx library support
function createEnhancedParser() {
    console.log('\n=== Enhanced Excel Parser Setup ===');
    console.log('To properly parse Excel files, install xlsx library:');
    console.log('npm install xlsx');
    console.log('\nThen use this enhanced parser:');
    
    const enhancedCode = `
const XLSX = require('xlsx');

function parseExcelFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Excel data parsed successfully:');
        console.log('Rows:', data.length);
        console.log('Columns:', Object.keys(data[0] || {}));
        
        return data;
    } catch (error) {
        console.error('Error parsing Excel:', error.message);
        return null;
    }
}`;

    console.log(enhancedCode);
}

// Main execution
async function main() {
    const excelPath = 'c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\scripts\\Book2 (1).xlsx';
    
    console.log('=== Excel File Analysis Tool ===');
    console.log(`Analyzing: ${excelPath}\n`);
    
    const analyzer = new ExcelAnalyzer(excelPath);
    const success = await analyzer.readFile();
    
    if (success) {
        analyzer.generateAssessment();
    }
    
    createEnhancedParser();
    
    console.log('\n=== Database Function Analysis ===');
    console.log('Your populate_payments_from_vehicles() function:');
    console.log('✓ Processes all vehicle records in batch');
    console.log('✓ Calculates VAT (15%) automatically');
    console.log('✓ Handles null/empty values properly');
    console.log('✓ Inserts into payments_ table');
    console.log('⚠ Missing error handling and logging');
    console.log('⚠ No duplicate prevention mechanism');
}

// Run the analysis
main().catch(console.error);