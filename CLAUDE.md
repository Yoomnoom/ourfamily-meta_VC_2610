# CLAUDE.md

작업을 시작하기 전에 [HANDOVER.md](HANDOVER.md)를 가장 먼저 읽으세요.

## 프로젝트
공모전 발표용 "가족 영상" 사이트. 심사위원이 보는 공개 사이트와, 6명이 올리는 CMS(admin)로 이루어짐. 빌드 도구 없는 순수 HTML/CSS/JS 정적 사이트.

## 파일 구조
| 파일 | 역할 |
|---|---|
| index.html | 홈 (히어로·카로셀·주제·앨범 미리보기·메이킹 하이라이트) |
| works.html | 상영작 전체 포스터 그리드 |
| watch.html | 상영관 (`watch.html?id=작품ID`) |
| making.html | 메이킹 (창작 과정·AI 도구·선언문) |
| album.html | 가족 앨범 |
| about.html | 소개 (제작자·기획 의도·출처 표·공모전 안내) |
| cms/index.html | CMS (현재: `content.json` 편집·내보내기 방식. DB 방식으로 개편 예정) |
| common.js | 공개 페이지 공통 스크립트 |
| theme.css | 공개 페이지 스타일 (Pretendard `@font-face` 포함) |
| content.json | 문구·작품 데이터 (현재 데이터 원본) |
| build-deploy.ps1 | 공개용 파일만 `deploy/`로 복사하고 점검 |
| media/ | 영상·포스터·사진·글꼴. 자세한 규칙은 media/README.txt |
| sample_files/ | 기획 시 참고 이미지 (배포 안 함) |

## 실행
- `python -m http.server 8000` 후 http://localhost:8000
- 배포용 폴더: `powershell -ExecutionPolicy Bypass -File .\build-deploy.ps1`

## 인프라
- GitHub: https://github.com/Yoomnoom/ourfamily-meta_VC_2610 (`main`)
- Vercel: 아직 미연결
- Supabase: ref `pkucszwwnwpzvzqczmhh` (다른 앱과 공유). **우리 테이블·버킷은 반드시 `ourfamilymeta_` 접두사**. 기존 테이블은 수정하지 않는다.
- 만든 것: 테이블 `ourfamilymeta_editors/works/assets/settings`, 버킷 `ourfamilymeta-media`, 함수 `ourfamilymeta_is_editor()`. 쓰기 권한은 `ourfamilymeta_editors`(이메일 + role `admin`/`editor`)에 등록되고 이메일 인증을 마친 계정만. 편집자 추가·삭제는 admin만. (Auth가 다른 앱과 공용이라 "로그인만 하면 쓰기"로 하지 않는다. 가입 설정도 건드리지 않는다.)
- 비밀 값(`.env`, 토큰, service role 키)은 코드·문서·커밋에 넣지 않는다.

## 규칙
- 폰트는 **Pretendard만** 사용한다. Gaegu·Google Fonts 금지, 외부 요청 0건.
- UI: 중복 요소 금지, 온점 뒤 줄바꿈, 대체 카드에 글자 넣지 않기, 히어로 CTA는 2개 유지.
- force push 금지. `.env`·키가 들어간 커밋 금지.
- 작업을 시작·마무리할 때 HANDOVER.md를 읽고 갱신한다.
