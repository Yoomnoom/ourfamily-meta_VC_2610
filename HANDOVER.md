# 인수인계 문서

세션이 끝날 때마다 **맨 위에** 새 항목을 추가합니다. 기존 기록은 지우지 않습니다.

---

## 2026-11-03 (게임 iframe 권한)

- **홈 대표 화면 세로 화면 처리**: 가로 영상·사진은 세로 화면(휴대폰)에서도 자르지 않고 통째로 보여 준다(`object-fit:contain`). 세로용 파일(`videoPortrait`/`imagePortrait`/목록의 `portrait`)은 **올렸을 때만** 세로 화면에서 대신 쓰고, 그때는 꽉 채운다(`.fill`, cover).
- **커서 이모지 지연 제거**: `cursorFx` 가 마우스를 40%씩 따라가던(지연) 방식을 마우스 위치에 바로 붙이는 방식으로 바꾸고, 기울기만 부드럽게 둔다. `.fx-cursor`/`.fx-c-in` 에 `will-change:transform`.
- **세로 영상 크기**: 세로 영상 틀은 화면 높이의 70% 안(`.screen-frame.portrait:has(video)`, 앱·게임 세로 틀은 82%). 줄이거나 키우려면 이 70 을 바꾼다.
- **게임·앱 틀 반응형**: "앱용(세로형)"을 체크하지 않은 게임·앱 틀(`.game-frame:not(.portrait)`)은 창이 세로 모양(`max-aspect-ratio:1/1`)이면 폭 꽉 채우고 높이 `min(82svh,1000px)`(최소 480px)로 키워 안의 게임이 모바일 화면으로 바뀌게 한다(가로 창은 16:9). 체크한 것은 항상 9:16 고정. 460×730→409×599, 390×844→339×692, 1100×700→1049×590 으로 확인.
- **공유 미리보기 제목**: 카카오톡 등 수집기는 JS 를 실행하지 않아 HTML 에 적힌 `<title>`·`og:` 를 그대로 읽는다. 정적 제목이 "가상의 가족 극장"이라 미리보기가 틀렸음 → 모든 페이지·JS 기본값·CMS 제목을 "우리 가족 극장"으로 통일, `index.html` 에 `og:title/description/site_name/type` 추가. `og:image` 는 아직 없음(고정 이미지 파일이 없어 보류). 카톡은 이전 미리보기를 캐시하므로 카카오 디버거에서 다시 수집해야 바뀐다.
- **세로 영상**: CMS 영상 작품에 "세로 영상 (세로형 9:16 화면으로 보여주기)" 체크(`video.portrait`). 상영관은 `.screen-frame.portrait`(영상 9:16, 화면 높이 82% 안)로 보여 주고, 체크를 안 했어도 영상이 실제로 세로(`videoHeight>videoWidth`)면 재생 정보를 읽는 순간 자동으로 세로 틀로 바뀐다. "고은쌤 수정(임시등록)"(1080×1920)로 확인.
- **커서 가족 꾸러미·동작**: 메인 아이콘 옆에 작은 가족(👨👩👧, `CURSOR_FAMILY`)이 바짝 따라다닌다(따라가는 빠르기 .6/.5/.42, 400px 튀어도 약 4프레임에 붙음, 멈추면 제자리, 둥실 흔들림, 누르면 빠르게). 숨김 조건(`gone`·`on`)은 메인 아이콘과 같이 움직인다(`both()`). 눌릴 만한 곳에 올리거나 누르면 모양이 바뀐다(`CURSOR_ACTIVE`: 📕→📖 책이 펼쳐짐, 📷→📸, 🥄→🍚, 🥢→🍜, 🏠→🏡, 🐕→🐶, 🍿→🎬). 지영의 일생 기본 아이콘을 📖에서 덮인 책 📕으로 바꿈. CMS 에서 직접 고른 이모지·그림은 바뀌는 모양이 없고 커졌다 작아지기만 한다.
- **영상 둘레 일반 마우스**: 커서 이모지는 게임뿐 아니라 `.screen-frame`(상영관의 영상·스토리보드·게임·앱)과 사진 확대 창의 영상(`video.lb-img`) 둘레 80px 안에서도 숨기고 일반 마우스로 돌린다. 홈 대표 화면(배경 영상)은 제외.
- **영상 끝 화면 이미지**: CMS 영상 작품의 "끝 화면 이미지(선택)"(`video.endCover`). `common.js buildVideo`가 영상 `ended` 때 영상 위에 이미지를 보여 주고 `play`·`seeking` 때 숨긴다(`.end-cover`, 아래 48px 은 재생 막대용으로 비움, contain). 예: "다음 화에서 계속됩니다." 이미지. 전체화면에서는 영상 요소만 확대되어 보이지 않는다.
- **자막이 안 나오던 원인**: 영상·자막이 다른 도메인(Supabase)이라 `<video>`에 `crossorigin` 이 없으면 브라우저가 자막(.vtt)을 막는다(track readyState 3=error, cue 0). `buildVideo`가 자막이 있을 때 `crossorigin="anonymous"` 를 붙인다(Supabase 가 영상·자막 모두 ACAO:* 응답, 라이브에서 확인).
- **자막 .srt 자동 변환**: CMS 업로드(`placeFile` → `srtToVtt`)가 `.srt`를 받으면 UTF-8 아니면 EUC-KR 로 읽어 `.vtt`(WEBVTT 머리말, 시간 쉼표→점)로 바꿔 올린다. 브라우저 `<track>`은 .vtt 만 읽기 때문. .ass·.smi 등은 미지원.
- **비율 기준 정리**: 포스터는 세로 2:3, 기본 규격 1500×2168(CMS 안내·media/README 수정). 가로 표지는 16:9 1920×1080. 회차 썸네일(16:9 칸)에 가로 표지가 없어 포스터를 쓰면 자르지 않고 통째로(`.ep-thumb.tall`, contain).
- 홈 대표 화면에 **휴대폰용 세로 버전**: `hero.videoPortrait`/`hero.imagePortrait`, `hero.more[].portrait`. 세로 화면(`max-aspect-ratio:1/1`)에서 있으면 대신 쓴다. 없으면 가로 영상을 자르지 않고 통째로 보여줌(`contain`). 390×844 폰 점검: 가로 넘침 없음, 작은 터치 대상(캐러셀 점 28px, 관람하기 링크 31px 높이, 푸터 메일 20px) 남아 있음, 찰칵 게임은 CMS에서 "앱용(세로형)"을 켜지 않으면 16:9로 작게 보임.
- **방문 집계 2차**(`db/ourfamilymeta_pageviews_v2.sql`, 2026-11-03 Supabase에 실행 완료): 기록에 체류 시간·재방문(방문자 번호)·세션·기기·브라우저·OS·언어·시간대·유입 경로·국가·도시 추가. `common.js track()`이 열 때 `view`, 떠날 때 `leave`(화면에 보인 초)를 `/api/track`으로 보내고, **`api/track.js`(Vercel Function, 배포 시 `deploy/api/`로 복사)** 가 Vercel 의 `x-vercel-ip-country/city` 헤더를 붙여 Supabase에 넣는다(IP 저장 안 함, 비밀 키 없음). 함수가 없으면 Supabase에 직접(최소 칸만). CMS "방문 집계"는 `ourfamilymeta_pageview_report()`(jsonb)로 요약 카드·14일 추이·페이지별·시간대·기기·브라우저·OS·국가·도시·유입·언어를 보여 준다. 이전 `ourfamilymeta_pageview_stats()`는 삭제됨.
- 마우스 모양은 게임·앱 화면(`.game-frame`)과 그 둘레 80px 안에서는 숨기고 원래 포인터로 돌려 놓는다(게임 조작 방해 방지, `cursorFx`의 `near`).
- **방문 집계**: 공개 페이지가 열릴 때 `ourfamilymeta_pageviews`에 1건 기록(`common.js track()`: 페이지명·작품ID·임의 방문자번호, 같은 탭 새로고침은 1회, localhost·CMS 미리보기 제외). CMS 메뉴 "방문 집계"가 `ourfamilymeta_pageview_stats()`(편집자만)로 페이지별 전체·방문자·오늘·7일을 보여 준다. `db/ourfamilymeta_pageviews.sql`은 **2026-11-03 Supabase에 실행 완료**(처음엔 insert 권한(grant)이 빠져 있어 추가함)(그 전에는 기록이 조용히 실패하고 CMS에 안내 문구가 나온다).
- 마우스 모양 자동 낱말을 실제 제목에 맞게 고침: 제목의 공백은 무시하고 비교(`잘 먹었습니다!`), `식당`(우리집식당) 추가, 지영의 일생은 📖. 작품 제목이 바뀌면 `CURSOR_WORDS`(common.js)나 CMS의 마우스 모양 칸을 같이 확인.
- 게임 iframe 안에는 사이트 마우스 모양이 못 들어간다(별도 문서라 마우스 이벤트가 안 옴). 상영관이 게임 로드 후 `postMessage({type:"ft-cursor", text, img})`를 보내므로, 게임이 받아서 직접 그리면 같은 모양이 된다. 받지 않는 게임(남의 게임)은 자기 마우스 모양을 쓴다.
- 홈 대표 화면 = **사진·영상 재생 목록**: 처음 것(`hero.mode`가 image면 `hero.image`, 아니면 `hero.video`) + `hero.more`(사진/영상 섞어서). 영상은 끝까지, 사진은 `hero.photoSeconds`초(기본 5, 2~60) 보여 준 뒤 다음으로, 마지막 다음엔 처음으로. 하나뿐이면 사진은 계속, 영상은 반복.
- 로딩 화면에 **심볼 + 진행 막대** 추가(`#loader .ld-bar`). 실제 진행률은 알 수 없어 90%쪽으로 차오르다 다 불러오면 100%. 최소 0.7초 노출. 죽은 코드가 된 `reduced` 플래그 삭제.
- **주제별 마우스 모양**(`cursorFx`/`cursorSpec`): 빛·고리·반짝임은 없앰. 마우스 포인터 대신 이모지(또는 그림)가 따라다니며 움직이는 방향으로 흔들리고, 링크 위에서 커지고, 클릭하면 작은 조각이 튄다. 홈·일반 페이지는 사이트 설정 `site.cursor`(비우면 🍿), 상영관은 작품 `cursor`/`cursorImage`, 비어 있으면 제목 낱말로 자동(지영🍠 찰칵📷 보은🐕 풍산🐗 잘먹🥄 마음🏠 식탁🥢). 게임 iframe 위에서는 숨김, 터치 기기·CMS 미리보기에서는 끔.
- 공모전 발표용: **움직임 줄이기 설정을 더 이상 따르지 않음**(`common.js reduced=false`, `theme.css` 해당 미디어쿼리 제거). 등장·호버·전환·로딩 연출이 항상 나온다.
- **불러오는 상태 안내**(`mediaStatus`, `frameStatus`): 홈 대표 영상·상영관 영상은 1.2초 넘게 안 열리면 "불러오는 중(%)", 끊기면 원인별 오류 문구, 자동 재생이 막히면 "화면을 한 번 누르면 재생". 게임·앱 화면은 1.5초 후 안내, 15초 후 "새 창에서 열기" 안내.
- **마우스 꾸밈**(`cursorFx`): 빛 번짐·금색 고리(링크 위에서 커짐)·반짝임 꼬리·클릭 폭죽. **꾸민 말풍선**(`tooltips`): 기본 title 대신 금빛 말풍선. 마우스를 쓰는 기기에서만, 관리 페이지 미리보기 안에서는 끔.
- **공모전 발표용 원칙**: 심사위원 기기 설정(움직임 줄이기·데이터 절약·모바일 폭 등)에 따라 화면이 달라지지 않게 한다. 홈 대표 영상은 이 설정과 무관하게 항상 재생(소리 없음). 아직 설정을 따르는 곳: 스크롤 등장·호버·페이지 전환·로딩 화면의 움직임(`common.js reduced`, `theme.css @media prefers-reduced-motion`) — 내용은 숨기지 않고 효과만 줄어든다.
- 홈 첫 화면 영상: 휴대폰에서도 재생(사진 대체는 움직임 줄이기·데이터 절약일 때만). `hero.more`(영상 목록)로 여러 개를 이어서 재생, 마지막 다음엔 처음으로. 하나만 있으면 기존처럼 반복.
- 비하인드 컷(앨범)에 **영상(mp4)** 도 올릴 수 있다. CMS 파일 칸 종류 `media`(사진·영상), 공개 `gallery()`는 확장자(`isVideo`)로 구분해 칸에는 영상 첫 장면+▶, 확대 창에는 재생 컨트롤을 보여 주고 닫으면 멈춘다. 파일당 50MB 제한은 그대로.
- 작품 종류에 **앱** 추가(영상·게임·앱·스토리보드). 앱 필드는 `w.app`(url·embed·portrait·howto). **DB `works.kind` 칸에는 앱도 `game`으로 저장**하고 `content.kind`가 `app`이면 읽을 때 앱으로 되살린다(칸에 제약이 있을 수 있어 마이그레이션을 피함).
- 게임·앱에 **앱용(세로형)** 체크(`portrait`): 상영관 화면을 9:16 비율, 화면 높이 82% 안으로 보여준다(`.screen-frame.portrait`, `.game-frame.portrait`). 앱은 기본 켬, 게임은 기본 끔.
- 상영관에 넣은 게임 iframe의 `sandbox`에 `allow-modals`, `allow-downloads` 추가. 없으면 앨범의 선택 삭제(확인창)와 선택 다운로드가 막힌다. 게임 단독 주소에서는 원래 되고 사이트 안에서만 안 됐다.

