create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'insumo',
  base_unit text not null check (base_unit in ('g','ml','un')),
  presentation_quantity numeric not null default 1 check (presentation_quantity > 0),
  presentation_price numeric not null default 0 check (presentation_price >= 0),
  default_unit_cost numeric not null default 0 check (default_unit_cost >= 0),
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  lot_code text not null default '',
  quantity_initial numeric not null check (quantity_initial > 0),
  quantity_available numeric not null check (quantity_available >= 0),
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  purchased_at date,
  expires_at date,
  status text not null default 'available' check (status in ('available','expiring','expired','blocked','discarded','depleted')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase','session_use','recipe_use','waste','adjustment')),
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('g','ml','un')),
  unit_cost_snapshot numeric not null default 0 check (unit_cost_snapshot >= 0),
  reason text check (reason in ('vencimiento','calidad','preparacion','conteo','otro')),
  notes text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.preparation_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  recipe_type text not null default 'drink' check (recipe_type in ('base','drink','pairing')),
  yield_quantity numeric not null default 1 check (yield_quantity > 0),
  yield_unit text not null default 'un' check (yield_unit in ('g','ml','un')),
  portion_quantity numeric not null default 1 check (portion_quantity > 0),
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.preparation_recipes(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete restrict,
  nested_recipe_id uuid references public.preparation_recipes(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('g','ml','un')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint recipe_items_one_source check (
    (inventory_item_id is not null and nested_recipe_id is null)
    or (inventory_item_id is null and nested_recipe_id is not null)
  )
);

create table if not exists public.omakase_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_per_person numeric not null default 0 check (price_per_person >= 0),
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.omakase_menu_steps (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.omakase_menus(id) on delete cascade,
  step_order integer not null check (step_order >= 0),
  step_name text not null,
  drink_recipe_id uuid references public.preparation_recipes(id) on delete set null,
  pairing_recipe_id uuid references public.preparation_recipes(id) on delete set null,
  pairing_optional boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.session_operating_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  menu_id uuid references public.omakase_menus(id) on delete set null,
  estimated_guests integer not null default 0 check (estimated_guests >= 0),
  served_menus integer not null default 0 check (served_menus >= 0),
  venue_cost numeric not null default 0 check (venue_cost >= 0),
  barista_cost numeric not null default 0 check (barista_cost >= 0),
  other_cost numeric not null default 0 check (other_cost >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id)
);

create index if not exists inventory_lots_item_id_idx on public.inventory_lots(item_id);
create index if not exists inventory_lots_expires_at_idx on public.inventory_lots(expires_at);
create index if not exists stock_movements_lot_id_idx on public.stock_movements(lot_id);
create index if not exists recipe_items_recipe_id_idx on public.recipe_items(recipe_id);
create index if not exists omakase_menu_steps_menu_id_idx on public.omakase_menu_steps(menu_id);

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_lots to authenticated;
grant select, insert, update, delete on public.stock_movements to authenticated;
grant select, insert, update, delete on public.preparation_recipes to authenticated;
grant select, insert, update, delete on public.recipe_items to authenticated;
grant select, insert, update, delete on public.omakase_menus to authenticated;
grant select, insert, update, delete on public.omakase_menu_steps to authenticated;
grant select, insert, update, delete on public.session_operating_costs to authenticated;

grant all on public.inventory_items to service_role;
grant all on public.inventory_lots to service_role;
grant all on public.stock_movements to service_role;
grant all on public.preparation_recipes to service_role;
grant all on public.recipe_items to service_role;
grant all on public.omakase_menus to service_role;
grant all on public.omakase_menu_steps to service_role;
grant all on public.session_operating_costs to service_role;

alter table public.inventory_items enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.stock_movements enable row level security;
alter table public.preparation_recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.omakase_menus enable row level security;
alter table public.omakase_menu_steps enable row level security;
alter table public.session_operating_costs enable row level security;

drop policy if exists "staff manage inventory items" on public.inventory_items;
create policy "staff manage inventory items" on public.inventory_items
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage inventory lots" on public.inventory_lots;
create policy "staff manage inventory lots" on public.inventory_lots
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage stock movements" on public.stock_movements;
create policy "staff manage stock movements" on public.stock_movements
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage preparation recipes" on public.preparation_recipes;
create policy "staff manage preparation recipes" on public.preparation_recipes
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage recipe items" on public.recipe_items;
create policy "staff manage recipe items" on public.recipe_items
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage omakase menus" on public.omakase_menus;
create policy "staff manage omakase menus" on public.omakase_menus
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage omakase menu steps" on public.omakase_menu_steps;
create policy "staff manage omakase menu steps" on public.omakase_menu_steps
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "staff manage session operating costs" on public.session_operating_costs;
create policy "staff manage session operating costs" on public.session_operating_costs
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop trigger if exists inventory_items_updated_at on public.inventory_items;
create trigger inventory_items_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

drop trigger if exists inventory_lots_updated_at on public.inventory_lots;
create trigger inventory_lots_updated_at before update on public.inventory_lots
  for each row execute function public.set_updated_at();

drop trigger if exists preparation_recipes_updated_at on public.preparation_recipes;
create trigger preparation_recipes_updated_at before update on public.preparation_recipes
  for each row execute function public.set_updated_at();

drop trigger if exists omakase_menus_updated_at on public.omakase_menus;
create trigger omakase_menus_updated_at before update on public.omakase_menus
  for each row execute function public.set_updated_at();

drop trigger if exists session_operating_costs_updated_at on public.session_operating_costs;
create trigger session_operating_costs_updated_at before update on public.session_operating_costs
  for each row execute function public.set_updated_at();

insert into public.inventory_items (id, name, category, base_unit, presentation_quantity, presentation_price, default_unit_cost, notes) values
  ('00000000-0000-4000-8000-000000000101', 'Cafe filtrado', 'cafe', 'g', 1000, 150, 0.1500, 'Bolsa para metodos filtrados'),
  ('00000000-0000-4000-8000-000000000102', 'Cafe espresso', 'cafe', 'g', 1000, 72.5, 0.0725, 'Bolsa para espresso y cold brew'),
  ('00000000-0000-4000-8000-000000000103', 'Leche vegetal', 'lacteo', 'ml', 1000, 16.2, 0.0162, ''),
  ('00000000-0000-4000-8000-000000000104', 'Leche regular', 'lacteo', 'ml', 946, 6.5, 0.0069, ''),
  ('00000000-0000-4000-8000-000000000105', 'Cocoa', 'seco', 'g', 1000, 70, 0.0700, ''),
  ('00000000-0000-4000-8000-000000000106', 'Licor', 'bar', 'ml', 700, 109, 0.1557, ''),
  ('00000000-0000-4000-8000-000000000107', 'Fruta', 'fruta', 'g', 1000, 6.29, 0.0063, ''),
  ('00000000-0000-4000-8000-000000000108', 'Copoazu', 'fruta', 'g', 1000, 64, 0.0640, ''),
  ('00000000-0000-4000-8000-000000000109', 'Helado', 'frio', 'g', 471, 10, 0.0212, ''),
  ('00000000-0000-4000-8000-000000000110', 'Otros', 'servicio', 'un', 1, 0.02, 0.0200, 'Costos menores por porcion')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  base_unit = excluded.base_unit,
  presentation_quantity = excluded.presentation_quantity,
  presentation_price = excluded.presentation_price,
  default_unit_cost = excluded.default_unit_cost,
  notes = excluded.notes;

insert into public.inventory_lots (id, item_id, lot_code, quantity_initial, quantity_available, unit_cost, purchased_at, expires_at, status, notes) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'CAF-F-001', 1000, 1000, 0.1500, current_date - 12, current_date + 35, 'available', ''),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'CAF-E-001', 1000, 1000, 0.0725, current_date - 10, current_date + 28, 'available', ''),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103', 'LV-001', 1000, 1000, 0.0162, current_date - 2, current_date + 8, 'expiring', ''),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000104', 'LR-001', 946, 946, 0.0069, current_date - 1, current_date + 6, 'expiring', ''),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000105', 'COCOA-001', 1000, 1000, 0.0700, current_date - 40, current_date + 220, 'available', ''),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000106', 'LIC-001', 700, 700, 0.1557, current_date - 45, current_date + 360, 'available', ''),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000107', 'FRUTA-001', 1000, 1000, 0.0063, current_date - 1, current_date + 5, 'expiring', ''),
  ('00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000108', 'COPO-001', 1000, 1000, 0.0640, current_date - 14, current_date + 90, 'available', ''),
  ('00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000109', 'HEL-001', 471, 471, 0.0212, current_date - 7, current_date + 18, 'available', '')
