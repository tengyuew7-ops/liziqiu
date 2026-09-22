-- Like or Love: food choice records for CloudBase PostgreSQL.
-- Browser visitors may insert one of the allowed foods, but cannot read,
-- update, or delete any rows through the public client role.
-- This migration is safe to run again. Existing rows are preserved.

begin;

create table if not exists public.food_choices (
  id bigint generated always as identity primary key,
  food_id varchar(40) not null,
  food varchar(40) not null,
  nickname varchar(20) not null default '' check (char_length(nickname) <= 20),
  visitor_id varchar(80) not null check (char_length(visitor_id) between 1 and 80),
  request_id varchar(80) not null unique check (char_length(request_id) between 1 and 80),
  client_time timestamptz,
  source varchar(40) not null default 'github-pages' check (source = 'github-pages'),
  page_version varchar(20) not null default '2.0',
  created_at timestamptz not null default now(),
  constraint food_choices_allowed_food check (
    (food_id, food) in (
      ('hotpot', '火锅'),
      ('bbq', '烤肉'),
      ('sushi', '日料'),
      ('malatang', '麻辣烫'),
      ('shaokao', '烧烤'),
      ('pizza', '披萨'),
      ('noodles', '面 / 粉'),
      ('fried-chicken', '炸鸡'),
      ('home-cooking', '家常菜'),
      ('burger', '汉堡'),
      ('dessert', '甜品'),
      ('milk-tea', '奶茶')
    )
  )
);

create index if not exists food_choices_created_at_idx
  on public.food_choices (created_at desc);

alter table public.food_choices enable row level security;

revoke all on table public.food_choices from public, anon, authenticated;
revoke all on sequence public.food_choices_id_seq from public, anon, authenticated;

grant usage on schema public to anon, service_role;
grant insert on table public.food_choices to anon;
grant usage, select on sequence public.food_choices_id_seq to anon;
grant all on table public.food_choices to service_role;
grant usage, select on sequence public.food_choices_id_seq to service_role;

drop policy if exists "anonymous visitors can submit food choices"
  on public.food_choices;

create policy "anonymous visitors can submit food choices"
  on public.food_choices
  for insert
  to anon
  with check (true);

comment on table public.food_choices is
  'Food choices submitted from the Like or Love GitHub Pages site.';

commit;
