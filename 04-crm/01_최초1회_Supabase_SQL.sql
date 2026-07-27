-- Supabase > SQL Editor에서 아래 내용을 한 번만 실행하세요.
-- 기존 고객 데이터는 삭제되지 않습니다.

alter table public.customers
add column if not exists contracts jsonb not null default '[]'::jsonb;

comment on column public.customers.contracts is
'고객별 복수 계약 정보: [{id, company, product, date, amount, status}]';

-- 고객 결제정보 및 신분증 확인정보 저장용
alter table public.customers
add column if not exists payment_identity_info jsonb not null default '{}'::jsonb;

comment on column public.customers.payment_identity_info is
'민감정보: payment_bank, payment_account, payment_day, card_number, card_expiry, identity_verified, driver_license, resident_issue_date. 카드 CVC와 주민등록번호는 저장 금지.';

-- 중요: 운영 전 customers 테이블에 Supabase Auth 기반 RLS 정책을 적용하여
-- 로그인한 허가 사용자만 조회·수정할 수 있도록 제한하세요.


-- 보유 보험 및 자동차보험 만기 관리 정보
alter table public.customers
add column if not exists insurance_info jsonb not null default '{"types":[]}'::jsonb;

comment on column public.customers.insurance_info is
'보유·관심 보험 및 자동차보험 정보: types, auto_company, vehicle_number, auto_expiry_date, auto_renewal_status';


-- CRM 4.1 고객 관계·생일·등급 정보
alter table public.customers
add column if not exists profile_info jsonb not null default '{"grade":"B"}'::jsonb;

comment on column public.customers.profile_info is
'고객 추가정보: birthday, grade, referrer_id, family_info';
