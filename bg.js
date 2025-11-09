/********************************************************************************
 * bg.js — MV3 Service Worker (백그라운드)
 * - 메시지 기반 이미지 fetch 폴백 (콘텐츠 fetch 실패 대비)
 * - (옵션) DNR 동적 규칙으로 Referer 헤더 주입 준비
 ********************************************************************************/

// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상수 · 유틸 (START)
// ─────────────────────────────────────────────────────────────────────────────
const OK = 0;                                              // 정상 코드
const ERR = 1;                                             // 오류 코드

// ─────────────────────────────────────────────────────────────────────────────
// Base64 인코딩 유틸: ArrayBuffer → Base64 문자열
// ─────────────────────────────────────────────────────────────────────────────
function abToBase64(ab) {                                  // ArrayBuffer를
  const u8 = new Uint8Array(ab);                           // 바이트 배열로 바꾸고
  let s = "";                                              // 누적 문자열 생성
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); // 각 바이트를 문자화
  return btoa(s);                                          // base64 인코딩 반환
}                                                          // 함수 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상수 · 유틸 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 메시지 핸들러 (START)
// - type: 'BG_FETCH_IMAGE'  → 이미지 다운로드 폴백
// - type: 'DNR_ENSURE_REF'  → (옵션) Referer 헤더 주입 규칙 추가
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {  // 콘텐츠 스크립트 메시지 수신
  (async () => {                                                       // 비동기 처리 IIFE
    try {                                                              // 예외 보호
      if (msg?.type === 'BG_FETCH_IMAGE') {                            // 이미지 폴백 요청
        const url = msg.url;                                          // 대상 URL
        const res = await fetch(url, {                                // 백그라운드에서 fetch
          method: 'GET',                                              // GET
          mode: 'cors',                                               // CORS
          credentials: 'omit',                                        // 쿠키/자격증명은 생략(백그라운드는 referer 미약)
          cache: 'no-store'                                           // 캐시 미사용
        });                                                           // fetch 끝
        if (!res.ok) {                                                // 실패하면
          sendResponse({ ok: false, err: `HTTP ${res.status}` });     // 에러 응답
          return;                                                     // 종료
        }                                                             // if 끝
        const ct = res.headers.get('content-type') || '';             // MIME
        const ab = await res.arrayBuffer();                           // 바이너리 수신
        const b64 = abToBase64(ab);                                   // Base64 변환
        sendResponse({ ok: true, contentType: ct, base64: b64 });     // 정상 응답
        return;                                                       // 종료
      }                                                               // if: BG_FETCH_IMAGE

      if (msg?.type === 'DNR_ENSURE_REF') {                           // (옵션) Referer 주입 규칙 요청
        const { targetOrigin, referer } = msg;                        // 대상/참조자
        await ensureRefererRule(targetOrigin, referer);               // 규칙 보장
        sendResponse({ ok: true });                                   // 응답
        return;                                                       // 종료
      }                                                               // if: DNR_ENSURE_REF

      sendResponse({ ok: false, err: 'unknown_message' });            // 알 수 없는 메시지
    } catch (e) {                                                     // 예외
      sendResponse({ ok: false, err: String(e) });                    // 에러 응답
    }                                                                 // try-catch
  })();                                                               // IIFE 실행
  return true;                                                        // async 응답 허용
});                                                                    // 리스너 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 메시지 핸들러 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] DNR: Referer 헤더 동적 규칙 (옵션) (START)
//  - 필요 시 호출: ensureRefererRule('https://img1.newtoki21.org', 'https://newtoki21.org')
//  - 참고: 선언적 규칙은 브라우저 전역에 적용되므로, 남용/중복 ID에 주의
// ─────────────────────────────────────────────────────────────────────────────
const DNR_RULE_PREFIX = 920000;                                 // 규칙 ID 시작(충돌 방지용 대역)
const dnrRuleCache = new Map();                                  // origin → ruleId 맵

async function ensureRefererRule(targetOrigin, referer) {        // targetOrigin에 referer 헤더 보장
  try {                                                          // 예외 보호
    if (!targetOrigin) return;                                   // 없으면 종료
    const url = new URL(targetOrigin);                           // URL 파싱
    const host = url.host;                                       // 호스트 추출 (e.g., img1.newtoki21.org)
    const ruleId = DNR_RULE_PREFIX + Math.abs(hashCode(host)) % 10000; // 호스트마다 고정 ID
    if (dnrRuleCache.has(host)) return;                          // 이미 추가했으면 스킵

    const rule = {                                               // 동적 규칙 정의
      id: ruleId,                                                // 고유 ID
      priority: 1,                                               // 우선순위
      action: {
        type: "modifyHeaders",                                   // 헤더 수정
        requestHeaders: [                                        // 요청 헤더 배열
          { header: "referer", operation: "set", value: referer || targetOrigin } // Referer 설정
        ]
      },
      condition: {
        urlFilter: `||${host}/*`,                                // 해당 호스트 요청에 적용
        resourceTypes: ["image", "xmlhttprequest", "media"]      // 리소스 유형
      }
    };

    // 기존에 같은 ID가 있으면 제거 후 추가
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
      addRules: [rule]
    });

    dnrRuleCache.set(host, ruleId);                              // 캐시 등록
  } catch (e) {
    // 규칙 추가 실패는 치명적이지 않으므로 로그만
    console.warn('[DNR]', e);
  }
}

// 간단한 해시 함수(문자열 → 정수)
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] DNR: Referer 헤더 동적 규칙 (옵션) (END)
// ─────────────────────────────────────────────────────────────────────────────
