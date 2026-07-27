-- CRM 4.2 보안 정책만 다시 적용할 때 사용하는 파일입니다.
-- 보통은 01_최초1회_Supabase_SQL.sql 하나만 실행하면 됩니다.

create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.crm_admins enable row level security;
insert into public.crm_admins(user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

create or replace function public.is_crm_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.crm_admins where user_id=auth.uid()); $$;
revoke all on function public.is_crm_admin() from public;
grant execute on function public.is_crm_admin() to authenticated;

alter table public.customers enable row level security;
DROP POLICY IF EXISTS "authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can read customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can insert customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can update customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can delete customers" ON public.customers;
create policy "crm admin can read customers" on public.customers for select to authenticated using (public.is_crm_admin());
create policy "crm admin can insert customers" on public.customers for insert to authenticated with check (public.is_crm_admin());
create policy "crm admin can update customers" on public.customers for update to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());
create policy "crm admin can delete customers" on public.customers for delete to authenticated using (public.is_crm_admin());
