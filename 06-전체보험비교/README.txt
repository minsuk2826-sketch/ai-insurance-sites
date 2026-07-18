최종 긴급 수정본

수정 내용
- 카카오 오픈채팅 주소를 HTML에 직접 연결
- Supabase SDK 의존성 제거
- 기존에 실제 작동했던 REST API 방식으로 CRM 저장
- CRM 유입경로: 전체보험사 비교견적
- 접수 성공 후 완료 팝업 표시

적용 방법
GitHub의 06-전체보험비교 폴더에 아래 파일을 덮어쓰세요.

1. index.html
2. script.js
3. style.css
4. landing-main.jpg

Commit 후 Vercel 배포가 완료되면 아래 주소로 테스트하세요.
https://ai-insurance-compare.vercel.app/?v=999

테스트 방법
- 이름: 테스트
- 연락처: 본인 번호
- 상담시간 선택
- 개인정보 동의
- 무료 상담 신청하기 클릭
- CRM에서 유입경로 '전체보험사 비교견적' 확인
