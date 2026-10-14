-- More provider groups for B's halls (they were all 'other'): one per university, plus the
-- private providers with several halls. Single-hall private providers stay 'other'.
-- Colours of university providers match public.universities.

insert into public.providers (id, name, kind, colour) values
  ('qmul',        'QMUL',        'university', '#1d4ed8'),
  ('lse',         'LSE',         'university', '#be123c'),
  ('gold',        'Goldsmiths',  'university', '#0f766e'),
  ('uel',         'UEL',         'university', '#0e7490'),
  ('greenwich',   'Greenwich',   'university', '#a16207'),
  ('westminster', 'Westminster', 'university', '#7c2d12'),
  ('mdx',         'Middlesex',   'university', '#be185d'),
  ('stmarys',     'St Mary''s',  'university', '#1e3a8a'),
  ('mezzino',     'Mezzino',     'private',    '#16a34a'),
  ('urbanest',    'Urbanest',    'private',    '#1f2937'),
  ('stayclub',    'Stay Club',   'private',    '#c026d3')
on conflict (id) do nothing;

-- St Mary's University, Twickenham (Cashin hall)
insert into public.universities (id, name, email_domains, colour) values
  ('stmarys', 'St Mary''s University', '{stmarys.ac.uk}', '#1e3a8a')
on conflict (id) do nothing;
