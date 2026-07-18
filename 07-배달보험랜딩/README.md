# 07-배달보험랜딩

기존 `ai-insurance-sites` GitHub 저장소에 폴더째 추가하는 배달 보험 랜딩페이지입니다.

## GitHub 업로드
1. 이 ZIP의 압축을 풉니다.
2. GitHub 저장소 첫 화면에서 `Add file` → `Upload files`를 누릅니다.
3. `07-배달보험랜딩` 폴더를 통째로 끌어다 놓습니다.
4. 아래쪽 `Commit changes`를 누릅니다.

## Vercel 설정
새 Vercel 프로젝트의 Root Directory를 아래 폴더로 지정합니다.

07-배달보험랜딩

## 현재 연결
- 카카오 오픈채팅: https://open.kakao.com/o/sPtglPDi
- CRM 화면 주소: https://ai-insurance-crm.vercel.app/

## CRM 데이터 저장
CRM 화면 주소는 관리자 페이지 주소이므로 상담 데이터를 받는 API 주소와는 다를 수 있습니다.
현재 폼은 입력 검증과 접수 완료 화면까지 작동합니다.
실제 CRM 저장을 위해서는 기존 랜딩에서 사용하는 Supabase/API 설정을 `config.js`에 입력해야 합니다.
