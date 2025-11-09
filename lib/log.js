// lib/log.js — JSONL/콘솔 로깅 유틸 (IIFE)                                   // 파일 목적 설명
// - window.DWLib.Log 네임스페이스로 제공                                      // 공개 네임스페이스
// - JSONL 기록(writeActivity)과 콘솔 래퍼 제공                                // 기능 요약
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  const PREFIX = '[Downloader]';                                              // 고정 접두사

  /** 콘솔 래퍼: 일관된 접두사로 출력 */                                        // 콘솔 래퍼 설명
  const clog = {                                                              // 객체 시작
    log:   (...a)=>{ try{ console.log(PREFIX, ...a); } catch{} },             // log
    info:  (...a)=>{ try{ console.info(PREFIX, ...a); } catch{} },            // info
    warn:  (...a)=>{ try{ console.warn(PREFIX, ...a); } catch{} },            // warn
    error: (...a)=>{ try{ console.error(PREFIX, ...a); } catch{} }            // error
  };                                                                          // 객체 끝

  /** JSONL 한 줄 기록: 상태와 헬퍼가 가용하면 파일로 append, 아니면 콘솔 */      // 함수 설명
  async function writeActivity(record){                                       // 함수 시작
    try {                                                                     // 예외 보호
      const st = (typeof window!=='undefined' ? window.state : undefined) || null; // 전역 state 참조
      if (!st || st.logEnabled === false) return;                              // 로그 OFF면 종료
      if (!st.seriesDirHandle) { clog.warn('log skipped: no series dir'); return; } // 폴더 없으면 스킵
      const ensureDir = window.ensureDir;                                      // 헬퍼 참조
      const appendText = window.appendText;                                    // 헬퍼 참조
      if (typeof ensureDir !== 'function' || typeof appendText !== 'function'){ // 헬퍼 미가용
        clog.warn('writeActivity fallback (helpers missing)', record);          // 콘솔 폴백
        return;                                                                // 종료
      }
      const logsDir = await ensureDir(st.seriesDirHandle, 'logs');             // logs/ 디렉터리 보장
      const fh = await logsDir.getFileHandle('activity.jsonl', { create: true }); // 파일 핸들
      await appendText(fh, JSON.stringify(record) + '\n');                    // JSONL append
    } catch(e){ clog.warn('writeActivity error', e); }                          // 예외 로그
  }                                                                            // writeActivity 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // API 노출
  const root = (typeof window!=='undefined') ? window : self;                  // 전역 선택
  root.DWLib = root.DWLib || {};                                               // 루트 보장
  root.DWLib.Log = { writeActivity, console: clog, PREFIX };                   // Log API 노출
})();                                                                          // IIFE 끝

