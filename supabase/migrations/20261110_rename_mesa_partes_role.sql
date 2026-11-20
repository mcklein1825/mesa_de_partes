begin;

alter table public.perfiles
  drop constraint if exists perfiles_rol_check;

update public.perfiles
set rol = 'DireccionGeneral'
where rol = 'MesaPartes';

update public.perfiles
set area = 'Dirección General'
where area = 'Mesa de Partes';

alter table public.perfiles
  add constraint perfiles_rol_check
  check (rol in ('DireccionGeneral', 'AreaOperativa', 'Administrador', 'Auditor'));

commit;

notify pgrst, 'reload schema';
