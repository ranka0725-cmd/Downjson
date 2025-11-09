// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 아이콘 클릭 → 콘텐츠 스크립트에 패널 토글 전달 (START)
// ─────────────────────────────────────────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {                         // 아이콘 클릭 시 이벤트 리스너 등록
  if (!tab?.id) return;                                                      // 탭 ID가 없으면 종료(안전 가드)
  try {                                                                      // 예외 처리 시작
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });         // 현재 탭의 content.js로 "패널 토글" 메시지 전송
  } catch (e) { /* 일부 페이지에선 실패할 수 있음 → 무시 */ }                  // 메시지 실패는 무시(권한/탭상태 이슈 가능)
});                                                                          // 리스너 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 아이콘 클릭 → 콘텐츠 스크립트에 패널 토글 전달 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 이미지 프록시 다운로드(FETCH_IMG) 핸들러 (CORS 우회) (START)
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {        // 임의 메시지 수신 리스너
  if (msg?.type !== "FETCH_IMG") return;                                     // 이미지 프록시 요청만 처리
  (async () => {                                                             // 비동기 IIFE
    try {                                                                    // 예외 처리 시작
      const res = await fetch(msg.url, {                                     // 서비스워커 컨텍스트에서 직접 fetch
        method: "GET"                                                        // GET 요청
        // credentials: "omit"                                               // 기본 omit(쿠키 불필요 시); 필요하면 include로 변경
      });                                                                    // fetch 끝
      if (!res.ok) {                                                         // HTTP 코드가 200대가 아니면
        sendResponse({ ok: false, err: "HTTP " + res.status });              // 에러 응답 후
        return;                                                              // 종료
      }                                                                      // if 끝
      const ct = res.headers.get("content-type") || "";                      // Content-Type 확인
      const buf = await res.arrayBuffer();                                   // 바이트 데이터 획득
      // ---- ArrayBuffer → Base64 변환(대용량 안전 변환) ----
      const bytes = new Uint8Array(buf);                                     // Uint8Array로 래핑
      const chunk = 0x8000;                                                  // 청크 크기(성능/메모리 균형)
      let binary = "";                                                       // 바이너리 문자열 누적 버퍼
      for (let i = 0; i < bytes.length; i += chunk) {                        // 청크 루프
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));      // 부분 변환
      }                                                                      // 루프 끝
      const base64 = btoa(binary);                                           // base64 인코딩
      sendResponse({ ok: true, base64, contentType: ct });                   // 성공 응답(본문 base64 + 타입)
    } catch (e) {                                                            // 네트워크/기타 예외
      sendResponse({ ok: false, err: String(e) });                           // 에러 응답
    }                                                                        // try-catch 끝
  })();                                                                       // 즉시 실행
  return true;                                                                // 비동기 sendResponse를 위해 true 반환
});                                                                           // 메시지 리스너 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 이미지 프록시 다운로드(FETCH_IMG) 핸들러 (CORS 우회) (END)
// ─────────────────────────────────────────────────────────────────────────────
