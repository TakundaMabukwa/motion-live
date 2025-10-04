-- =====================================================
-- PAYMENTS SYSTEM DATABASE SETUP
-- =====================================================
-- This script sets up the payments system with overdue tracking
-- and monthly billing automation

-- =====================================================
-- 1. ALTER PAYMENTS_ TABLE TO ADD REQUIRED COLUMNS
-- =====================================================

-- Add columns for payment tracking and overdue periods
ALTER TABLE public.payments_ 
ADD COLUMN IF NOT EXISTS due_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial')),
ADD COLUMN IF NOT EXISTS overdue_30_days NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_60_days NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_90_days NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS billing_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_cost_code ON public.payments_(cost_code);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments_(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments_(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_billing_month ON public.payments_(billing_month);

-- =====================================================
-- 2. CREATE FUNCTION TO UPDATE OVERDUE AMOUNTS
-- =====================================================

CREATE OR REPLACE FUNCTION update_overdue_amounts()
RETURNS VOID AS $$
BEGIN
    -- Update overdue amounts based on due dates
    UPDATE public.payments_ 
    SET 
        overdue_30_days = CASE 
            WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' 
            THEN balance_due 
            ELSE 0 
        END,
        overdue_60_days = CASE 
            WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' 
            THEN balance_due 
            ELSE 0 
        END,
        overdue_90_days = CASE 
            WHEN due_date < CURRENT_DATE - INTERVAL '90 days' 
            THEN balance_due 
            ELSE 0 
        END,
        payment_status = CASE 
            WHEN balance_due <= 0 THEN 'paid'
            WHEN due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
        END,
        last_updated = now()
    WHERE payment_status != 'paid';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE FUNCTION TO CALCULATE MONTHLY BILLING
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_monthly_billing()
RETURNS VOID AS $$
DECLARE
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
    vehicle_record RECORD;
    cost_code_exists BOOLEAN;
BEGIN
    -- Loop through all vehicles and aggregate by cost_code
    FOR vehicle_record IN 
        SELECT 
            v.new_account_number as cost_code,
            SUM(COALESCE(v.total_rental_sub, 0)) as total_amount,
            MAX(v.company) as company
        FROM public.vehicles v
        WHERE v.new_account_number IS NOT NULL 
        AND v.total_rental_sub IS NOT NULL
        GROUP BY v.new_account_number
    LOOP
        -- Check if payment record already exists for this cost_code and month
        SELECT EXISTS(
            SELECT 1 FROM public.payments_ 
            WHERE cost_code = vehicle_record.cost_code 
            AND billing_month = current_month
        ) INTO cost_code_exists;
        
        IF cost_code_exists THEN
            -- Update existing record
            UPDATE public.payments_ 
            SET 
                due_amount = vehicle_record.total_amount,
                balance_due = vehicle_record.total_amount - paid_amount,
                company = vehicle_record.company,
                last_updated = now()
            WHERE cost_code = vehicle_record.cost_code 
            AND billing_month = current_month;
        ELSE
            -- Insert new record
            INSERT INTO public.payments_ (
                company,
                cost_code,
                due_amount,
                balance_due,
                invoice_date,
                due_date,
                payment_status,
                billing_month,
                last_updated
            ) VALUES (
                vehicle_record.company,
                vehicle_record.cost_code,
                vehicle_record.total_amount,
                vehicle_record.total_amount,
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '30 days',
                'pending',
                current_month,
                now()
            );
        END IF;
    END LOOP;
    
    -- Update overdue amounts after billing calculation
    PERFORM update_overdue_amounts();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE FUNCTION TO GET PAYMENTS SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_payments_summary()
RETURNS TABLE (
    cost_code TEXT,
    company TEXT,
    total_due NUMERIC,
    total_paid NUMERIC,
    balance_due NUMERIC,
    overdue_30 NUMERIC,
    overdue_60 NUMERIC,
    overdue_90 NUMERIC,
    payment_status TEXT,
    last_invoice_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.cost_code,
        p.company,
        SUM(p.due_amount) as total_due,
        SUM(p.paid_amount) as total_paid,
        SUM(p.balance_due) as balance_due,
        SUM(p.overdue_30_days) as overdue_30,
        SUM(p.overdue_60_days) as overdue_60,
        SUM(p.overdue_90_days) as overdue_90,
        CASE 
            WHEN SUM(p.balance_due) <= 0 THEN 'paid'
            WHEN SUM(p.overdue_90_days) > 0 THEN 'overdue_90'
            WHEN SUM(p.overdue_60_days) > 0 THEN 'overdue_60'
            WHEN SUM(p.overdue_30_days) > 0 THEN 'overdue_30'
            ELSE 'pending'
        END as payment_status,
        MAX(p.invoice_date) as last_invoice_date
    FROM public.payments_ p
    GROUP BY p.cost_code, p.company
    ORDER BY balance_due DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE SCHEDULED FUNCTION FOR MONTHLY BILLING
-- =====================================================

-- This function will be called on the 21st of every month
CREATE OR REPLACE FUNCTION monthly_billing_process()
RETURNS VOID AS $$
BEGIN
    -- Calculate monthly billing
    PERFORM calculate_monthly_billing();
    
    -- Log the billing process
    INSERT INTO public.billing_log (
        process_date,
        process_type,
        status,
        message
    ) VALUES (
        CURRENT_DATE,
        'monthly_billing',
        'completed',
        'Monthly billing process completed successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE BILLING LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    process_date DATE NOT NULL DEFAULT CURRENT_DATE,
    process_type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 7. CREATE VIEW FOR PAYMENTS DASHBOARD
-- =====================================================

CREATE OR REPLACE VIEW public.payments_dashboard AS
SELECT 
    p.cost_code,
    p.company,
    SUM(p.due_amount) as total_due,
    SUM(p.paid_amount) as total_paid,
    SUM(p.balance_due) as balance_due,
    SUM(p.overdue_30_days) as overdue_30_days,
    SUM(p.overdue_60_days) as overdue_60_days,
    SUM(p.overdue_90_days) as overdue_90_days,
    CASE 
        WHEN SUM(p.balance_due) <= 0 THEN 'paid'
        WHEN SUM(p.overdue_90_days) > 0 THEN 'overdue_90'
        WHEN SUM(p.overdue_60_days) > 0 THEN 'overdue_60'
        WHEN SUM(p.overdue_30_days) > 0 THEN 'overdue_30'
        ELSE 'pending'
    END as payment_status,
    MAX(p.invoice_date) as last_invoice_date,
    MAX(p.due_date) as last_due_date,
    COUNT(*) as invoice_count
FROM public.payments_ p
GROUP BY p.cost_code, p.company
ORDER BY balance_due DESC;

-- =====================================================
-- 8. CREATE FUNCTION TO MANUALLY TRIGGER BILLING
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_monthly_billing()
RETURNS TEXT AS $$
BEGIN
    PERFORM calculate_monthly_billing();
    RETURN 'Monthly billing process completed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.payments_ TO authenticated;
GRANT SELECT ON public.payments_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_payments_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_monthly_billing() TO authenticated;

-- =====================================================
-- 10. CREATE TRIGGER TO UPDATE BALANCE ON PAYMENT
-- =====================================================

CREATE OR REPLACE FUNCTION update_payment_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance_due when paid_amount changes
    NEW.balance_due = NEW.due_amount - NEW.paid_amount;
    
    -- Update payment status
    IF NEW.balance_due <= 0 THEN
        NEW.payment_status = 'paid';
    ELSIF NEW.paid_amount > 0 AND NEW.balance_due > 0 THEN
        NEW.payment_status = 'partial';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.payment_status = 'overdue';
    ELSE
        NEW.payment_status = 'pending';
    END IF;
    
    -- Update last_updated timestamp
    NEW.last_updated = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_payment_balance ON public.payments_;
CREATE TRIGGER trigger_update_payment_balance
    BEFORE UPDATE ON public.payments_
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_balance();

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Test the setup by running a sample billing calculation
-- SELECT trigger_monthly_billing();

COMMENT ON TABLE public.payments_ IS 'Payments tracking table with overdue period tracking';
COMMENT ON FUNCTION calculate_monthly_billing() IS 'Calculates monthly billing from vehicles total_rental_sub amounts';
COMMENT ON FUNCTION update_overdue_amounts() IS 'Updates overdue amounts based on due dates';
COMMENT ON FUNCTION get_payments_summary() IS 'Returns summary of all payments grouped by cost_code';
COMMENT ON FUNCTION monthly_billing_process() IS 'Scheduled function for monthly billing on 21st of each month';
COMMENT ON FUNCTION trigger_monthly_billing() IS 'Manual trigger for monthly billing process';
