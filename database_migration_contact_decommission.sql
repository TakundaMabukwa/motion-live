-- Migration script to add contact_person and decommission_date fields
-- Run these commands in your database to add the new fields to support client quotes

-- Add contact_person column to client_quotes table
ALTER TABLE client_quotes ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add decommission_date column to client_quotes table
ALTER TABLE client_quotes ADD COLUMN IF NOT EXISTS decommission_date DATE;

-- Add contact_person column to customer_quotes table
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add decommission_date column to customer_quotes table
ALTER TABLE customer_quotes ADD COLUMN IF NOT EXISTS decommission_date DATE;

-- Add contact_person column to job_cards table
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add decommission_date column to job_cards table
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS decommission_date DATE;

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_quotes_contact_person ON client_quotes(contact_person);
CREATE INDEX IF NOT EXISTS idx_client_quotes_decommission_date ON client_quotes(decommission_date);

CREATE INDEX IF NOT EXISTS idx_customer_quotes_contact_person ON customer_quotes(contact_person);
CREATE INDEX IF NOT EXISTS idx_customer_quotes_decommission_date ON customer_quotes(decommission_date);

CREATE INDEX IF NOT EXISTS idx_job_cards_contact_person ON job_cards(contact_person);
CREATE INDEX IF NOT EXISTS idx_job_cards_decommission_date ON job_cards(decommission_date);

-- Verification queries to check if columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('client_quotes', 'customer_quotes', 'job_cards') 
AND column_name IN ('contact_person', 'decommission_date')
ORDER BY table_name, column_name;