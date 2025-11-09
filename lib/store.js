// lib/store.js — 사이트 상태 저장/복원 유틸 (IIFE)                          // 파일 목적 설명
// - window.DWLib.Store 네임스페이스로 chrome.storage/localStorage 래핑        // 공개 네임스페이스
// - 숫자 접미 도메인(normalizeHost) 정규화 제공                               // 기능 요약
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  /** 도메인 정규화: newtoki469 → newtoki (소문자) */                           // 함수 설명 주석
  function normalizeHost(h){                                                  // 함수 시작
    try {                                                                     // 예외 보호
      const host = String(h || (typeof location!=='undefined' ? location.hostname : '') || '').toLowerCase(); // 호스트 문자열
      return host.replace(/\d+(?=\.|$)/g, '');                                // 숫자 접미 제거
    } catch {                                                                  // 실패 시
      try { return location.hostname; } catch { return ''; }                   // 폴백 반환
    }                                                                          // try/catch 끝
  }                                                                            // normalizeHost 끝

  /** chrome.storage.local set 래핑(+localStorage 폴백) */                      // 저장 유틸 설명
  async function saveSiteState(key, data){                                     // 함수 시작
    try {                                                                     // 우선 chrome.storage.local 사용
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.storage.local.set) {
        await new Promise(res => chrome.storage.local.set({ [key]: data }, () => res())); // 비동기 set
        return;                                                                // 저장 성공
      }                                                                        // if 끝
    } catch (e) { console.warn('[Downloader] Store.saveSiteState(storage)', e); } // 경고 로그
    try {                                                                     // 폴백: localStorage
      localStorage.setItem(key, JSON.stringify(data));                         // 문자열화 저장
    } catch (e) { console.warn('[Downloader] Store.saveSiteState(local)', e); }  // 경고 로그
  }                                                                            // saveSiteState 끝

  /** chrome.storage.local get 래핑(+localStorage 폴백) */                      // 복원 유틸 설명
  async function loadSiteState(key){                                           // 함수 시작
    try {                                                                     // 우선 chrome.storage.local 사용
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
        const data = await new Promise(res => chrome.storage.local.get(key, (r)=> res(r && r[key]))); // 비동기 get
        if (data && typeof data === 'object') return data;                     // 객체면 반환
      }                                                                        // if 끝
    } catch (e) { console.warn('[Downloader] Store.loadSiteState(storage)', e); } // 경고 로그
    try {                                                                     // 폴백: localStorage
      const raw = localStorage.getItem(key);                                   // 로컬 읽기
      if (!raw) return null;                                                   // 없음
      const obj = JSON.parse(raw);                                             // 파싱
      return (obj && typeof obj === 'object') ? obj : null;                    // 객체만 반환
    } catch (e) { console.warn('[Downloader] Store.loadSiteState(local)', e); return null; } // 경고 로그
  }                                                                            // loadSiteState 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // API 묶음 노출
  const root = (typeof window !== 'undefined') ? window : self;                // 전역 객체 선택
  root.DWLib = root.DWLib || {};                                               // DWLib 루트 보장
  root.DWLib.Store = { normalizeHost, saveSiteState, loadSiteState };          // Store API 노출
})();                                                                          // IIFE 끝

