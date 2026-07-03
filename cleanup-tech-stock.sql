-- Cleanup: Remove duplicate serials from tech_stock.assigned_parts
-- Each UPDATE rebuilds the JSONB array excluding the listed serials
-- Golden rule: if a serial is on a job_card, it must NOT be in tech_stock.assigned_parts

-- Technician: andre.cris.evert.justin@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '56.10.3.9',
    '56.4.3.245',
    '56.5.3.204',
    '75307021',
    '75309907',
    '75310486',
    '866568080098931',
    '866568080098949',
    '867191082322370',
    '867191082323147',
    '867934083331290',
    '89320000000024250736',
    '89370000000027420919',
    '89450000000035803999',
    '89450000000035804013',
    '89450000000035804039',
    '89450000000035804047',
    '89450000000035804088',
    '89550000000016720193',
    'EIJH00066531445',
    'EIJH00066532123',
    'EIJH00066532223',
    'EIJK00068699439',
    'EIJK00068701406',
    'EIJK00068701839',
    'EIMB00103938258',
    'EIMB00103939147',
    'EIMB00103949639',
    'MC-808K-250813-0064',
    'MC-808K-251204-0015',
    'MC-808K-251204-0068',
    'MC-808K-251204-0072',
    'MC-808K-251204-0076',
    'MC-808K-251204-0083',
    'MC-808K-260311-0050',
    'MC-808K-260311-0051',
    'MC-808K-260311-0055',
    'MC-808K-260311-0056',
    'MC804I-260318-0007',
    'MC804I-260318-0070',
    'MC804I-260318-0076',
    'MC804I-260318-0081',
    'MC804I-260318-0091',
    'MTX-10M-6P0039',
    'MTX-10M-6P0040',
    'MTX-10M-6P0041',
    'MTX-10M-6P0042',
    'MTX-10M-6P0043',
    'MTX-10MCAB-0228',
    'MTX-10MCAB-0232',
    'MTX-10MCAB-0233',
    'MTX-10MCAB-0234',
    'MTX-10MCAB-0235',
    'MTX-10MCAB-0236',
    'MTX-10MCAB-0237',
    'MTX-10MCAB-0238',
    'MTX-10MCAB-0239',
    'MTX-10MCAB-0240',
    'MTX-512GB-149',
    'MTX-512GB-151',
    'MTX-512GB-153',
    'MTX-512GB-154',
    'MTX-512GB-155',
    'MTX-MC832-250813-0003',
    'MTX-MC832-250813-0005',
    'MTX-MC832-250813-0008',
    'MTX-MC832-250813-0011',
    'MTX-MC832-250813-0017',
    'MTX-MC833-250917-0007',
    'MTX-MC833-250917-0020',
    'MTX-MC833-250917-0028',
    'MTX-MC833-250917-0032',
    'MTX-MC833-250917-0034',
    'SC7M270224-048',
    'SC7M270224-049',
    'SC7M270224-050',
    'Technoton; DUT-E CAN L=1000; SN 2654001 5 01957; Date 10/25',
    'Technoton; DUT-E CAN L=1000; SN 2654001 5 01958; Date 10/25',
    'Technoton; DUT-E CAN L=1000; SN 2654001 5 01959; Date 10/25',
    'VWEC5-280824-0162',
    'VWEC5-280824-0163',
    'VWEC5-280824-0164',
    'VWEC5-280824-0165',
    'VWEC5-280824-0166',
    'VWEC5-280824-0167',
    'VWEC5-280824-0168',
    'VWEC5-280824-0169',
    'VWEC5-280824-0170',
    'VWEC5-280824-0171'
  )
)
WHERE technician_email = 'andre.cris.evert.justin@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '56.10.3.9')
  );

-- Technician: andre.justin.cris.evert@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '866568080126732',
    '89450000000035804054',
    'MC-808K-251204-0020',
    'MC-808K-251204-0043',
    'MC804I-260318-0083',
    'MTX-10M-6P0038',
    'MTX-10MCAB-0230',
    'MTX-10MCAB-0231',
    'MTX-512GB-148',
    'MTX-MC832-250915-0005',
    'MTX-MC833-250917-0013',
    'VWEC5-280824-0160',
    'VWEC5-280824-0161'
  )
)
WHERE technician_email = 'andre.justin.cris.evert@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '866568080126732')
  );

