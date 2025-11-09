// lib/fsa.js — FSA/IDB 핸들 저장·복원 유틸 (IIFE)                           // 파일 목적
// - window.DWLib.FSA 네임스페이스로 제공                                      // 공개 네임스페이스
// - content.js의 FSA 관련 함수와 시그니처 호환                                // 호환성
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  const FSA_DB_NAME = 'dj_fsa_db';                                            // DB명(고정)
  const FSA_STORE = 'handles';                                                // 스토어명(고정)

  /** IDB 오픈(스토어 보장) */                                                // 함수 설명
  function openFsaDB(){                                                       // 함수 시작
    return new Promise((resolve, reject) => {                                  // 프라미스 반환
      try {                                                                    // 예외 보호
        const req = indexedDB.open(FSA_DB_NAME, 1);                            // 버전 1
        req.onupgradeneeded = () => {                                          // 업그레이드 훅
          const db = req.result;                                               // DB 참조
          if (!db.objectStoreNames.contains(FSA_STORE)) {                      // 스토어 없으면
            db.createObjectStore(FSA_STORE);                                   // 생성
          }                                                                     // if 끝
        };                                                                      // onupgradeneeded 끝
        req.onsuccess = () => resolve(req.result);                              // 성공
        req.onerror = () => reject(req.error);                                  // 실패
      } catch(e){ reject(e); }                                                  // 바깥 예외
    });                                                                         // Promise 끝
  }                                                                             // openFsaDB 끝

  /** IDB set */                                                                // 저장 설명
  async function idbSet(key, value){                                           // 함수 시작
    const db = await openFsaDB();                                              // DB 오픈
    return new Promise((resolve, reject) => {                                   // 프라미스
      const tx = db.transaction(FSA_STORE, 'readwrite');                        // 쓰기 TX
      tx.objectStore(FSA_STORE).put(value, key);                                // put
      tx.oncomplete = () => resolve();                                          // 완료
      tx.onerror = () => reject(tx.error);                                      // 에러
    });                                                                         // Promise 끝
  }                                                                             // idbSet 끝

  /** IDB get */                                                                // 읽기 설명
  async function idbGet(key){                                                  // 함수 시작
    const db = await openFsaDB();                                              // DB 오픈
    return new Promise((resolve, reject) => {                                   // 프라미스
      const tx = db.transaction(FSA_STORE, 'readonly');                         // 읽기 TX
      const req = tx.objectStore(FSA_STORE).get(key);                           // get
      req.onsuccess = () => resolve(req.result);                                // 성공
      req.onerror = () => reject(req.error);                                    // 실패
    });                                                                         // Promise 끝
  }                                                                             // idbGet 끝

  /** IDB delete */                                                             // 삭제 설명
  async function idbDel(key){                                                  // 함수 시작
    const db = await openFsaDB();                                              // DB 오픈
    return new Promise((resolve, reject) => {                                   // 프라미스
      const tx = db.transaction(FSA_STORE, 'readwrite');                        // 쓰기 TX
      tx.objectStore(FSA_STORE).delete(key);                                     // delete
      tx.oncomplete = () => resolve();                                          // 완료
      tx.onerror = () => reject(tx.error);                                      // 실패
    });                                                                         // Promise 끝
  }                                                                             // idbDel 끝

  /** 스토리지 영구화 요청 */                                                  // persist 설명
  async function ensurePersistentStorage(){                                    // 함수 시작
    try { await navigator.storage.persist(); } catch {}                         // 실패 무시
  }                                                                             // ensurePersistentStorage 끝

  /** 디렉터리 핸들 읽기/쓰기 권한 확인 */                                       // 권한 설명
  async function verifyDirRW(handle){                                          // 함수 시작
    try {                                                                       // 예외 보호
      const q = await handle.queryPermission?.({ mode: 'readwrite' });          // 현재 권한
      if (q === 'granted') return true;                                         // 이미 허용
      const r = await handle.requestPermission?.({ mode: 'readwrite' });        // 권한 요청
      return r === 'granted';                                                   // 허용 여부
    } catch { return false; }                                                   // 실패 false
  }                                                                             // verifyDirRW 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // API 노출
  const root = (typeof window !== 'undefined') ? window : self;                // 전역 선택
  root.DWLib = root.DWLib || {};                                               // 루트 보장
  root.DWLib.FSA = { openFsaDB, idbSet, idbGet, idbDel, ensurePersistentStorage, verifyDirRW }; // 공개
})();                                                                          // IIFE 끝

