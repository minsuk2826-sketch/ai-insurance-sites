-- AI보험 CRM 4.2 통합 업데이트 SQL
-- Supabase > SQL Editor에서 전체를 한 번 실행하세요.
-- 기존 고객 데이터는 삭제되지 않습니다.

-- 1) 복수 계약
alter table public.customers
add column if not exists contracts jsonb not null default '[]'::jsonb;

comment on column public.customers.contracts is
'고객별 복수 계약 정보: [{id, company, product, date, amount, status}]';

-- 2) 결제정보 및 신분증 확인정보
alter table public.customers
add column if not exists payment_identity_info jsonb not null default '{}'::jsonb;

comment on column public.customers.payment_identity_info is
'민감정보: payment_bank, payment_account, payment_day, card_number, card_expiry, identity_verified, driver_license, resident_issue_date. 카드 CVC와 주민등록번호는 저장 금지.';

-- 3) 보유 보험 및 자동차보험 만기
alter table public.customers
add column if not exists insurance_info jsonb not null default '{"types":[]}'::jsonb;

comment on column public.customers.insurance_info is
'보유·관심 보험 및 자동차보험 정보: types, auto_company, vehicle_number, auto_expiry_date, auto_renewal_status';

-- 4) 소개고객·생일·가족·고객등급
alter table public.customers
add column if not exists profile_info jsonb not null default '{"grade":"B"}'::jsonb;

comment on column public.customers.profile_info is
'고객 추가정보: birthday, grade, referrer_id, family_info';

-- DB 출처는 기존 customers.source 컬럼을 사용합니다.
-- 오늘 전화와 캘린더는 follow_up_date, birthday, contracts, auto_expiry_date를 자동 계산합니다.
-- 보험증권 파일 업로드 기능은 포함하지 않습니다.

-- 5) CRM 관리자 계정 자동 등록
-- 현재 Supabase Auth에서 가장 먼저 생성된 계정 1개를 CRM 관리자 계정으로 지정합니다.
create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.crm_admins enable row level security;

insert into public.crm_admins(user_id)
select id from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;

-- RLS 정책에서 안전하게 관리자 여부를 확인하는 함수
create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_crm_admin() from public;
grant execute on function public.is_crm_admin() to authenticated;

-- 6) customers RLS: 관리자 계정만 접근 가능
alter table public.customers enable row level security;

-- 과거 정책과 4.2 정책을 모두 정리
DROP POLICY IF EXISTS "authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can read customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can insert customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can update customers" ON public.customers;
DROP POLICY IF EXISTS "crm admin can delete customers" ON public.customers;

create policy "crm admin can read customers"
on public.customers for select
to authenticated
using (public.is_crm_admin());

create policy "crm admin can insert customers"
on public.customers for insert
to authenticated
with check (public.is_crm_admin());

create policy "crm admin can update customers"
on public.customers for update
to authenticated
using (public.is_crm_admin())
with check (public.is_crm_admin());

create policy "crm admin can delete customers"
on public.customers for delete
to authenticated
using (public.is_crm_admin());

-- 관리자 목록은 일반 로그인 사용자가 조회하지 못하도록 별도 공개 정책을 만들지 않습니다.
-- SQL 실행 후 기존 CRM 로그인 계정으로 정상 접속되는지 확인하세요.