-- Technician: andre.justin.evert.cris@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '866568080123754',
    '89450000000035804070',
    'MC-808K-251204-0067',
    'MC-808K-251204-0080',
    'MC804I-250813-0003',
    'MTX-10M-6P0036',
    'MTX-10MCAB-0198',
    'MTX-10MCAB-0200',
    'MTX-512GB-146',
    'MTX-MC832-250813-0010',
    'MTX-MC833-250917-0024',
    'VWEC5-280824-0156',
    'VWEC5-280824-0157'
  )
)
WHERE technician_email = 'andre.justin.evert.cris@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '866568080123754')
  );

-- Technician: andre.justin@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '866568080095861',
    '866568080123754',
    '866568080126732',
    '89450000000035804054',
    '89450000000035804062',
    '89450000000035804070',
    'MC-808K-250911-0015',
    'MC-808K-250911-0022',
    'MC-808K-251204-0020',
    'MC-808K-251204-0043',
    'MC-808K-251204-0067',
    'MC-808K-251204-0080',
    'MC804I-250813-0003',
    'MC804I-250813-0019',
    'MC804I-260318-0083',
    'MTX-10M-6P0036',
    'MTX-10M-6P0037',
    'MTX-10M-6P0038',
    'MTX-10MCAB-0198',
    'MTX-10MCAB-0200',
    'MTX-10MCAB-0227',
    'MTX-10MCAB-0229',
    'MTX-10MCAB-0230',
    'MTX-10MCAB-0231',
    'MTX-512GB-146',
    'MTX-512GB-147',
    'MTX-512GB-148',
    'MTX-MC832-250813-0007',
    'MTX-MC832-250813-0010',
    'MTX-MC832-250915-0005',
    'MTX-MC833-250917-0008',
    'MTX-MC833-250917-0013',
    'MTX-MC833-250917-0024',
    'VWEC5-280824-0156',
    'VWEC5-280824-0157',
    'VWEC5-280824-0158',
    'VWEC5-280824-0159',
    'VWEC5-280824-0160',
    'VWEC5-280824-0161'
  )
)
WHERE technician_email = 'andre.justin@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '866568080095861')
  );

-- Technician: andre@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '241122-DC033-S0002',
    '52.83.1.100',
    '56.10.3.6',
    '56.10.3.65',
    '56.10.3.95',
    '56.5.3.7',
    '56.5.3.81',
    '59.97.1.17',
    '61.251.1.130',
    '75307281',
    '75310922',
    '75311167',
    '75311187',
    '75311321',
    '75311327',
    '75311338',
    '75338309',
    '75338367',
    '75356071',
    '862221085872223',
    '866568080096042',
    '867191082365692',
    '89320000000005344888',
    '89320000000024250033',
    '89320000000024252823',
    '89320000000030113340',
    '89320000000032334027',
    '89320000000032811859',
    '89330000000029036709',
    '89410000000027396972',
    '89450000000035805200',
    '89460000000019558436',
    '89550000000016720284',
    '89610000000017667569',
    '89820000000010860497',
    'BUZZ - 310125-005',
    'BUZZ-151124-001',
    'BUZZ-240918-014',
    'BUZZ-240918-015',
    'BUZZ-240918-016',
    'BUZZ-25730-003',
    'BUZZ-25730-011',
    'BUZZ-25730-015',
    'BUZZ-A067',
    'BUZZ-A070',
    'BUZZ-A104',
    'BUZZ-A108',
    'BUZZ-A109',
    'BUZZ-A110',
    'BUZZ-A111',
    'BUZZ-A112',
    'BUZZ-A113',
    'BUZZ-A114',
    'BUZZ-A115',
    'BUZZ-A134',
    'BUZZ-A135',
    'BUZZ-A136',
    'BUZZ-A137',
    'BUZZ-A138',
    'BUZZ-A139',
    'BUZZ-A140',
    'BUZZ-A141',
    'BUZZ-A142',
    'BUZZ-A143',
    'BUZZ-A144',
    'BUZZ-A145',
    'BUZZ-A146',
    'BUZZ-A148',
    'BUZZ-A149',
    'BUZZ-A150',
    'BUZZ-A152',
    'BUZZ1059',
    'EIGK00039416647',
    'EIGK00039416725',
    'EIHA00040653571',
    'EIJH00066532290',
    'EIJH00066534045',
    'EIJK00068699517',
    'EIJK00068700195',
    'EIJK00068701151',
    'MC-808K-260119-0034',
    'MC-808K-260119-0039',
    'MC-808K-260311-0084',
    'MC-808K-260311-0089',
    'MC804I-260318-0072',
    'MTX-10M-6P0048',
    'MTX-10MCAB-0182',
    'MTX-10MCAB-0184',
    'MTX-10MCAB-0248',
    'MTX-512GB-143',
    'MTX-512GB-159',
    'MTX-5MCAB-0160',
    'MTX-5MCAB-0161',
    'MTX-MC832-250813-0015',
    'MTX-MC832-250813-0018',
    'MTX-MC833-250917-0018',
    'MTX-MC833-250917-0035',
    'TF-174',
    'VWEC5-280824-0173',
    'VWEC5-280824-0182',
    'VWEC5-280824-0183'
  )
)
WHERE technician_email = 'andre@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '241122-DC033-S0002')
  );

