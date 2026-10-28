# 인수인계 문서

세션이 끝날 때마다 **맨 위에** 새 항목을 추가합니다. 기존 기록은 지우지 않습니다.

---

## 2026-10-28 (제작 기록 공통화 + 권한 + 제작자 표시)

- DB(`db/ourfamilymeta_owner_common.sql`, Supabase에 이미 적용): series에 `owner`·`solo`·`common`, works에 `owner`. 담당자는 트리거가 로그인 이메일로 기록, 변경은 관리자만. 작품·연재물은 담당자/관리자만 수정·삭제, settings와 Storage 덮어쓰기·삭제는 관리자만. 연재물 없던 작품은 solo 연재물로 연결(재실행 안전).
- 공개 병합은 `common.js`의 `production(w, d)` 하나(미리보기와 상영관 공용). 공통 사용 기본, `useCommon === false`면 자체 정보만, solo는 연재물 공통이 곧 제작 기록. 중복 기준: 단계 이름+설명, 도구 이름, 프롬프트 문장, 출처 항목+출처.
- CMS: 3~6단계는 연재 회차에서 "공통 사용" 막대·추가분/공통 전환·이전 회차 불러오기(복사), 완성도는 합산 기준. 남의 항목은 읽기 전용. 저장 시 권한 거절과 동시 수정 구분 안내.
- 작품 `creator`(제작자 이름)를 "© 이름"으로 상영관·목록에 표시. 이메일은 공개 안 함.
- 확인: 병합·목록 단위 시험, DB 권한 19건(롤백 시험), 가짜 서버 CMS 시험. 못 한 것: 일반 편집자 실제 로그인, 실서버 저장. 2차(메이킹 개편, 사이트 설정/연재물 관리 화면)는 남음.

---

## 2026-10-28 (키 입력) Supabase 공개 키 연결 + 테이블 권한(GRANT) 부여

- 공개 키(`sb_publishable_…`)를 브라우저로 대시보드에서 읽어 `cms/index.html`의 `SB_KEY`, `common.js`·`deploy/common.js`의 `SB.key`에 넣고 push(66cb6cd). 공개용 키라 코드에 넣어도 되며, secret/service_role 키는 아님. Vercel 두 프로젝트 모두 새 키가 반영된 것 확인.
- 키를 넣고 읽어 보니 401(42501): 테이블에 anon/authenticated 권한(GRANT)이 없었음. RLS 정책만으로는 부족하고 GRANT도 필요함. SQL 편집기에서 우리 테이블 5개에만 부여: anon은 works·series·settings·assets 읽기, authenticated는 위 4개 읽기·쓰기와 editors 읽기·쓰기(행 단위는 RLS가 편집자·관리자만 허용). 이 GRANT는 마이그레이션 SQL 파일에 없으므로 DB를 새로 만들 때는 같이 실행해야 함.
- 확인: anon 읽기 works·series·settings 200(현재 비어 있음), anon의 editors 조회·works 쓰기는 거부(42501). 첫 관리자 good4056@gmail.com은 `ourfamilymeta_editors`에 admin으로 등록돼 있음.
- **못 한 것: 실제 가입·메일 인증·로그인, DB 저장, 파일 업로드, 편집자 추가.** 가입 확인 메일은 본인이 눌러야 함. 다음: CMS에서 가입 → 메일 링크 → 로그인 → 저장·업로드 시험.
- 공개 주소는 `ourfamily-metavc2610.vercel.app`(새 이름 `ourfamily-meta-vc2610` 도메인은 아직 없음, 404). 바꾸면 `cms/index.html`의 `PUBLIC_SITE`도 함께 바꿔야 함.

---

## 2026-10-28 (추가) 1단계를 "작품 올리기"로 개편: 종류 선택 + 연재물 결정 + 게임·스토리보드

- 연재물 여부는 1단계에서 정함. 맨 위에서 종류(영상/게임/스토리보드)와 "연재물인가요?"를 고르고, 목록에 "＋ 새 연재물 만들기…"를 고르면 그 자리에서 시리즈를 만들고 다음 회차 번호를 제안함. 12단계는 "연재물 정보 고치기"(소개·상태·대표 포스터)로 바뀜.
- 종류별 입력: 영상(mp4·자막·길이), 게임(주소·"상영관 안에서 실행" 체크·하는 방법), 스토리보드(장면 이미지 여러 장 + PDF). 포스터는 모든 종류에 공통. 조건부 표시는 입력 칸의 `show` 옵션, 선택 칸의 `rerender`/`onChange` 옵션으로 구현.
- 데이터: `works.kind`, `content.game`, `content.storyboard`. 공개 상영관(`watch.html`)이 종류별로 다르게 그림(게임은 새 창 링크 + 선택 시 iframe 삽입, 스토리보드는 갤러리 + PDF 링크). 목록 카드 글줄은 게임·스토리보드를 종류로 표시.
- 확인: 임시 사이트에서 게임·스토리보드 상영관 화면과 CMS 1단계의 종류별 칸 전환을 눈으로 확인. **못 한 것: 실제 게임 주소 삽입(iframe) 동작, PDF 링크, DB 저장·불러오기.** 게임 iframe은 사이트마다 삽입을 막는 곳이 있어서 안 되면 "상영관 안에서 실행"을 끄도록 안내해 둠.

