// lib/nav.js — 이동/자동 저장 유틸 (IIFE)                                   // 파일 목적 설명
// - window.DWLib.Nav 네임스페이스로 제공                                      // 공개 네임스페이스
// - 저장 후 다음 페이지로 이동하고, 새 페이지 로드시 자동 저장 1회 수행        // 기능 요약
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  const AUTO_KEY = 'dj_auto_next_job';                                        // 자동 저장 1회 플래그 키

  /** 선택자 배열에서 첫 유효한 다음 URL 찾기 */                               // 함수 설명
  function findNextUrl(selectors){                                            // 함수 시작
    try {                                                                     // 예외 보호
      if (!Array.isArray(selectors) || selectors.length===0) return null;      // 미설정 가드
      for (const sel of selectors){                                            // 각 선택자 순회
        if (!sel) continue;                                                    // 공백 스킵
        const el = document.querySelector(sel);                                // 요소 탐색
        if (!el) continue;                                                     // 실패 스킵
        if (el.tagName==='A' && el.href) return el.href;                       // 앵커 href 반환
        const raw = el.getAttribute && el.getAttribute('href');                // 속성 href 조회
        if (raw){ try { return new URL(raw, location.href).href; } catch {} }  // 절대 URL 변환
      }                                                                        // 루프 끝
      return null;                                                             // 모두 실패
    } catch(e){ console.warn('[Downloader] Nav.findNextUrl', e); return null } // 예외 시 null
  }                                                                            // findNextUrl 끝

  /** 저장 완료 후: 지연 대기 → 플래그 저장 → 다음 페이지로 이동 */             // 함수 설명
  async function afterSaveAutoNext(state){                                     // 함수 시작
    try {                                                                     // 예외 보호
      const enabled = (state && state.autoNextEnabled) ?? true;                 // 활성 여부
      if (!enabled) return;                                                    // 비활성 종료
      const delayMs = Number((state && state.autoNextDelayMs) ?? 2000) || 0;    // 지연(ms)
      const sels = (state && state.nextLinkSels) || [];                         // 다음 링크 선택자들
      const nextUrl = findNextUrl(sels);                                        // 다음 URL 계산
      if (!nextUrl) return;                                                    // 이동 불가 종료
      if (chrome?.storage?.local?.set){                                         // storage 가용 시
        await chrome.storage.local.set({ [AUTO_KEY]: { shouldAutoSaveOnce: true, ts: Date.now() } }); // 플래그 저장
      }
      if (delayMs>0) await new Promise(res=>setTimeout(res, delayMs));         // 지연 대기
      location.assign(nextUrl);                                                // 이동 실행
    } catch(e){ console.warn('[Downloader] Nav.afterSaveAutoNext', e); }        // 예외 로그
  }                                                                            // afterSaveAutoNext 끝

  /** 새 페이지 로드시: 플래그 있으면 1회 자동 저장 */                           // 함수 설명
  async function resumeAutoSaveOnce(state, saveInvoker){                       // 함수 시작
    try {                                                                     // 예외 보호
      let job=null;                                                            // 플래그 변수
      if (chrome?.storage?.local?.get){                                        // storage 가용 시
        const data = await new Promise(res=>chrome.storage.local.get(AUTO_KEY, v=>res(v&&v[AUTO_KEY]))); // 읽기
        job = data||null;                                                      // 추출
        try { if (job && chrome.storage.local.remove) await chrome.storage.local.remove(AUTO_KEY); } catch {} // 제거
      }
      if (!job || !job.shouldAutoSaveOnce) return;                             // 플래그 없음
      const delayMs = Number((state && state.autoNextDelayMs) ?? 1000) || 0;    // 안정 대기
      if (delayMs>0) await new Promise(res=>setTimeout(res, delayMs));         // 대기
      if (typeof saveInvoker==='function') {                                    // 저장 호출자 우선
        await saveInvoker();                                                    // 저장 수행
      } else if (typeof window.saveCurrentPage==='function'){                   // 대안 경로
        await window.saveCurrentPage();                                         // 저장 수행
      } else {
        const btn = document.getElementById('dj-btn-save');                     // 버튼 경로
        if (btn) btn.click();                                                   // 클릭 트리거
        else console.warn('[Downloader] Nav.resumeAutoSaveOnce: 트리거 없음');   // 경고
      }
    } catch(e){ console.warn('[Downloader] Nav.resumeAutoSaveOnce', e); }       // 예외 로그
  }                                                                            // resumeAutoSaveOnce 끝

  /** BG 메시지 처리: 저장 완료 통지 시 afterSaveAutoNext 호출 */               // 함수 설명
  async function handleBgMessage(msg, state){                                   // 함수 시작
    try { if (msg && msg.type==='dj:save-complete') await afterSaveAutoNext(state); } catch {} // 처리
  }                                                                            // handleBgMessage 끝

  const root = (typeof window!=='undefined') ? window : self;                  // 전역 객체 선택
  root.DWLib = root.DWLib || {};                                               // DWLib 루트 보장
  root.DWLib.Nav = { findNextUrl, afterSaveAutoNext, resumeAutoSaveOnce, handleBgMessage, AUTO_KEY }; // API 노출
  try {                                                                         // 부트스트랩 시도
    // onManualAdd 래핑: 함수가 준비되면 한 번만 래핑
    let tries = 0;                                                              // 시도 카운터
    const t = setInterval(() => {                                               // 주기적 확인
      try {                                                                      // 예외 보호
        if (root._dj_nav_wrapped || typeof root.onManualAdd !== 'function') {    // 아직 아니면 대기
          if (++tries > 60) clearInterval(t);                                    // 한계 초과 시 중단
          return;                                                                // 계속 대기
        }
        root._dj_nav_wrapped = true;                                            // 래핑 플래그
        const orig = root.onManualAdd;                                          // 원본 보관
        root.onManualAdd = async function(){                                     // 래핑 함수
          const r = await orig.apply(this, arguments);                           // 원본 실행
          try { if (root.DWLib?.Nav?.afterSaveAutoNext && root.state) await root.DWLib.Nav.afterSaveAutoNext(root.state); } catch {} // 후크
          return r;                                                              // 반환
        };                                                                       // 함수 정의 끝
        clearInterval(t);                                                        // 타이머 종료
      } catch {}                                                                 // 예외 무시
    }, 300);                                                                     // 300ms 간격

    // 페이지 로드시 자동 저장 1회 재개
    document.addEventListener('DOMContentLoaded', () => {                        // DOM 준비 리스너
      try { if (root.DWLib?.Nav?.resumeAutoSaveOnce && root.state) root.DWLib.Nav.resumeAutoSaveOnce(root.state, root.onManualAdd); } catch {} // 호출
    }, { once: true });                                                          // 1회만
  } catch {}                                                                      // 부트스트랩 예외 무시
})();                                                                          // IIFE 끝