-- Technician: Brandon@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '75229621',
    '75230246'
  )
)
WHERE technician_email = 'Brandon@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '75229621')
  );

-- Technician: Cris@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '49.228.2.67',
    '56.10.3.65',
    '56.60.3.233',
    '75338367',
    '75355719',
    '860796051254425',
    '860796051254441',
    '860796051254706',
    '860796051254854',
    '860796051261263',
    '860796051267252',
    '860796051267286',
    '862221085865730',
    '862221087858923',
    '866568080073421',
    '866568080084212',
    '866568080096042',
    '89320000000024252781',
    '89320000000032334357',
    '89320000000032334365',
    '89320000000032334829',
    '89320000000032334837',
    '89410000000027396972',
    '89410000000027398754',
    '89440000000030057246',
    '89440000000030087896',
    '89450000000035805226',
    '89450000000035805952',
    '89450000000035805978',
    '89450000000035805986',
    '89610000000017667569',
    '89890000000008047209',
    'BUZZ-A132',
    'BUZZ-A133',
    'EIGK00039416725',
    'MC-808K-260311-0084',
    'MC-808K-260311-0089',
    'MTX-10MCAB-0247',
    'MTX-10MCAB-0248',
    'MTX-512GB-143',
    'MTX-MC832-250813-0015',
    'MTX-MC833-250917-0018',
    'TF-178',
    'TF-190',
    'TF-245',
    'TF-249',
    'VWEC5-280824-0182'
  )
)
WHERE technician_email = 'Cris@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '49.228.2.67')
  );

-- Technician: edge@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '51.109.1.145',
    '51.109.1.185',
    '51.109.1.189',
    '51.110.1.153',
    '51.110.1.165',
    '51.73.1.212',
    '59.95.1.190',
    '59.98.1.219',
    '75258813',
    '75310233',
    '75310753',
    '89610000000014088140'
  )
)
WHERE technician_email = 'edge@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '51.109.1.145')
  );

-- Technician: evert.andre.cris.justin@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '866568080095861',
    '89450000000035804062',
    'MC-808K-250911-0015',
    'MC-808K-250911-0022',
    'MC804I-250813-0019',
    'MTX-10M-6P0037',
    'MTX-10MCAB-0227',
    'MTX-10MCAB-0229',
    'MTX-512GB-147',
    'MTX-MC832-250813-0007',
    'MTX-MC833-250917-0008',
    'VWEC5-280824-0158',
    'VWEC5-280824-0159'
  )
)
WHERE technician_email = 'evert.andre.cris.justin@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '866568080095861')
  );

-- Technician: Evert@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '1416E418',
    '58.166.2.8',
    '62.137.2.208',
    '75230491',
    '75258786',
    '75306929',
    '75306965',
    '75306992',
    '75307028',
    '75307116',
    '75310950',
    '75310966',
    '75311264',
    '75311606',
    '75340548',
    '75340633',
    '75340665',
    '75340693',
    '75340825',
    '75367974',
    '867191082311076',
    '867191082322198',
    '867934083326902',
    '867934083331290',
    '89300000000019006038',
    '89310000000006981275',
    '89320000000032334415',
    '89320000000032336568',
    '89320000000032336881',
    '89440000000030055539',
    '89440000000030056156',
    'BUZZ-A107',
    'eiil00057204675',
    'eiil00057337760',
    'EIJK00068700562',
    'EIMB00103951606',
    'MC-808K-251204-0071',
    'MC-808K-260311-0021',
    'MC-808K-260311-0027',
    'MC-808K-260311-0035',
    'MC-808K-260311-0048',
    'MC-808K-260311-0050',
    'MC-808K-260311-0055',
    'MC-808K-260311-0057',
    'MC804I-260318-0081',
    'MC804I-260318-0089',
    'MC832-251204-0022',
    'MTX-10M-6P0043',
    'MTX-10M-6P0044',
    'MTX-10M-6P0058',
    'MTX-10MCAB-0239',
    'MTX-10MCAB-0240',
    'MTX-10MCAB-0241',
    'MTX-10MCAB-0242',
    'MTX-10MCAB-0245',
    'MTX-10MCAB-0246',
    'MTX-10MCAB-0279',
    'MTX-10MCAB-0280',
    'MTX-512GB-155',
    'MTX-512GB-156',
    'MTX-512GB-170',
    'MTX-512GB-174',
    'MTX-5MCAB-0172',
    'MTX-5MCAB-0173',
    'MTX-MC832-250813-0005',
    'MTX-MC832-260305-0068',
    'MTX-MC832-260305-0090',
    'MTX-MC833-250917-0015',
    'MTX-MC833-250917-0020',
    'MTX-MC833-250917-0030',
    'MTX-MC833-260309-0001',
    'VWEC5-280824-0146',
    'VWEC5-280824-0147',
    'VWEC5-280824-0170',
    'VWEC5-280824-0171',
    'VWEC5-280824-0172'
  )
)
WHERE technician_email = 'Evert@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '1416E418')
  );

