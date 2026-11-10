begin;

do $security$
begin
  if to_regclass('public.expedientes') is not null then
    execute 'drop policy if exists "expedientes_select_anon" on public.expedientes';
    execute 'drop policy if exists "expedientes_insert_anon" on public.expedientes';
    execute 'drop policy if exists "expedientes_update_anon" on public.expedientes';
    execute 'revoke all on table public.expedientes from anon';
  end if;
end;
$security$;

drop policy if exists memorandos_multiples_select_authenticated
  on public.memorandos_multiples;
create policy memorandos_multiples_select_authenticated
  on public.memorandos_multiples for select to authenticated
  using (
    exists (
      select 1
      from public.perfiles perfil
      where perfil.id = auth.uid()
        and perfil.activo = true
        and (
          perfil.rol in ('DireccionGeneral', 'Administrador', 'Auditor')
          or (
            perfil.rol = 'AreaOperativa'
            and exists (
              select 1
              from public.mesa_partes_2026 expediente
              where expediente.id = memorandos_multiples.expediente_id
                and lower(trim(coalesce(expediente.area_destino, expediente.area, expediente.entregado_a, ''))) =
                    lower(trim(coalesce(perfil.area, '')))
            )
          )
        )
    )
  );

drop policy if exists memorandos_multiples_destinatarios_select_authenticated
  on public.memorandos_multiples_destinatarios;
create policy memorandos_multiples_destinatarios_select_authenticated
  on public.memorandos_multiples_destinatarios for select to authenticated
  using (
    exists (
      select 1
      from public.memorandos_multiples memo
      where memo.id = memorandos_multiples_destinatarios.memorando_id
    )
  );

revoke all on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb)
  from public, anon;
grant execute on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb)
  to authenticated;

commit;

notify pgrst, 'reload schema';
