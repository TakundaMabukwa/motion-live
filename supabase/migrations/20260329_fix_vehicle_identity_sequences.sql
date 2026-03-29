select setval(
  pg_get_serial_sequence('public.vehicles', 'id'),
  coalesce((select max(id) from public.vehicles), 0) + 1,
  false
);

select setval(
  pg_get_serial_sequence('public.vehicles_duplicate', 'id'),
  coalesce((select max(id) from public.vehicles_duplicate), 0) + 1,
  false
);
