Downjson 업데이트 번들
=====================
생성일: 2025-11-09 09:01:27

포함 파일
- manifest.json      (MV3, 실제 적용용)
- bg.js              (서비스워커, 기능 번호 주석 포함)
- content.js         (Shadow DOM + 기능 번호 주석 + 라인별 주석)
- FEATURE_MAP.md     (기능 번호 맵 요약)

적용 방법 (GitHub 웹 업로드 · 가장 쉬움)
1) https://github.com/ranka0725-cmd/Downjson 열기
2) Add file → Upload files
3) 위 4개 파일을 드래그-드롭으로 업로드(덮어쓰기)
4) Commit 메시지 예시:
   chore(ext 01/02/03/04/05): MV3 + Shadow DOM + 기능 번호 주석 적용

로컬 Git에서 적용 (선택)
1) 레포 루트에 4개 파일 덮어쓰기
2) 아래 실행:
   git add manifest.json bg.js content.js FEATURE_MAP.md
   git commit -m "chore(ext 01/02/03/04/05): MV3 + Shadow DOM + 기능 번호 주석 적용"
   git push origin main

검증
- chrome://extensions → 개발자 모드 → 확장 재로드
- 아무 페이지에서 아이콘 클릭 또는 Alt+Shift+X로 패널 표시
- 선택모드 → 요소 클릭 → 미리보기에 선택자/텍스트 노출 확인