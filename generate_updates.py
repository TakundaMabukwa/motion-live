import csv

# Read CSV and generate UPDATE statements
with open('cost_centers.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    
    print("-- Update new_account_number in vehicles table based on cost_centers.csv")
    print("BEGIN;")
    print()
    
    for row in reader:
        company = row['company'].strip()
        cost_code = row['cost_code'].strip()
        
        # Escape single quotes for SQL
        company_escaped = company.replace("'", "''")
        
        print(f"UPDATE public.vehicles SET new_account_number = '{cost_code}' WHERE TRIM(company) = '{company_escaped}';")
    
    print()
    print("COMMIT;")
