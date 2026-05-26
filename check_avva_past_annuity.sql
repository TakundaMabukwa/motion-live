-- Check which AVVA-0001 jobs with past annuity dates are actually invoiced
SELECT jc.job_number, jc.vehicle_registration, jc.job_status,
  inv.invoice_number,
  p.item->>'name' AS product,
  p.item->>'annuity_end_date' AS annuity
FROM job_cards jc
LEFT JOIN invoices inv ON inv.job_card_id = jc.id
CROSS JOIN LATERAL jsonb_array_elements(jc.quotation_products) AS p(item)
WHERE jc.new_account_number = 'AVVA-0001'
  AND p.item->>'annuity_end_date' IS NOT NULL
  AND (p.item->>'annuity_end_date')::date < CURRENT_DATE
ORDER BY jc.job_number;
