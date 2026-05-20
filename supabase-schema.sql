-- Schuurtje — multi-kapper platform
-- Voer dit uit in de Supabase SQL editor

create table if not exists barbers (
  id         uuid primary key default gen_random_uuid(),
  naam       text not null,
  slug       text not null unique,
  bio        text,
  foto_url   text,
  email      text not null unique,
  password_hash text not null,
  actief     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references barbers(id) on delete cascade,
  code       text not null unique,
  naam       text not null,
  email      text not null,
  telefoon   text not null,
  service    text not null,
  prijs      numeric(8,2) not null,
  datum      date not null,
  tijd       text not null,
  duur       integer not null,
  notities   text,
  no_show    boolean not null default false,
  geannuleerd boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bookings_barber_datum on bookings(barber_id, datum);
create index if not exists bookings_email on bookings(email);

create table if not exists settings (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references barbers(id) on delete cascade,
  key        text not null,
  value      text not null,
  unique(barber_id, key)
);

create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references barbers(id) on delete cascade,
  naam       text not null,
  email      text not null,
  telefoon   text not null,
  service    text not null,
  datum      date not null,
  created_at timestamptz not null default now()
);

create table if not exists cancelled_bookings (
  id             uuid primary key default gen_random_uuid(),
  barber_id      uuid not null references barbers(id) on delete cascade,
  code           text not null,
  naam           text not null,
  email          text not null,
  telefoon       text not null,
  service        text not null,
  prijs          numeric(8,2) not null,
  datum          date not null,
  tijd           text not null,
  duur           integer not null,
  reden          text,
  geannuleerd_op timestamptz not null default now()
);

create table if not exists banned_emails (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references barbers(id) on delete cascade,
  email      text not null,
  reden      text,
  created_at timestamptz not null default now(),
  unique(barber_id, email)
);

-- RLS: alles via service role key (geen directe client toegang)
alter table barbers enable row level security;
alter table bookings enable row level security;
alter table settings enable row level security;
alter table waitlist enable row level security;
alter table cancelled_bookings enable row level security;
alter table banned_emails enable row level security;

-- Standaard instellingen voor een nieuwe kapper invoegen:
-- INSERT INTO settings (barber_id, key, value) VALUES
--   ('UUID_HIER', 'day_schedule', '{"0":{"open":false,"start":"09:00","end":"18:00","breaks":[]},"1":{"open":true,"start":"09:00","end":"18:00","breaks":[{"start":"13:00","end":"14:00"}]},"2":{"open":true,"start":"09:00","end":"18:00","breaks":[{"start":"13:00","end":"14:00"}]},"3":{"open":true,"start":"09:00","end":"18:00","breaks":[{"start":"13:00","end":"14:00"}]},"4":{"open":true,"start":"09:00","end":"18:00","breaks":[{"start":"13:00","end":"14:00"}]},"5":{"open":true,"start":"09:00","end":"18:00","breaks":[{"start":"13:00","end":"14:00"}]},"6":{"open":false,"start":"09:00","end":"18:00","breaks":[]}}'),
--   ('UUID_HIER', 'diensten', '[{"id":"1","naam":"Knipbeurt","prijs":20,"duur":30},{"id":"2","naam":"Baard trimmen","prijs":15,"duur":15}]'),
--   ('UUID_HIER', 'meldingen', 'true'),
--   ('UUID_HIER', 'herinneringen', 'true');