on conflict (id) do update set
  quantity_initial = excluded.quantity_initial,
  unit_cost = excluded.unit_cost,
  purchased_at = excluded.purchased_at,
  expires_at = excluded.expires_at,
  status = case when public.inventory_lots.quantity_available = 0 then 'depleted' else excluded.status end,
  notes = excluded.notes;

insert into public.preparation_recipes (id, name, recipe_type, yield_quantity, yield_unit, portion_quantity, active, notes) values
  ('00000000-0000-4000-8000-000000000301', 'Agua', 'drink', 1, 'un', 1, true, 'Costo operativo por servicio de agua'),
  ('00000000-0000-4000-8000-000000000302', 'Filtrado V60', 'drink', 1, 'un', 1, true, ''),
  ('00000000-0000-4000-8000-000000000303', 'Cold brew copoazu', 'drink', 1, 'un', 1, true, ''),
  ('00000000-0000-4000-8000-000000000304', 'Carajillo', 'drink', 1, 'un', 1, true, ''),
  ('00000000-0000-4000-8000-000000000305', 'Infusion de cascara de cafe', 'drink', 1, 'un', 1, true, ''),
  ('00000000-0000-4000-8000-000000000306', 'Mocaccino con leche avellana', 'drink', 1, 'un', 1, false, 'Archivada desde la matriz de costeo')
