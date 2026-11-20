begin;

alter table public.memos
  add column if not exists envia_copia boolean not null default true,
  add column if not exists destinatario_copia text;

create or replace function public.actualizar_memo_copia(
  p_memo_id bigint,
  p_envia_copia boolean,
  p_destinatario_copia text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $copia$
declare
  v_actor uuid := auth.uid();
  v_memo public.memos%rowtype;
begin
  if v_actor is null or not exists (
    select 1 from public.perfiles
    where id = v_actor and activo = true
  ) then
    raise exception 'Sesión no autenticada';
  end if;

  if p_envia_copia and nullif(trim(p_destinatario_copia), '') is null then
    raise exception 'El destinatario de copia es obligatorio';
  end if;

  update public.memos
  set
    envia_copia = p_envia_copia,
    destinatario_copia = case
      when p_envia_copia then nullif(trim(p_destinatario_copia), '')
      else null
    end
  where id = p_memo_id
  returning * into v_memo;

  if not found then
    raise exception 'Memo no encontrado';
  end if;

  return jsonb_build_object(
    'id', v_memo.id,
    'envia_copia', v_memo.envia_copia,
    'destinatario_copia', v_memo.destinatario_copia
  );
end;
$copia$;

revoke all on function public.actualizar_memo_copia(bigint, boolean, text)
  from public, anon;
grant execute on function public.actualizar_memo_copia(bigint, boolean, text)
  to authenticated;

commit;

notify pgrst, 'reload schema';
