do $$
begin
  if to_regclass('public.memorandos_multiples') is null then
    raise exception 'Falta ejecutar 20261110_memorandos_multiples.sql: no existe public.memorandos_multiples';
  end if;

  if to_regclass('public.memorandos_multiples_destinatarios') is null then
    raise exception 'Falta ejecutar 20261110_memorandos_multiples.sql: no existe public.memorandos_multiples_destinatarios';
  end if;
end
$$;

notify pgrst, 'reload schema';
