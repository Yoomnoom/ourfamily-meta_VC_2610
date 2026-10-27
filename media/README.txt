media/ 폴더 안내
=================

이 폴더에 영상·포스터·사진을 넣고, admin.html 에서 "파일명"만 입력합니다.
파일명은 영문·숫자·하이픈(-) 권장 (공백·특수문자는 피하세요). 대소문자까지 정확히 같아야 합니다.

[넣을 파일]
- 영상:   mp4 (5분 이내)                 예) work-1.mp4
- 히어로: 루프 mp4 (소리 없음) + 대체 이미지   예) hero-loop.mp4, hero-poster.jpg
- 포스터: jpg 또는 png, 세로 2:3 권장    예) work-1-poster.jpg  (예: 800x1200)
          홈 카로셀 카드와 상영관 영상 썸네일로 함께 쓰입니다.
- 자막:   WebVTT (.vtt, 선택)            예) work-1.vtt
- 사진:   가족 사진·제작 과정 갤러리용    예) gallery-1.jpg  (가로 1600px 이하 권장, 용량은 500KB~1MB 정도로)
- 글꼴:   fonts/ 폴더 (Pretendard woff2 3종 + 라이선스). 지우지 마세요.

[권장 인코딩 설정]
- 영상 코덱: H.264 (libx264)
- 해상도:    1080p 이하
- 비트레이트: 약 3~4 Mbps
- 오디오:    AAC 128 kbps
- faststart: 켜기 (다운로드가 끝나기 전에도 재생 시작)

[ffmpeg 명령 예시]
ffmpeg -i input.mp4 -c:v libx264 -crf 24 -preset slow -vf scale=-2:1080 -c:a aac -b:a 128k -movflags +faststart output.mp4

[포스터 한 장 뽑기 예시]
ffmpeg -i output.mp4 -ss 00:00:05 -frames:v 1 poster.jpg

[파일이 없을 때]
- 영상 파일이 없거나 재생에 실패하면, 상영관에 "영상을 불러오지 못했습니다" 안내와 다운로드 링크가 대신 표시됩니다.
- 포스터·사진 파일이 없으면 아이콘만 있는 기본 카드가 대신 표시됩니다. (제목·캡션은 카드 아래에 따로 나옵니다)

[글꼴]
- 제목·본문 모두 Pretendard 를 사용합니다. media/fonts/ 의 파일을 @font-face 로 직접 불러옵니다.
    저작권 Copyright (c) 2021 Kil Hyung-jin (https://github.com/orioncactus/pretendard)
    라이선스 SIL Open Font License 1.1 – 상업적 이용·재배포 가능, 저작권·라이선스 고지 유지.
    라이선스 전문: fonts/Pretendard-LICENSE.txt (폰트 파일과 함께 배포하세요)
- Pretendard 는 소개 페이지의 출처·저작권 표에 기본 항목으로 들어 있습니다. (admin 의 소개 탭)

[배포용 폴더 구성]  ※ admin.html 은 올리지 않습니다 (로컬 관리용)

  (배포 폴더)/
  ├─ index.html                  홈 (히어로·카로셀·주제·앨범 미리보기·메이킹 하이라이트)
  ├─ works.html                  상영작 (전체 포스터 그리드)
  ├─ watch.html                  상영관 (watch.html?id=작품ID)
  ├─ making.html                 메이킹 (공통 창작 과정·AI 도구·선언문)
  ├─ album.html                  가족 앨범
  ├─ about.html                  소개 (제작자·기획 의도·출처 표·공모전 안내)
  ├─ theme.css                   공개 페이지 스타일 (글꼴 @font-face 포함)
  ├─ common.js                   공개 페이지 공통 스크립트
  ├─ content.json                모든 문구·작품 데이터 (admin 에서 내보낸 파일로 교체)
  └─ media/
     ├─ README.txt               (이 파일 – 올려도, 빼도 됩니다)
     ├─ hero-loop.mp4            홈 히어로 배경 영상 루프 (선택, 10~20초·5MB 이하 권장)
     ├─ hero-poster.jpg          히어로 대체 이미지 (모바일·재생 실패 시)
     ├─ hero-image.jpg           히어로를 "대표 이미지"로 쓸 때 (선택)
     ├─ <작품>.mp4               작품별 영상
     ├─ <작품>-poster.jpg        작품별 포스터
     ├─ <작품>.vtt               자막 (선택)
     ├─ gallery-*.jpg            앨범 사진
     └─ fonts/
        ├─ Pretendard-Regular.woff2
        ├─ Pretendard-Medium.woff2
        ├─ Pretendard-Bold.woff2
        └─ Pretendard-LICENSE.txt

  제외: admin.html
  외부 의존성: 없음 (글꼴·로고·파비콘 모두 사이트 안에서 만들어짐)
[배포 폴더 만들기 – build-deploy.ps1]
1) 프로젝트 폴더에서 PowerShell 을 열고  .\build-deploy.ps1  을 실행합니다. (막히면 powershell -ExecutionPolicy Bypass -File .\build-deploy.ps1)
2) deploy/ 폴더가 새로 만들어지고 공개용 파일만 복사되며, 예시 문구·없는 media 파일·25MB 초과 파일·외부 링크가 빨간색으로 표시됩니다.
3) "배포 준비 완료"가 나오면 deploy/ 폴더 전체를 Cloudflare Pages 등에 올립니다. (admin.html·백업·README 는 들어가지 않습니다)
[로컬에서 열 때]
- 파일을 더블클릭하면 브라우저 보안 때문에 content.json 을 읽지 못할 수 있습니다.
- 이 폴더의 상위(사이트 루트)에서 다음을 실행한 뒤 http://localhost:8000 으로 여세요.
    python -m http.server 8000