on conflict (id) do update set
  name = excluded.name,
  recipe_type = excluded.recipe_type,
  yield_quantity = excluded.yield_quantity,
  yield_unit = excluded.yield_unit,
  portion_quantity = excluded.portion_quantity,
  active = excluded.active,
  notes = excluded.notes;

delete from public.recipe_items where recipe_id in (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000305',
  '00000000-0000-4000-8000-000000000306'
);

insert into public.recipe_items (recipe_id, inventory_item_id, quantity, unit, notes) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000110', 100, 'un', 'Costo plano referencial de agua por menu'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 7.5, 'g', ''),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000102', 20, 'g', ''),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000104', 30, 'ml', ''),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000107', 20, 'g', ''),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000102', 15, 'g', ''),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000106', 15, 'ml', ''),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000110', 26, 'un', ''),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000110', 75, 'un', '');

insert into public.omakase_menus (id, name, price_per_person, active, notes) values
  ('00000000-0000-4000-8000-000000000401', 'Menu Excel base', 120, true, 'Menu inicial armado desde la matriz de bebidas')
on conflict (id) do update set
  name = excluded.name,
  price_per_person = excluded.price_per_person,
  active = excluded.active,
  notes = excluded.notes;

delete from public.omakase_menu_steps where menu_id = '00000000-0000-4000-8000-000000000401';

insert into public.omakase_menu_steps (menu_id, step_order, step_name, drink_recipe_id, pairing_recipe_id, pairing_optional) values
  ('00000000-0000-4000-8000-000000000401', 0, 'Agua', '00000000-0000-4000-8000-000000000301', null, false),
  ('00000000-0000-4000-8000-000000000401', 1, 'Filtrado V60', '00000000-0000-4000-8000-000000000302', null, false),
  ('00000000-0000-4000-8000-000000000401', 3, 'Cold brew copoazu', '00000000-0000-4000-8000-000000000303', null, false),
  ('00000000-0000-4000-8000-000000000401', 4, 'Carajillo', '00000000-0000-4000-8000-000000000304', null, false),
  ('00000000-0000-4000-8000-000000000401', 5, 'Infusion de cascara de cafe', '00000000-0000-4000-8000-000000000305', null, false);