## 2026-11-02 (사이트 로고 이미지)

- CMS "사이트 이름·슬로건·연락처" → "로고 이미지"(`site.logoImage`)를 올리면 모든 페이지 맨 위(헤더)·맨 아래(푸터)·브라우저 탭 아이콘·로딩 화면에 자동 적용. 없거나 불러오기 실패하면 기존 글자 로고(`logoText`)로 대체. `common.js`의 `logoMark()`, `setFavicon()`.
- (수정) 연재물의 로고는 회차가 아니라 연재물에 하나: CMS "연재물 정보 고치기"의 "대표 로고"(DB `series.common.logo`, 마이그레이션 없음). 연재 회차의 1단계에는 로고 칸을 숨김, 단독 작품만 1단계에 보임. 이전에 3화에 올린 `video.logo` 값은 DB에 남아 있음(연재물에 다시 올릴 것).
- 로고 위치·크기 슬라이더: `logoX`(가로 %, 기본 50)·`logoY`(세로 %, 기본 85)·`logoW`(폭 %, 기본 80). 비우면 기본값. 연재물은 `series.common`, 단독 작품은 `video`에 저장. `poster()`가 적용. 빛 번짐(glow)은 뺌 — 로고 파일 자체에서 처리하기로 함.
- 상영관 표지 위 로고: 회차 1단계 "표지 위에 로고 얹기"(`video.coverLogo`)를 켜면 연재물 로고(`series.common.logo`, 단독 작품은 `video.logo`)를 영상 틀 위에 얹음. 위치·크기는 `coverLogoX/Y/W`(기본 50/50/40%). 영상이 재생되면 사라짐(`watch.html`, `.cover-logo`).
- 상영관 게임: "상영관 안에서 실행"이 켜져 있으면 '새 창에서 열기' 버튼을 화면 안이 아니라 **제목 바로 옆**에 둠(`watch.html`의 `openLink`, `.title-row`). 꺼져 있으면 '게임 하러 가기' 버튼 유지.
- 게임 저장소(별도 `click-our-family_VC_26.07`, `dist/index.html`): 앨범에 선택 다운로드(PNG)·선택 삭제·모두 지우기 추가. 브라우저에서 선택·다운로드 파일 생성·삭제·초기화 확인함. 다운로드 PNG의 그림이 화면과 똑같은지는 눈으로 못 봄.
- 작품별 로고: CMS 1단계 "작품 로고"(`video.logo`)를 올리면 포스터 아래쪽 가운데에 얹힘(`poster()`의 `.poster-logo`). 글자 제목은 그대로 유지. 연재물 카드는 첫 회의 로고를 씀. DB 변경 없음(content jsonb).
- 확인: JS 문법 검사만. **못 한 것: 실제 업로드·화면 확인.** `deploy/common.js`·`deploy/theme.css`에는 복사함. 커밋·push는 하지 않음.

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

