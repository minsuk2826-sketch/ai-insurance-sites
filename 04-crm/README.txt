AI보험 CRM 3.3 - GitHub 바로 업로드용

적용 기능
- 고객별 복수 계약
- 계약 완료 고객 전용 계약관리
- 계약별 30일·90일·1년 알림
- 고객 결제정보 및 신분증 확인정보
- 보유·관심 보험 체크
- 자동차보험 보험사·차량번호·만기일·갱신상태
- 자동차보험 만기 30일·15일·7일 전 및 당일 알림
- 계약관리 > 자동차보험 갱신 예정 탭

GitHub 업로드
1. GitHub 저장소 ai-insurance-sites를 엽니다.
2. 04-crm 폴더로 들어갑니다.
3. 이 폴더의 파일을 모두 업로드하여 기존 파일을 교체합니다.
4. Commit changes를 누릅니다.
5. Vercel 자동 배포 후 CRM 주소에서 Ctrl+Shift+R을 누릅니다.

Supabase 최초 1회 작업
- 01_최초1회_Supabase_SQL.sql 내용을 Supabase SQL Editor에서 실행합니다.
- 이미 일부 컬럼이 있어도 add column if not exists 방식이라 기존 데이터는 삭제되지 않습니다.

보안 주의
- 카드 CVC와 주민등록번호는 저장하지 않습니다.
- 결제계좌번호·카드번호·운전면허번호는 민감정보이므로 Supabase Auth와 RLS를 반드시 유지하세요.
