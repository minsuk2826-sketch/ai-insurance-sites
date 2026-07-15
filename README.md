# AI보험 GitHub 통합관리

이 저장소는 아래 4개 사이트의 원본을 한곳에서 관리하기 위한 구조입니다.

- `01-ai보험점검`
- `02-리크루팅랜딩페이지1`
- `03-육아경단녀랜딩페이지`
- `04-crm`

## Netlify 연결 방식

각 Netlify 프로젝트에서 같은 GitHub 저장소를 연결하고, **Base directory**만 아래처럼 다르게 설정합니다.

| Netlify 프로젝트 | Base directory |
|---|---|
| AI보험점검 | `01-ai보험점검` |
| 리크루팅랜딩페이지1 | `02-리크루팅랜딩페이지1` |
| 육아경단녀 랜딩페이지 | `03-육아경단녀랜딩페이지` |
| CRM | `04-crm` |

Build command는 비워두고, Publish directory는 `.` 로 설정합니다.

## 앞으로 수정하는 방법

1. GitHub에서 수정할 사이트 폴더를 엽니다.
2. `index.html`을 수정합니다.
3. `Commit changes`를 누릅니다.
4. Netlify가 자동으로 새 버전을 배포합니다.

ZIP을 다시 만들거나 Netlify Drop으로 매번 업로드할 필요가 없습니다.

## 중요

- Supabase 공개키는 브라우저용 Publishable Key입니다.
- `service_role` 키는 절대 HTML에 넣지 마세요.
- 광고 집행 전 각 랜딩페이지에서 테스트 신청 1건을 넣어 CRM 유입경로를 확인하세요.
