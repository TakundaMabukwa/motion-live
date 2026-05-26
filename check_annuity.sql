SELECT DISTINCT
  jc.job_number,
  p->>'name' AS product_name,
  (p->>'annuity_end_date')::date AS annuity_end_date,
  (p->>'annuity_end_date')::date > CURRENT_DATE AS is_after_today
FROM job_cards jc,
LATERAL jsonb_array_elements(jc.quotation_products) AS p
WHERE jc.job_number IN (
  'SOL-994977','SOL-289966','SOL-253996','SOL-457748','SOL-893021',
  'SOL-396569','SOL-460816','SOL-870081','SOL-659351','SOL-414485',
  'SOL-308570','SOL-341372','SOL-820881','SOL-237638','SOL-763923',
  'SOL-707513','SOL-732843','SOL-790665'
)
AND p->>'annuity_end_date' IS NOT NULL
ORDER BY jc.job_number, product_name;