---

## 2026-10-28 (이어서) CMS를 Supabase에 연결 (공개 키 입력 전까지는 옛 방식으로 동작)

### 한 일
- `cms/index.html`: 로그인·가입(이메일), 편집자 확인(`ourfamilymeta_editors`), 저장(바뀐 행만 PATCH, 새 행 POST, 삭제 DELETE), 파일 업로드(Storage `ourfamilymeta-media`, 50MB 제한), 편집자 관리(admin만, ⋯ 메뉴), 12단계 "연재물 만들기", 작품 단계에 연재물 선택·회차 번호 추가.
- 작품 한 편 = DB 한 줄(`ourfamilymeta_works`, `slug`=작품 주소, `content` jsonb=입력 전체). 사이트 문구 = `ourfamilymeta_settings` key `site`. 동시 수정은 `updated_at` 비교로 막고, 걸리면 "다른 사람이 먼저 고쳤어요"를 띄움.
- 새 작품 주소는 `work-` + 무작위 5자로 만들어 여러 명이 동시에 추가해도 겹치지 않음.
- 공개 페이지(`common.js`): DB에서 읽고, 키가 없거나 DB가 비어 있거나 읽기 실패하면 `content.json`으로 대체. 업로드 파일은 전체 URL을 그대로 씀(`mediaPath`).
- 연재물: 목록(홈 캐러셀·상영작)은 시리즈를 카드 하나로 묶어 "N화까지 공개 · 연재 중/완결" 표시, 상영관에는 회차 목록. `listing()`, `metaLine()`이 `common.js`에 있음.
- 마이그레이션 추가: `ourfamilymeta_slug_content`(works.slug, works.content).

### 키 입력이 남아 있음 (필수)
- 아래 두 곳의 `SB_KEY`(또는 `SB.key`)가 비어 있음. 공개용(anon/publishable) 키를 넣어야 DB 연동이 켜짐. 두 곳이 같은 값이어야 함.
  - `cms/index.html`의 `const SB_KEY = '';`
  - `common.js`의 `const SB = { url: ..., key: '' };` (넣은 뒤 `deploy/common.js`로도 복사)
- 키 위치: Supabase 대시보드 Project Settings → API Keys.

### 확인한 것 / 못 한 것
- 확인: 연재물 샘플 데이터로 상영작 목록(시리즈 묶음)과 상영관(회차 목록)이 맞게 나옴. CMS 화면이 열리고 12단계·연재물 입력·작품의 연재물 선택 칸이 나옴. JS 문법 검사 통과.
- **못 한 것: 로그인·DB 저장·업로드는 키가 없어 실제로 돌려 보지 못함.** 키를 넣은 뒤 가입 → admin이 편집자 등록 → 저장 → 업로드 순서로 시험할 것.
- 알려진 한계: 마지막 admin 삭제는 화면에서만 막음(DB 규칙 없음). 게임·스토리보드 종류는 아직 화면에 없음(DB `kind`만 준비됨). 같은 연재물 안에서 회차 번호를 서로 맞바꾸면 저장이 걸림(번호 중복 검사).
- `build-deploy.ps1`은 이번에 실행하지 않고 공개 파일 9개를 `deploy/`로 직접 복사함. 이 스크립트는 `common.js`의 Supabase 주소를 "외부 도메인 링크"로 경고할 수 있음(의도된 것).

---

## 2026-10-28 연재물 지원 + CMS 별도 배포

