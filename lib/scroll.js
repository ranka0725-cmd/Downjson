// lib/scroll.js — 스크롤/지연 로딩 우회 유틸 (IIFE)                       // 파일 목적 설명
// - window.DWLib.Scroll 네임스페이스로 제공                                  // 공개 네임스페이스
// - content.js에서 이미지 선로딩/자동 스크롤에 사용                           // 사용처 안내
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  /** 한 번의 대기 유틸 */                                                     // 함수 설명 주석
  function sleep(ms){                                                         // sleep 함수 시작
    return new Promise(res => setTimeout(res, ms));                           // Promise 기반 지연 반환
  }                                                                           // sleep 끝

  /** 지연 로딩 속성을 즉시 src/srcset으로 치환 */                             // 패치 설명 주석
  function patchLazyInViewOnce(){                                             // 함수 시작
    try {                                                                     // 예외 보호 시작
      const imgs = document.querySelectorAll(                                 // img 후보 쿼리
        'img[data-src], img[data-original], img[data-lazy], img[data-echo]'   // 흔한 lazy 속성들
      );                                                                      // 쿼리 끝
      imgs.forEach(img => {                                                   // 각 img 순회
        const cand =                                                           // 후보 URL 계산
          img.getAttribute('data-src') ||                                     // data-src
          img.getAttribute('data-original') ||                                // data-original
          img.getAttribute('data-lazy') ||                                    // data-lazy
          img.getAttribute('data-echo');                                      // data-echo
        const cur = img.getAttribute('src') || '';                            // 현재 src 값
        if (cand && (!cur || cur === '')) {                                   // 비어있을 때만 주입
          img.setAttribute('src', cand);                                      // src 설정
        }                                                                      // if 끝
      });                                                                      // forEach 끝

      const sources = document.querySelectorAll('source[data-srcset]');       // source 후보 쿼리
      sources.forEach(s => {                                                   // 각 source 순회
        const set = s.getAttribute('data-srcset');                             // data-srcset 값
        if (set) s.setAttribute('srcset', set);                                // srcset 설정
      });                                                                      // forEach 끝
    } catch(e){                                                                // 예외 처리
      console.warn('[Downloader] scroll.patchLazyInViewOnce', e);              // 경고 로그
    }                                                                          // try/catch 끝
  }                                                                            // patchLazyInViewOnce 끝

  /**
   * 화면을 아래로 단계 스크롤 → 바닥 대기 → 위로 단계 스크롤 → 시작 위치 복귀
   * @param {{step?:number,pause?:number,bottomHold?:number,topHold?:number,
   *          maxTimeMs?:number,patchLazy?:boolean}} opts 옵션                 // JSDoc 옵션 설명
   */                                                                          // 주석 끝
  async function autoScrollDownUp(opts){                                       // 함수 시작
    const el = document.scrollingElement || document.documentElement;          // 스크롤 요소 참조
    const startY = window.scrollY || 0;                                        // 시작 위치
    const maxY = Math.max(0, el.scrollHeight - window.innerHeight);            // 바닥 위치
    const step = Math.max(32, Math.floor((opts?.step ?? window.innerHeight*0.9))); // 스텝 크기
    const pause = opts?.pause ?? 120;                                          // 스텝 대기(ms)
    const bottomHold = opts?.bottomHold ?? 300;                                // 바닥 유지(ms)
    const topHold = opts?.topHold ?? 0;                                        // 복귀 유지(ms)
    const deadline = Date.now() + (opts?.maxTimeMs ?? 15000);                  // 최대 동작 시간
    const doPatch = !!(opts?.patchLazy);                                       // lazy 패치 여부
    try {                                                                      // 예외 보호
      for (let y = startY; y < maxY; y += step) {                              // 아래로 이동 루프
        window.scrollTo(0, y);                                                 // 스크롤 이동
        if (doPatch) patchLazyInViewOnce();                                    // 필요 시 lazy 패치
        await sleep(pause);                                                    // 잠깐 대기
        if (Date.now() > deadline) break;                                      // 시간 초과 시 중단
      }                                                                        // for 끝
      window.scrollTo(0, maxY);                                               // 바닥으로 이동
      if (doPatch) patchLazyInViewOnce();                                      // 바닥에서도 패치
      await sleep(bottomHold);                                                 // 바닥 대기
      for (let y = maxY; y > 0; y -= step) {                                   // 위로 이동 루프
        window.scrollTo(0, y);                                                 // 스크롤 이동
        if (doPatch) patchLazyInViewOnce();                                    // 필요 시 패치
        await sleep(pause);                                                    // 잠깐 대기
        if (Date.now() > deadline) break;                                      // 시간 초과 시 중단
      }                                                                        // for 끝
      window.scrollTo(0, startY);                                              // 시작 위치 복귀
      if (topHold>0) await sleep(topHold);                                     // 복귀 대기
      console.info('[Downloader] autoScrollDownUp 완료');                       // 완료 로그
    } catch(e){                                                                 // 예외 처리
      console.warn('[Downloader] autoScrollDownUp 실패', e);                    // 경고 로그
    }                                                                           // try/catch 끝
  }                                                                             // autoScrollDownUp 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // 공개 API 묶음
  const root = (typeof window !== 'undefined') ? window : self;                // 전역 객체 선택
  root.DWLib = root.DWLib || {};                                               // DWLib 루트 보장
  root.DWLib.Scroll = { autoScrollDownUp, patchLazyInViewOnce };               // Scroll API 노출
})();                                                                          // IIFE 끝

