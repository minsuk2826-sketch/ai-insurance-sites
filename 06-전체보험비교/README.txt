06-전체보험비교랜딩페이지

파일 구성
- index.html
- style.css
- script.js

배포 방법
1. GitHub의 ai-insurance-sites 저장소로 이동
2. Add file → Upload files
3. 이 폴더 전체를 업로드
4. Commit changes
5. Vercel에서 새 프로젝트를 만들거나 기존 ai-insurance-sites 프로젝트의 Root Directory를
   06-전체보험비교랜딩페이지 로 지정

실제 연결 전 수정할 곳
script.js 상단 CONFIG

KAKAO_URL
- 실제 카카오 오픈채팅 주소로 변경

SUBMIT_ENDPOINT
- 기존 CRM 또는 Supabase/Vercel API 주소로 변경
- 비워두면 접수 완료 화면만 확인되는 미리보기 모드

접수 경로값
- 전체보험사 비교견적 랜딩페이지