- Vercel 프로젝트 2개로 분리. 공개 사이트 `ourfamily-meta-vc2610`(Root `deploy`, 주소 ourfamily-metavc2610.vercel.app), CMS `ourfamily-meta-cms-vc2610`(Root `cms`, 주소 ourfamily-meta-cms-vc2610.vercel.app). GitHub 저장소는 1개. admin.html은 `cms/index.html`로 이동.
- CMS 미리보기는 공개 사이트 주소를 불러옴(`cms/index.html`의 `PUBLIC_SITE`). 공개 주소를 바꾸면 그 한 줄을 고칠 것.
- 연재물 지원(마이그레이션 `ourfamilymeta_series`): `ourfamilymeta_series` 테이블(제목·소개·포스터·status `ongoing`/`completed`)과 `ourfamilymeta_works.series_id`, `episode_no` 추가. 시리즈 소속이면 회차 번호 필수, 단독 작품은 둘 다 비움. 같은 시리즈 안 회차 번호 중복 불가. **총 편수는 저장하지 않음**(완결 시점을 모르기 때문). 사이트에는 "N화까지 공개"로 표시할 것.
- 다음: cms/index.html에 로그인, 시리즈·회차 등록, Supabase 저장·업로드 구현. Supabase 공개 키(`sb_publishable_…`)가 필요함.

---

## 2026-10-27 (저녁 추가) Supabase 테이블·버킷 생성 완료

### 편집자 방식 확정: A (관리자가 CMS에서 추가)
- 마이그레이션 `ourfamilymeta_admin_role` 적용. `ourfamilymeta_editors`를 **이메일 기준 + role(`admin`/`editor`)** 로 교체함(기존 테이블은 비어 있었음).
- 쓰기 권한 = "가입·이메일 인증을 마친 계정의 이메일이 편집자 목록에 있음". 인원 제한 없음. 함수 `ourfamilymeta_is_editor()`, `ourfamilymeta_is_admin()`.
- 편집자 목록의 추가·수정·삭제는 **admin만** 가능. 일반 editor는 자기 행만 읽기.
- 최초 관리자: `good4056@gmail.com` (이미 가입·인증된 계정).
- 사람 추가 흐름: 관리자가 admin 화면에 이메일 입력 → 목록에 등록 → 그 사람이 같은 이메일로 가입·인증하면 바로 편집 가능. 미리 등록해도 가입 전에는 권한 없음.
- 알려진 빈틈: 마지막 admin을 삭제하는 것을 막는 장치는 아직 없음. admin 화면에서 막을 것.
- admin.html에 만들 것: 로그인/가입 화면, 편집자 관리 탭(admin만 보임), 작품 CRUD, 파일 업로드.

### 한 일
- MCP 도구가 세션에 안 올라와서, 같은 토큰으로 Supabase 관리 API(`/v1/projects/{ref}/database/migrations`)를 직접 호출해 적용함. 사용자가 토큰 사용을 직접 허락함.
- 적용 전에 기존 테이블 확인: public 테이블 약 67개(식단 앱 `*_vc2608` 등), 버킷 10개. `ourfamilymeta_` 이름은 없었음.
- 마이그레이션 `ourfamilymeta_init` 적용 (원본 SQL은 스크래치패드 `ourfamilymeta_init.sql`, 내용은 아래 요약):
  - 테이블 4개, 모두 RLS 켬: `ourfamilymeta_editors`, `ourfamilymeta_works`, `ourfamilymeta_assets`, `ourfamilymeta_settings`
  - 함수 `ourfamilymeta_is_editor()`, `ourfamilymeta_touch_updated_at()`
  - 버킷 `ourfamilymeta-media` (공개 읽기, 파일당 50MB, 허용: mp4·vtt·jpg·png·webp·pdf)
  - 정책: 공개 항목은 누구나 읽기, 쓰기는 **편집자 목록에 있는 계정만**

### 계획 변경 (중요)
- 이 Supabase 프로젝트의 **Auth는 다른 앱과 공용**이다. 그래서 "로그인한 사람은 쓰기 가능"으로 하면 다른 앱 사용자도 우리 데이터를 고칠 수 있다.
- 그래서 `ourfamilymeta_editors` 허용 목록 방식으로 바꿈. 6명을 Auth에 만든 뒤 이 테이블에 넣어야 쓰기가 됨.
- 앞서 적은 **"자유 가입 끄기"는 하지 않는다.** 다른 앱의 회원가입이 막힘.

### 다음에 할 일 (갱신)
1. (사용자) 대시보드 Authentication → Users → Add user로 6명 계정 생성. 이메일 주소를 받으면 `insert into ourfamilymeta_editors select id, email from auth.users where email in (…)`로 등록.
2. admin.html 개편(로그인, DB 저장, 파일 업로드), common.js가 DB에서 읽도록 수정, content.json 데이터 이전.
3. 공개용 키(`anon` 또는 publishable) 확인 → 사이트 코드에 사용. 비밀 키(service_role)는 코드에 절대 넣지 않음.
4. Vercel 연결, 6명 실제 업로드 테스트.
5. 작업 후 Supabase 토큰 `claude` 폐기.

