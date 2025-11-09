// lib/image.js — 이미지 수집 유틸 (IIFE)                                     // 파일 목적: 이미지 URL 수집 공통화
// - window.DWLib.Image 네임스페이스로 제공                                    // 공개 네임스페이스
// - selectors(컨테이너/IMG 혼합)에서 중복 제거된 절대 URL 배열 반환           // 기능 요약
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  /** srcset에서 가장 큰 소스 선택 */                                          // 유틸: srcset 파서
  function parseSrcset(ss){                                                   // 함수 시작
    try {                                                                     // 예외 보호
      const parts = String(ss||'').split(',').map(s=>s.trim()).filter(Boolean); // 항목 분해
      let best='', bestW=0;                                                   // 최적 후보/폭
      for (const p of parts){                                                 // 각 항목 순회
        const [u,w] = p.split(/\s+/);                                         // URL/폭 문자열
        const m = (w||'').match(/(\d+)w/);                                    // 숫자 폭 매칭
        const ww = m ? (+m[1]) : 0;                                           // 폭 숫자화
        if (ww>=bestW){ bestW=ww; best=u; }                                   // 최댓값 갱신
      }
      return best || parts[0] || '';                                          // 결과 반환
    } catch { return ''; }                                                    // 실패 시 빈값
  }                                                                           // parseSrcset 끝

  /** 임의 data-* 등에서 이미지 URL 추정 */                                     // 유틸: 속성 스캔
  function guessUrlFromAttrs(el){                                             // 함수 시작
    try {                                                                     // 예외 보호
      for (const a of Array.from(el.attributes||[])){                          // 모든 속성 순회
        const v = String(a.value||'').trim();                                  // 값 정규화
        const m = v.match(/^https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|avif)(?:[?#][^\s"']*)?$/i); // 확장자 매칭
        if (m) return m[0];                                                   // 매칭 시 반환
      }
    } catch {}                                                                // 예외 무시
    return '';                                                                // 없으면 빈값
  }                                                                           // guessUrlFromAttrs 끝

  /** 상대→절대 URL 변환 */                                                    // 유틸: 절대화
  function toAbs(u){                                                          // 함수 시작
    try { return new URL(u, location.href).href; } catch { return u||''; }     // 절대화/폴백
  }                                                                           // toAbs 끝

  /** 컨테이너/IMG 선택자 혼합에서 이미지 URL 수집 */                           // 메인: 수집기
  function collect(selectors){                                                // 함수 시작
    const urls = new Set();                                                   // 중복 제거 집합
    try {                                                                     // 예외 보호
      for (const sel of (selectors||[])){                                      // 선택자 순회
        if (!sel) continue;                                                    // 공백 스킵
        const nodes = document.querySelectorAll(sel);                          // 노드 수집
        nodes.forEach(node => {                                                // 각 노드 처리
          if ((node.tagName||'').toUpperCase()==='IMG'){                       // IMG 직접 선택
            const ds = node.getAttribute('data-src')||node.getAttribute('data-original')||''; // lazy 후보
            const ss = node.getAttribute('srcset')||'';                        // srcset
            const cur= node.currentSrc||'';                                    // currentSrc
            const s  = node.getAttribute('src')||'';                            // src
            const any= guessUrlFromAttrs(node);                                // data-* 추정
            const best = ds || (ss? parseSrcset(ss):'') || cur || s || any;    // 우선순위 결정
            if (best) urls.add(toAbs(best));                                   // 결과 추가
          } else {                                                             // 컨테이너 선택
            node.querySelectorAll('img').forEach(im => {                       // 내부 IMG 모두
              const ds = im.getAttribute('data-src')||im.getAttribute('data-original')||'';
              const ss = im.getAttribute('srcset')||'';
              const cur= im.currentSrc||'';
              const s  = im.getAttribute('src')||'';
              const any= guessUrlFromAttrs(im);
              const best = ds || (ss? parseSrcset(ss):'') || cur || s || any;
              if (best) urls.add(toAbs(best));
            });
          }
        });
      }
      // 폴백: 뉴토끼 경로 힌트(전역 검색)
      if (urls.size===0){                                                     // 결과가 비었으면
        document.querySelectorAll("img[src*='/data/file/webtoon/'], img[data-src*='/data/file/webtoon/'], img[srcset*='/data/file/webtoon/']")
          .forEach(im=>{                                                       // 매칭 IMG 순회
            const ds = im.getAttribute('data-src')||im.getAttribute('data-original')||'';
            const ss = im.getAttribute('srcset')||'';
            const cur= im.currentSrc||'';
            const s  = im.getAttribute('src')||'';
            const any= guessUrlFromAttrs(im);
            const best = ds || (ss? parseSrcset(ss):'') || cur || s || any;
            if (best) urls.add(toAbs(best));
          });
      }
    } catch (e){ console.warn('[Downloader] Image.collect', e); }              // 예외 로그
    return Array.from(urls);                                                   // 배열 반환
  }                                                                           // collect 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // API 노출
  const root = (typeof window!=='undefined') ? window : self;                  // 전역 선택
  root.DWLib = root.DWLib || {};                                               // 루트 보장
  root.DWLib.Image = { collect, parseSrcset, guessUrlFromAttrs, toAbs };       // Image API 노출
})();                                                                          // IIFE 끝

