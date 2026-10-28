# 우리 가족 영상 (ourfamily meta)

공모전 발표용 가족 영상 사이트입니다. 영상·게임·스토리보드 작품을 상영하고, 가족 앨범과 메이킹 과정을 보여줍니다.

## 로컬에서 보기
```
python -m http.server 8000
```
브라우저에서 http://localhost:8000 을 엽니다. (파일을 더블클릭하면 `content.json`을 읽지 못할 수 있습니다.)

## 구성
- 공개 페이지: index, works, watch, making, album, about
- 관리 페이지: admin.html (콘텐츠 등록·수정)
- 데이터: content.json (DB 방식으로 이전 예정, [PRD.md](PRD.md) 참고)
- 미디어: media/ ([media/README.txt](media/README.txt))

## 배포
`.\build-deploy.ps1`을 실행하면 공개용 파일만 `deploy/`에 모입니다. 현재 계획은 GitHub → Vercel 연결입니다. 진행 상황은 [HANDOVER.md](HANDOVER.md)를 봅니다.

## 글꼴
Pretendard (SIL OFL 1.1). 라이선스 전문은 media/fonts/Pretendard-LICENSE.txt