### 결정 사항 (사용자 확인 필요)
- 게임은 외부 링크, 스토리보드는 이미지+PDF, 영상은 50MB 제한으로 먼저 진행함. 바꾸려면 말해주세요. (영상 5분이 50MB를 넘으면 YouTube 링크 또는 용량 축소 필요)

---

## 2026-10-27

### 이번에 한 일
- GitHub 업로드 완료: https://github.com/Yoomnoom/ourfamily-meta_VC_2610 (브랜치 `main`, 22개 파일)
  - 저장소에 이미 `Initial commit`이 있어서 `pull --rebase` 후 push함. force push는 쓰지 않음.
  - [.gitignore](.gitignore) 신규 생성: `.env`, `.env.*`, `node_modules/`, `.claude/`
  - 비밀 값(API 키·비밀번호) 검색 결과 없음.
- Supabase MCP 재연결: 기존 설정의 토큰에 한글이 섞여 `ByteString` 오류가 났음. 새 토큰(30일 만료, 프로젝트 1개 한정)으로 다시 등록함. **VS Code 재시작 후 적용됨.**
- 문서 신규 작성: HANDOVER.md, CLAUDE.md, README.md, PRD.md

### 왜 이렇게 했는지 (의사결정)
- 요구사항: 공모전 심사위원이 보는 공개 사이트 + **6명이 온라인에서 업로드하는 CMS**. 업로드 종류는 영상·게임·스토리보드.
- 현재 admin.html은 `content.json` 내보내기 방식이라 동시 작업과 온라인 업로드가 안 됨. 그래서 **Supabase(DB + Auth + Storage)** 로 옮기기로 함. 구조는 [PRD.md](PRD.md) 참고.
- GitHub 저장소 1개, Vercel 프로젝트 1개, Supabase 프로젝트 1개. CMS를 별도로 배포하지 않고 같은 사이트의 `/admin.html`로 두되, 쓰기는 로그인(RLS)으로 막음.
- Supabase 프로젝트는 다른 앱(식단 관련 마이그레이션 `…_dietary_info`)과 공유함. 우리 것은 전부 **`ourfamilymeta_` 접두사**를 붙임. 기존 테이블은 건드리지 않음.

### 다음에 이어서 할 일
1. VS Code 재시작 후 Supabase MCP 연결 확인 (`list_tables`가 동작해야 함).
2. 기존 테이블 이름 확인 → `ourfamilymeta_works`, `ourfamilymeta_assets`, `ourfamilymeta_settings` 등 생성, RLS 적용(공개 읽기 / 로그인 6명 쓰기), Storage 버킷 `ourfamilymeta-media` 생성.
3. 대시보드에서 직접: 자유 가입 끄기(Authentication → Sign In / Providers), 6명 계정 초대(Authentication → Users). Auth Config 권한은 토큰에 주지 않았음.
4. admin.html 개편(로그인, DB 저장, 파일 업로드), common.js가 DB에서 읽도록 수정, `content.json` 데이터 이전.
5. `.\build-deploy.ps1` 실행 후 `deploy/` 커밋 → Vercel 연결(Root Directory `deploy`). 단, DB 방식으로 바뀌면 배포 방식을 다시 정함.
6. 작업 끝나면 Supabase 액세스 토큰 `claude` **폐기(Revoke)**.

### 미해결 이슈 / 사용자 결정 대기
- 게임 업로드 형태: 외부 링크(권장) / HTML5 파일 업로드 / 다운로드
- 스토리보드: 이미지 / PDF / 둘 다
- 영상 보관: Supabase는 **무료 플랜이라 파일당 50MB 제한**. 용량 축소 / 유료(Pro) / YouTube 링크 중 선택 필요
- 6명 이메일 주소(계정 초대용)
- 저장소 공개 여부: Public이면 admin.html·원본이 모두 공개됨. Private 권장.

### 실행·테스트 방법과 주의사항
- 로컬 실행: 프로젝트 폴더에서 `python -m http.server 8000` → http://localhost:8000 (파일을 더블클릭하면 `content.json`을 못 읽을 수 있음)
- Supabase 프로젝트: ref `pkucszwwnwpzvzqczmhh`, URL `https://pkucszwwnwpzvzqczmhh.supabase.co`, 서울 리전, Free 플랜
- **액세스 토큰(`sbp_…`)이 대화 중에 노출됨.** 문서·코드·커밋에 넣지 말 것. 작업 후 폐기.
- 이 문서 작성은 커밋·push하지 않았음. 필요하면 별도로 올릴 것.