-- Technician: justin.evert@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '56.5.3.55',
    '75258786',
    '75310301',
    '75310330',
    '75310403',
    '75310969',
    '75311174',
    '75311376',
    '75311393',
    '89300000000029361050',
    'EIJH00066532645',
    'EIJK00068700639',
    'EIJK00068702084',
    'EIJK00068702439',
    'EIMB00103934636'
  )
)
WHERE technician_email = 'justin.evert@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '56.5.3.55')
  );

-- Technician: Justin@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '230822-MD141S0016',
    '49.228.2.77',
    '54.20.3.208',
    '56.10.3.51',
    '56.10.3.86',
    '56.5.3.109',
    '56.5.3.153',
    '56.9.3.161',
    '60.41.2.207',
    '62.137.2.208',
    '63.213.2.124',
    '63.215.2.164',
    '72592046',
    '75258786',
    '75303322',
    '75306947',
    '75306970',
    '75307028',
    '75310065',
    '75310301',
    '75310403',
    '75310969',
    '75311376',
    '75311393',
    '75348768',
    '866568080126070',
    '866568080140923',
    '867934083277428',
    '867934083326902',
    '89300000000010028239',
    '89300000000029361563',
    '89310000000023023127',
    '89320000000005344599',
    '89320000000024250371',
    '89320000000029465545',
    '89320000000032333953',
    '89320000000032334407',
    '89320000000032811842',
    '89370000000006563366',
    '89410000000027396865',
    '89440000000030055539',
    '89440000000030056156',
    '89440000000030056560',
    '89440000000030058012',
    '89600000000023767537',
    '89610000000017667668',
    '89820000000005654863',
    'BUZZ-A106',
    'BUZZ-A107',
    'eijh00066536067',
    'EIJK00068700639',
    'EIJK00068702084',
    'EIKH00054328775',
    'EIMB00103934636',
    'EIMB00103936058',
    'EIMB00103951606',
    'EIMB00103952862',
    'MC-808K-250911-0018',
    'MC-808K-251204-0060',
    'MC-808K-251204-0071',
    'MC-808K-260311-0035',
    'MC804I-250813-0010',
    'MTX-10M-6P0047',
    'MTX-10MCAB-0115',
    'MTX-10MCAB-0116',
    'MTX-10MCAB-0245',
    'MTX-10MCAB-0246',
    'MTX-512GB-105',
    'MTX-512GB-145',
    'MTX-512GB-158',
    'MTX-512GB-170',
    'MTX-MC832-260305-0082',
    'MTX-MC832-260305-0090',
    'MTX-MC833-250917-0015',
    'MTX-MC833-260309-0022',
    'SC7M270224-042',
    'SOL-220925-034',
    'SOL-220925-036',
    'SOL-220925-039',
    'Technoton; DUT-E CAN L=1000; SN 2654001 5 01965; Date 10/25',
    'VWEC5-280824-0146',
    'VWEC5-280824-0147',
    'VWEC5-280824-0181'
  )
)
WHERE technician_email = 'Justin@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '230822-MD141S0016')
  );

-- Technician: Tech@soltrack.co.za
UPDATE tech_stock
SET assigned_parts = (
  SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(assigned_parts) elem
  WHERE elem->>'serial_number' NOT IN (
    '73644359'
  )
)
WHERE technician_email = 'Tech@soltrack.co.za'
  AND assigned_parts @> jsonb_build_array(
    jsonb_build_object('serial_number', '73644359')
  );

-- Verify: run the detection query again to confirm 0 results
