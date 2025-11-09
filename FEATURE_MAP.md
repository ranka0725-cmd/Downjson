# Downjson 기능 맵 (Feature Map)

## 01. 패널 토글/표시
- 01-01: 아이콘 클릭 → 패널 토글 (bg.js `chrome.action.onClicked`)
- 01-02: 단축키(Alt+Shift+X) → 패널 토글 (bg.js `chrome.commands.onCommand`)
- 01-03: 패널 생성/표시/숨김 (content.js `createPanel()`, `togglePanel()`)
- 01-04: 최소화/펼치기 (content.js 헤더의 `minBtn` 제어)

## 02. 선택모드
- 02-01: 선택모드 On/Off (content.js `toggleSelection()`)
- 02-02: 호버 하이라이트(마우스 이동) (content.js `onMouseMove()`, `updateHoverBoxFor()`)
- 02-03: 클릭으로 선택 확정 (content.js `onClick()`)
- 02-04: 하이라이트 박스 생성 보장 (content.js `ensureHoverBox()`)

## 03. 선택자/텍스트 처리
- 03-01: 고유 CSS 선택자 생성 (content.js `getUniqueSelector()`)
- 03-02: `<br>` 줄바꿈 유지 텍스트 추출 (content.js `getTextWithBreaks()`)
- 03-03: 선택자 복사 버튼 (content.js 버튼 핸들러)
- 03-04: 텍스트 복사 버튼 (content.js 버튼 핸들러)
- 03-05: 패널 미리보기 갱신 (content.js `updatePreview()`)

## 04. 저장/불러오기
- 04-01: 도메인별 선택자 저장 (content.js `saveSelectorForSite()`)
- 04-02: 도메인별 선택자 불러오기 (content.js `loadSelectorsForSite()`)
- 04-03: 저장 버튼 동작 (content.js 버튼 핸들러)

## 05. 아키텍처/초기화
- 05-01: Shadow Host 구성 (content.js `ensureShadowHost()`)
- 05-02: Shadow DOM 스타일 주입 (content.js `STYLE_CSS` + 삽입)
- 05-03: 메시지 수신(패널 토글) (content.js `chrome.runtime.onMessage`)
- 05-04: 초기화(IIFE) (content.js `(function init(){ ... })()`)

> 모든 기능 번호는 코드의 주석과 섹션 타이틀에 동일하게 표시되어 추적이 쉽습니다.
