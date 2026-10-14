-- Verletzung (injury): genau eine Zeile pro Person, siehe CONTEXT.md.
-- Gesundheitsdaten: Jede Person darf nur ihre eigene Zeile sehen und ändern.

create table public.injuries (
  -- Die Person; die Zeile wird mit dem Konto zusammen gelöscht.
  -- Als Primärschlüssel sorgt sie dafür, dass es je Person nur eine Verletzung gibt.
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,

  -- Grad laut Behandlungsschema: I, II, III, IVa, IVb
  grade text not null check (grade in ('I', 'II', 'III', 'IVa', 'IVb')),

  -- Starttag: Tag der Verletzung (Grad I bis IV a) bzw. Tag der OP (Grad IV b)
  start_date date not null,

  -- Ärztlich verordnete Dauer in Wochen; leer = längerer, vorsichtigerer Wert
  prescribed_duration_weeks smallint check (prescribed_duration_weeks between 1 and 52),

  -- Schutzart, nur bei Grad I: H-Tape oder thermoplastischer Ring; leer = Ring
  protection_type text check (protection_type in ('h_tape', 'ring')),

  -- Zeitpunkt, zu dem eine Kontraktur gemeldet wurde (nur Grad IV a); leer = keine
  contracture_reported_at timestamptz,

  -- Zeitpunkt der Bestätigung „ersetzt keine ärztliche Behandlung“
  disclaimer_confirmed_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint protection_type_only_grade_i check (protection_type is null or grade = 'I'),
  constraint contracture_only_grade_iva check (contracture_reported_at is null or grade = 'IVa')
);

comment on table public.injuries is 'Erfasste Ringbandverletzung, eine Zeile pro Person';

-- updated_at bei jeder Änderung automatisch setzen
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger injuries_set_updated_at
before update on public.injuries
for each row execute function public.set_updated_at();

-- Zugriff: „Automatically expose new tables“ ist aus, daher die Rechte ausdrücklich.
-- Nur eingeloggte Personen; Gäste (anon) bekommen keinen Zugriff.
grant select, insert, update, delete on public.injuries to authenticated;

-- Row Level Security: Jede Person liest und schreibt nur ihre eigene Zeile
alter table public.injuries enable row level security;

create policy "Eigene Verletzung lesen"
on public.injuries for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Eigene Verletzung anlegen"
on public.injuries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Eigene Verletzung ändern"
on public.injuries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Eigene Verletzung löschen"
on public.injuries for delete
to authenticated
using ((select auth.uid()) = user_id);