- CMS 단계 순서: "연재물 정보 고치기"를 12단계에서 7단계(작품 6단계 바로 뒤, 사이트 공통 앞)로 옮김. 연재물을 고른 작품에서만 보이고 단독 작품에서는 단계 목록에서 빠진다(그래서 단독 작품은 사이트 공통이 7단계부터). cms/index.html 의 ALL_STEPS·syncSteps.

- CMS: 필수 항목(req 표시된 칸)이 비어 있으면 왼쪽 단계 목록 줄 끝에 빨간 "필수" 표시, 작품 선택 목록에 "필수 n" 개수 표시(stepReqLeft·reqLeft). 저장을 막지는 않는다.

- 방문 집계 3차: db/ourfamilymeta_pageviews_v3.sql(영상 이벤트 play/progress/end/watch + ourfamilymeta_pageview_report_v3). 사용자가 SQL Editor 에서 한 번 실행해야 켜진다. 실행 전에는 CMS가 2차 보고서로 대체 표시. 영상 이벤트는 common.js buildVideo(vSend)·api/track.js. 노션 정리는 CMS 방문 집계를 연 상태에서 Claude가 읽어 옮긴다.

- 주간 자동 보고: db/ourfamilymeta_weekly_summary.sql(비밀문구 표 + ourfamilymeta_weekly_summary) · api/weekly.js(Vercel Cron 매주 월 09:00 KST, vercel.json) → Notion "주별 기록"에 새 줄. 환경변수 CRON_SECRET, WEEKLY_SECRET, NOTION_TOKEN, NOTION_DATABASE_ID 필요(값은 코드에 넣지 않는다). SQL 실행·환경변수 등록 전에는 동작하지 않는다. **주기(2026-11-05 변경)**: 크론은 매일 09:00 KST. 2026-12-31 분까지는 매일 어제 하루 줄(제목 "날짜 (요일)"), 2027-01-01부터는 월요일에만 지난 한 주 줄(첫 줄은 1/1~1/3). 하루/한 주 구분은 api/weekly.js 상단 DAILY_UNTIL·WEEKLY_FROM. SQL 함수는 인자 3개(secret, 시작, 끝). 시험: `?week=시작&end=끝`. **2026-11-05 활성화 완료**: Notion 연결 "방문집계"(콘텐츠 읽기·삽입·업데이트만)를 보고서 페이지에 추가, Vercel 공개 프로젝트 환경변수 4개 등록·재배포, `/api/weekly?week=2026-10-26` 시험 실행 성공(중복 실행은 skipped, 인증 없으면 401). 환경변수 값은 로컬 `.env`(깃 제외)에만 있다.
- 홈 주제 카드(연결·발견·즐거움): index.html `TOPIC_GO` 순서대로 [상영작, 비하인드 컷(album.html), 메이킹] 페이지로 이동하는 카드(전체 클릭 + 화살표). (2026-11-05 수정: 발견 카드는 앨범으로 연결. 이전에 게임 카드로 가정했던 것은 사용자가 정정함.) 카드 글은 CMS(DB) 값이 우선이라 content.json 값은 대체용.
- 사이트 전체 뒷배경: CMS "홈 첫 화면"의 **사진**(hero.image)을 모든 공개 페이지 뒤에 고정 배경으로 깐다(common.js `siteBg`, theme.css `.site-bg`, 위에 어두운 막 72~90%). 사진이 비어 있거나 못 불러오면 기본 배경 그대로. CMS에서 사진을 바꾸면 전 페이지가 같이 바뀐다. 첫 화면 "영상"과는 별개다.
- 메뉴 이동 속도(2026-11-05): 로딩 화면(로고+막대)은 **탭을 연 뒤 첫 페이지에서만** 보인다(sessionStorage `ft.seen`). 페이지 전환 때 사라지는/나타나는 효과(.leaving, pagein)는 제거. 직전에 읽은 내용을 sessionStorage `ft.data`에 두고 즉시 그린 뒤, 뒤에서 최신 내용을 받아 달라졌을 때만 다시 그린다(common.js `load`). 다시 그려도 방문 기록(track)은 한 번만(`tracked`). 처음 오는 심사위원은 예전처럼 로딩 화면을 한 번 본다.
- 가로로 이어지는 목록(상영관 "다른 작품 보기"·연재 회차)은 스크롤바 없이 좌우 화살표로 넘긴다: common.js `rail(list)` + theme.css `.rail`·`.rail-btn`(화살표는 목록 양옆 빈 칸에 두어 포스터와 겹치지 않음, 끝에 닿으면 그쪽 화살표만 보이지 않게 하고 자리는 유지, 휴대폰 폭에서는 화살표 없이 스와이프). 새 가로 목록을 만들면 `App.rail`로 감싸 통일한다.
