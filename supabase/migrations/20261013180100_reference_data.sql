-- Universities, campuses and providers. Properties + room types come from data/seed.py.

insert into public.universities (id, name, email_domains, colour) values
  ('ucl',      'UCL',                              '{ucl.ac.uk}',                    '#4f46e5'),
  ('kcl',      'King''s College London',           '{kcl.ac.uk}',                    '#dc2626'),
  ('imperial', 'Imperial College London',          '{imperial.ac.uk,ic.ac.uk}',      '#0369a1'),
  ('qmul',     'Queen Mary University of London',  '{qmul.ac.uk}',                   '#1d4ed8'),
  ('lse',      'LSE',                              '{lse.ac.uk}',                    '#be123c'),
  ('city',     'City St George''s',                '{city.ac.uk,citystgeorges.ac.uk,sgul.ac.uk}', '#9333ea'),
  ('soas',     'SOAS',                             '{soas.ac.uk}',                   '#b45309'),
  ('gold',     'Goldsmiths',                       '{gold.ac.uk}',                   '#0f766e'),
  ('bbk',      'Birkbeck',                         '{bbk.ac.uk}',                    '#15803d'),
  ('ual',      'University of the Arts London',    '{arts.ac.uk}',                   '#111827'),
  ('westminster', 'University of Westminster',     '{westminster.ac.uk}',            '#7c2d12'),
  ('uel',      'University of East London',        '{uel.ac.uk}',                    '#0e7490'),
  ('lsbu',     'London South Bank University',     '{lsbu.ac.uk}',                   '#4338ca'),
  ('greenwich','University of Greenwich',          '{gre.ac.uk,greenwich.ac.uk}',    '#a16207'),
  ('mdx',      'Middlesex University',             '{mdx.ac.uk}',                    '#be185d'),
  ('roehampton','University of Roehampton',        '{roehampton.ac.uk}',             '#047857'),
  ('brunel',   'Brunel University London',         '{brunel.ac.uk}',                 '#1e3a8a'),
  ('rhul',     'Royal Holloway',                   '{rhul.ac.uk,royalholloway.ac.uk}', '#6d28d9'),
  ('demo',     'Demo University (judges)',         '{demo.ac.uk}',                   '#6b7280');

insert into public.campuses (id, university_id, name, lat, lng) values
  ('ucl-bloomsbury', 'ucl',      'UCL Bloomsbury',             51.5246, -0.1340),
  ('ucl-east',       'ucl',      'UCL East (Marshgate)',       51.5383, -0.0105),
  ('kcl-strand',     'kcl',      'KCL Strand',                 51.5115, -0.1160),
  ('kcl-guys',       'kcl',      'KCL Guy''s',                 51.5033, -0.0866),
  ('kcl-waterloo',   'kcl',      'KCL Waterloo',               51.5057, -0.1131),
  ('imperial-sk',    'imperial', 'Imperial South Kensington',  51.4988, -0.1749),
  ('imperial-wc',    'imperial', 'Imperial White City',        51.5150, -0.2240),
  ('qmul-mile-end',  'qmul',     'QMUL Mile End',              51.5246, -0.0403),
  ('lse',            'lse',      'LSE Holborn',                51.5144, -0.1165);

insert into public.providers (id, name, kind, colour) values
  ('unite',    'Unite',    'private',    '#e11d48'),
  ('iq',       'iQ',       'private',    '#7c3aed'),
  ('chapter',  'Chapter',  'private',    '#0891b2'),
  ('scape',    'Scape',    'private',    '#ea580c'),
  ('prestige', 'Prestige', 'private',    '#ca8a04'),
  ('ucl',      'UCL',      'university', '#4f46e5'),
  ('kcl',      'KCL',      'university', '#dc2626'),
  ('imperial', 'Imperial', 'university', '#0369a1'),
  ('other',    'Other',    'private',    '#6b7280');
