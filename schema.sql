create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('instagram', 'whatsapp', 'email')),
  external_id text not null,
  sender_name text,
  meta jsonb not null default '{}',
  status text not null default 'new',
  collected jsonb not null default '{}',
  evidence jsonb not null default '[]',
  assigned_rep text,
  assignment_rule text,
  offered_slots jsonb not null default '[]',
  meeting_result text not null default 'none',
  takeover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table if not exists messages (
  id bigserial primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  author text not null check (author in ('lead', 'assistant', 'human')),
  body text not null,
  provider_id text,
  created_at timestamptz not null default now(),
  unique (conversation_id, provider_id)
);

create table if not exists actions (
  id bigserial primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  kind text not null,
  detail text not null,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references conversations(id) on delete cascade,
  rep_id text not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  event_id text not null,
  event_link text,
  status text not null check (status in ('pending', 'confirmed', 'uncertain', 'failed')),
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integration_state (
  name text primary key,
  ok boolean not null,
  detail text,
  updated_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages (conversation_id, id);
create index if not exists actions_conversation_idx on actions (conversation_id, id);
