update public.staff_users
set modules = (
  select array_agg(distinct module_key order by module_key)
  from unnest(
    modules
    || case
      when 'inventario' = any(modules) and not ('insumos' = any(modules))
        then array['insumos']::text[]
      else array[]::text[]
    end
    || case
      when 'costeo' = any(modules) and not ('menus' = any(modules))
        then array['menus']::text[]
      else array[]::text[]
    end
  ) as module_key
)
where modules is not null
  and array_length(modules, 1) is not null
  and (
    ('inventario' = any(modules) and not ('insumos' = any(modules)))
    or ('costeo' = any(modules) and not ('menus' = any(modules)))
  );
