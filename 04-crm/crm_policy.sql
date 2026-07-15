-- CRM 관리자만 고객 정보를 조회/수정/삭제하도록 설정
alter table public.customers enable row level security;

drop policy if exists "authenticated users can read customers" on public.customers;
drop policy if exists "authenticated users can update customers" on public.customers;
drop policy if exists "authenticated users can delete customers" on public.customers;
drop policy if exists "authenticated users can insert customers" on public.customers;

create policy "authenticated users can read customers"
on public.customers for select
to authenticated
using (true);

create policy "authenticated users can update customers"
on public.customers for update
to authenticated
using (true)
with check (true);

create policy "authenticated users can delete customers"
on public.customers for delete
to authenticated
using (true);

create policy "authenticated users can insert customers"
on public.customers for insert
to authenticated
with check (true);
