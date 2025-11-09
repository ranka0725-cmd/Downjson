 /********************************************************************************
 * content.js — Downloader Web (Manual Capture)                                 // 파일 설명: 콘텐츠 스크립트 본체
 * version: 1.4.0                                                                // 파일 버전(semver)
 * updated: 2025-11-08                                                           // 마지막 수정일(YYYY-MM-DD)
 * - BLOCK-01: 전역 상태/기본값                     // 상태, 옵션, UI/섀도우 참조 등
 * - BLOCK-02: DOM/문자열 유틸                      // $, $$, sleep, 정규화 등 공용 함수
 * - BLOCK-03: FSA 핸들(IDB) 저장/복원               // 파일 시스템 액세스 핸들을 IDB에 보관/복원
 * - BLOCK-04: 로컬 상태 저장/복원                   // UI 상태(선택자/탭/로그/지연 등) 로컬스토리지
 * - BLOCK-05: 텍스트 처리 유틸                      // HTML→텍스트 변환, 슬러그 등
 * - BLOCK-06: 이미지/본문 수집                      // 컨테이너/IMG/지연로딩 수집 및 본문 추출
 * - BLOCK-07: 파일 IO(FSA)                          // 디렉터리/파일 보장, 쓰기/append 유틸
 * - BLOCK-08: 로그(JSONL) 작성                      // activity.jsonl 기록
 * - BLOCK-09: 패널 UI/섀도우/탭/라벨                // Shadow DOM, 탭(내용/선택자/설정), 폴더 라벨
 * - BLOCK-10: 저장 루틴                              // 스크롤→수집→파일 저장→이미지 다운로드→로그
 * - BLOCK-11: 초기화                                 // 상태 복원, 패널 표시, 미니바 제공
* - BLOCK-12: 플로팅 토글                            // 우하단 ● 버튼(토글/Shift-저장)
*   • BLOCK-09 Subsections:                          // 하위 섹션 목차
*     - 09-01 Shadow Root                            // 섀도우 루트 보장
*     - 09-02 Panel Mount                            // 패널 생성/부착
*     - 09-03 Tabs/Panes                             // 탭/패널 구성
*     - 09-04 Selector Lists                         // 선택자 리스트/템플릿
*     - 09-05 Folder Controls/Labels                 // 경로 라벨/입력/초기화
*     - 09-06 Tab Switching                          // 탭 전환 처리
*     - 09-07 Preview                                // 미리보기 갱신
*     - 09-08 Mini Bar                               // 최소화 바
 ********************************************************************************/


// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-01: 전역 상태/기본값 (START)
// ===== BLOCK-01: 전역 상태/기본값 (START)
// ─────────────────────────────────────────────────────────────────────────────
const state = {                                                             // 전역 상태 객체
  rootDirHandle: null,                                                      // 루트 폴더 핸들(FSA)
  seriesDirHandle: null,                                                    // 작품 폴더 핸들(FSA)
  seriesName: "",                                                           // 작품명(episodes.jsonl에 기록)
  titleParts: Array.from({ length: 10 }, () => ""),                         // 제목 10칸 기본값
  joiner: " | ",                                                            // 제목 파트 구분자
  titleSelectors: [                                                         // 제목 자동 추출용 선택자 후보(옵션)
    ".menu-top-tag", ".menu-top-title"                                      // 필요 시 확장 가능
  ],
  contentSelectors: [                                                       // 본문/이미지 컨테이너/IMG 선택자 후보(쉼표로 입력받아 덮어씀)
    "#novel_drawing, #novel_text, #novel_box, #novel_content"               // 초기 기본값
  ],
  saveImages: true,                                                         // 이미지 저장 ON/OFF
  logEnabled: true,                                                         // 로그 JSONL 기록 ON/OFF
  baseDelaySec: 5,                                                          // 기본 지연(벤 회피용)
  jitterSec: 2,                                                             // 추가 지터(무작위)
  panelEl: null,                                                            // 패널 DOM 참조
  miniEl: null,                                                             // 최소화 바 DOM 참조
  panelWasOpen: false,                                                      // 이전 페이지에서 패널 열림 상태
  fsaRestored: false,                                                       // FSA 핸들 복원 성공 여부
  seq: 0,                                                                   // 에피소드 시퀀스(EP-0001 ...)
  shadowHost: null,                                                         // 섀도우 호스트
  shadowRoot: null,                                                         // 섀도우 루트
  uiActiveTab: 'content',                                                   // 활성 탭
  bodySelectors: [],                                                        // 본문 선택자 목록(UI)
  imgSelectors: [],                                                         // 이미지 선택자 목록(UI)
  lastUsed: { body: [], img: [] },                                          // 마지막 사용된 선택자 표시용
  seriesSel: '',                                                            // 작품명 자동 채우기용 선택자
  titlePartSels: []                                                         // 각 제목칸 자동 채우기용 선택자 배열
  , nextLinkSels: []                                                        // [추가] 다음 페이지 이동용 링크 선택자 배열(페이지 간 유지)
};                                                                           // state 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-01: 전역 상태/기본값 (END)
// BLOCK-01: 전역 상태/기본값 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-02: DOM/문자열 유틸 (START)
// ===== BLOCK-02: DOM/문자열 유틸 (START)
// ─────────────────────────────────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);                          // 단일 선택 헬퍼
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));          // 다중 선택 헬퍼
const sleep = (ms) => new Promise(r => setTimeout(r, ms));                  // 지연 프로미스
function logStatus(msg) {                                                   // 간단 상태 로그(콘솔)
  console.log("[Downloader]", msg);                                         // 콘솔 출력
}                                                                            // logStatus 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-02: DOM/문자열 유틸 (END)
// BLOCK-02: DOM/문자열 유틸 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-03: FSA 핸들(IDB) 저장/복원 (START)
// ===== BLOCK-03: FSA 핸들(IDB) 저장/복원 (START)
// ─────────────────────────────────────────────────────────────────────────────
const FSA_DB_NAME = "dj_fsa_db";                                            // IndexedDB DB명
const FSA_STORE = "handles";                                                // 오브젝트 스토어명
const FSA_ROOT_KEY = "rootDir";                                             // 루트 핸들 키
const FSA_SERIES_KEY = "seriesDir";                                         // 시리즈 핸들 키

function openFsaDB() {                                                      // IDB 오픈
  return new Promise((resolve, reject) => {                                  // 프라미스 래핑
    const req = indexedDB.open(FSA_DB_NAME, 1);                              // 버전1
    req.onupgradeneeded = () => {                                            // 업그레이드 훅
      const db = req.result;                                                 // DB 참조
      if (!db.objectStoreNames.contains(FSA_STORE)) {                        // 스토어 없으면
        db.createObjectStore(FSA_STORE);                                     // 생성
      }                                                                       // if 끝
    };                                                                        // onupgradeneeded 끝
    req.onsuccess = () => resolve(req.result);                               // 성공시 DB 반환
    req.onerror = () => reject(req.error);                                   // 실패시 에러 반환
  });                                                                         // Promise 끝
}                                                                             // openFsaDB 끝

async function idbSet(key, value) {                                         // IDB 저장
  const db = await openFsaDB();                                              // DB 오픈
  return new Promise((resolve, reject) => {                                   // 프라미스
    const tx = db.transaction(FSA_STORE, "readwrite");                        // 쓰기 트랜잭션
    tx.objectStore(FSA_STORE).put(value, key);                                // put 저장
    tx.oncomplete = () => resolve();                                          // 완료
    tx.onerror = () => reject(tx.error);                                      // 에러
  });                                                                         // Promise 끝
}                                                                             // idbSet 끝

async function idbGet(key) {                                                // IDB 읽기
  const db = await openFsaDB();                                              // DB 오픈
  return new Promise((resolve, reject) => {                                   // 프라미스
    const tx = db.transaction(FSA_STORE, "readonly");                         // 읽기 트랜잭션
    const req = tx.objectStore(FSA_STORE).get(key);                           // get 요청
    req.onsuccess = () => resolve(req.result);                                // 성공
    req.onerror = () => reject(req.error);                                    // 실패
  });                                                                         // Promise 끝
}                                                                             // idbGet 끝

async function ensurePersistentStorage() {                                   // 스토리지 영구화 시도
  try { await navigator.storage.persist(); } catch {}                         // 실패 무시
}                                                                             // ensurePersistentStorage 끝

async function verifyDirRW(handle) {                                         // 읽기/쓰기 권한 확인
  try {                                                                       // 예외 보호
    const q = await handle.queryPermission?.({ mode: "readwrite" });          // 현재 권한
    if (q === "granted") return true;                                         // 이미 허용
    const r = await handle.requestPermission?.({ mode: "readwrite" });        // 권한 요청
    return r === "granted";                                                   // 허용 여부 반환
  } catch { return false; }                                                   // 실패 시 false
}                                                                             // verifyDirRW 끝

async function fsaSaveHandles() {                                            // 핸들 IDB 저장
  try {                                                                       // 예외 보호
    if (state.rootDirHandle) await idbSet(FSA_ROOT_KEY, state.rootDirHandle); // 루트 저장
    if (state.seriesDirHandle) await idbSet(FSA_SERIES_KEY, state.seriesDirHandle); // 시리즈 저장
  } catch (e) { console.warn("[FSA save]", e); }                              // 오류 로그
}                                                                             // fsaSaveHandles 끝

/**
 * BLOCK-03: IDB 키 삭제                                                         // 루트 교체 시 seriesDir 초기화용
 * @param {string} key                                                          // 삭제할 키
 */
async function idbDel(key) {                                                  // 키 삭제
  const db = await openFsaDB();                                               // DB 오픈
  return new Promise((resolve, reject) => {                                   // 프라미스
    const tx = db.transaction(FSA_STORE, 'readwrite');                        // 쓰기 TX
    tx.objectStore(FSA_STORE).delete(key);                                     // 삭제
    tx.oncomplete = () => resolve();                                           // 완료
    tx.onerror = () => reject(tx.error);                                       // 에러
  });                                                                         // Promise 끝
}                                                                              // idbDel 끝

async function fsaRestoreHandles() {                                         // 핸들 복원
  try {                                                                       // 예외 보호
    await ensurePersistentStorage();                                          // 영구화 시도
    const root = await idbGet(FSA_ROOT_KEY);                                  // 루트 로드
    const series = await idbGet(FSA_SERIES_KEY);                               // 시리즈 로드
    if (root && await verifyDirRW(root)) state.rootDirHandle = root;          // 권한 확인 후 반영
    if (series && await verifyDirRW(series)) state.seriesDirHandle = series;  // 권한 확인 후 반영
    state.fsaRestored = !!(state.rootDirHandle && state.seriesDirHandle);     // 복원 성공 여부
  } catch (e) { console.warn("[FSA restore]", e); }                           // 오류 로그
}                                                                             // fsaRestoreHandles 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-03: FSA 핸들(IDB) 저장/복원 (END)
// BLOCK-03: FSA 핸들(IDB) 저장/복원 (END)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-03L: FSA 함수 라이브러리 위임(재바인딩) (START)                       // [추가] 라이브러리로 함수 연결
// ===== BLOCK-03L: FSA 함수 라이브러리 위임(재바인딩) (START)
// ─────────────────────────────────────────────────────────────────────────────
;(function rebindFsaToLib(){                                                  // IIFE 시작
  try {                                                                         // 예외 보호
    if (window.DWLib && window.DWLib.FSA) {                                     // 라이브러리 확인
      if (typeof openFsaDB === 'function')            openFsaDB            = window.DWLib.FSA.openFsaDB;            // 함수 재바인딩
      if (typeof idbSet === 'function')               idbSet               = window.DWLib.FSA.idbSet;               // 함수 재바인딩
      if (typeof idbGet === 'function')               idbGet               = window.DWLib.FSA.idbGet;               // 함수 재바인딩
      if (typeof idbDel === 'function')               idbDel               = window.DWLib.FSA.idbDel;               // 함수 재바인딩
      if (typeof ensurePersistentStorage === 'function') ensurePersistentStorage = window.DWLib.FSA.ensurePersistentStorage; // 함수 재바인딩
      if (typeof verifyDirRW === 'function')          verifyDirRW          = window.DWLib.FSA.verifyDirRW;          // 함수 재바인딩
      console.info('[Downloader] FSA 함수 재바인딩 완료');                       // 완료 로그
    }
  } catch (e) {                                                                 // 예외 처리
    console.warn('[Downloader] FSA 재바인딩 실패(무시 가능)', e);                 // 경고 로그
  }                                                                              // try/catch 끝
})();                                                                            // rebindFsaToLib 끝
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-03L: FSA 함수 라이브러리 위임(재바인딩) (END)
// ===== BLOCK-03L: FSA 함수 라이브러리 위임(재바인딩) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-04: 로컬 상태 저장/복원 (START)
// ===== BLOCK-04: 로컬 상태 저장/복원 (START)
// ─────────────────────────────────────────────────────────────────────────────
// 사이트 키 정규화: newtoki469 → newtoki 등 숫자 접미를 제거해 동일 그룹으로 저장     // [정리] 라이브러리 우선, 폴백 유지
function normalizeHost(h) { try {                                           // 지역 폴백 구현
  if (window.DWLib && window.DWLib.Store && typeof window.DWLib.Store.normalizeHost==='function') { // 라이브러리 가용
    return window.DWLib.Store.normalizeHost(h || location.hostname);        // 라이브러리 우선 사용
  }
  const host=String(h||location.hostname||'').toLowerCase();                // 폴백: 소문자 호스트
  return host.replace(/\d+(?=\.|$)/g,'');                                  // 숫자 접미 제거
} catch { return location.hostname; } }                                      // 실패 시 호스트 폴백
const SITE_KEY_PREFIX = 'dw_site_';                                           // chrome.storage.local 키 접두사        // [추가]
const LS_KEY = "dj_local_state_v1";                                         // 로컬스토리지 키

function saveLocal() {                                                      // 로컬 저장
  try {                                                                      // 예외 보호
    const keep = {                                                           // 저장 대상 축약
      seriesName: state.seriesName,                                          // 작품명
      titleParts: state.titleParts,                                          // 제목 파트들
      joiner: state.joiner,                                                  // 구분자
      bodySelectors: state.bodySelectors,                                    // 본문 선택자들
      imgSelectors: state.imgSelectors,                                      // 이미지 선택자들
      contentSelectors: [...(state.bodySelectors||[]), ...(state.imgSelectors||[])], // 호환용 통합
      saveImages: state.saveImages,                                          // 이미지 저장 여부
      logEnabled: state.logEnabled,                                          // 로그 여부
      baseDelaySec: state.baseDelaySec,                                      // 지연
      jitterSec: state.jitterSec,                                            // 지터
      panelWasOpen: state.panelWasOpen,                                      // 패널 열림 여부
      seq: state.seq,                                                        // 시퀀스
      uiActiveTab: state.uiActiveTab,                                        // 활성 탭
      seriesSel: state.seriesSel || '',                                      // 작품명 선택자                          // [추가]
      titlePartSels: state.titlePartSels || []                               // 제목칸 선택자 배열                    // [추가]
      , nextLinkSels: state.nextLinkSels || []                               // [추가] 다음 링크 선택자 배열 저장
    };                                                                        // keep 끝
    if (state.seriesFolderName !== undefined) keep.seriesFolderName = state.seriesFolderName; // 폴더명 보관
    localStorage.setItem(LS_KEY, JSON.stringify(keep));                      // 저장
    // chrome.storage.local에도 사이트 그룹 키로 보존(도메인 숫자 변경 대응)          // [정리] Store 라이브러리 우선 사용
    try {
      const key = SITE_KEY_PREFIX + ( (window.DWLib && window.DWLib.Store && typeof window.DWLib.Store.normalizeHost==='function')
        ? window.DWLib.Store.normalizeHost(location.hostname)
        : normalizeHost(location.hostname) );                                 // 사이트 키 계산
      if (window.DWLib && window.DWLib.Store && typeof window.DWLib.Store.saveSiteState==='function') {
        window.DWLib.Store.saveSiteState(key, keep);                          // 라이브러리 저장
      } else if (chrome?.storage?.local) {
        chrome.storage.local.set({ [key]: keep });                            // 기존 경로 저장
      }
    } catch {}                                                                // 실패 무시
  } catch (e) { console.warn("[saveLocal]", e); }                             // 오류 로그
}                                                                             // saveLocal 끝

function loadLocal() {                                                      // 로컬 복원
  try {                                                                      // 예외 보호
    const raw = localStorage.getItem(LS_KEY);                                // 로드
    if (!raw) return;                                                        // 없으면 종료
    const obj = JSON.parse(raw);                                             // 파싱
    Object.assign(state, obj);                                               // 병합
  } catch (e) { console.warn("[loadLocal]", e); }                             // 오류 로그
}                                                                             // loadLocal 끝

async function loadPersistent() {                                            // chrome.storage.local 우선 복원         // [정리]
  try {                                                                       // 예외 보호
    const key = SITE_KEY_PREFIX + ( (window.DWLib && window.DWLib.Store && typeof window.DWLib.Store.normalizeHost==='function')
      ? window.DWLib.Store.normalizeHost(location.hostname)
      : normalizeHost(location.hostname) );                                   // 사이트 키 계산
    if (window.DWLib && window.DWLib.Store && typeof window.DWLib.Store.loadSiteState==='function') { // 라이브러리 경로
      const data = await window.DWLib.Store.loadSiteState(key);               // 상태 로드
      if (data && typeof data === 'object') { Object.assign(state, data); return; } // 병합 후 반환
    } else if (chrome?.storage?.local) {                                       // 기존 경로
      const data = await new Promise(res => chrome.storage.local.get(key, r => res(r && r[key]))); // 비동기 get
      if (data && typeof data === 'object') { Object.assign(state, data); return; } // 병합 후 반환
    }
  } catch (e) { console.warn('[loadPersistent]', e); }                        // 실패 시 무시
  loadLocal();                                                                // fallback 로컬스토리지 복원
}                                                                               // loadPersistent 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-04: 로컬 상태 저장/복원 (END)
// BLOCK-04: 로컬 상태 저장/복원 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-05: 텍스트 처리 유틸 (START)
// ===== BLOCK-05: 텍스트 처리 유틸 (START)
// ─────────────────────────────────────────────────────────────────────────────
function htmlToPlainKeepBR(html) {                                          // <br> → 개행, 태그 제거
  if (!html) return "";                                                      // 빈값 가드
  return html                                                                // 변환 파이프
    .replace(/<\s*br\s*\/?>/gi, "\n")                                        // br → \n
    .replace(/<\/p\s*>/gi, "\n")                                             // </p> → \n
    .replace(/<script[\s\S]*?<\/script>/gi, "")                              // 스크립트 제거
    .replace(/<style[\s\S]*?<\/style>/gi, "")                                // 스타일 제거
    .replace(/<[^>]+>/g, "")                                                 // 나머지 태그 제거
    .replace(/\u00A0/g, " ")                                                 // NBSP → 스페이스
    .replace(/\n{3,}/g, "\n\n")                                              // 과도한 개행 축소
    .trim();                                                                  // 트림
}                                                                            // htmlToPlainKeepBR 끝

// 선택자에서 텍스트를 안전하게 추출하는 유틸리티                                 // [추가]
function safePickText(sel) {                                                 // CSS 선택자 → 텍스트
  try {                                                                      // 예외 보호
    const s = String(sel || '').trim(); if (!s) return '';                   // 공백 가드
    const n = document.querySelector(s); if (!n) return '';                  // 매칭 없음
    const tag = (n.tagName || '').toUpperCase();                             // 태그명
    if (tag === 'META') return (n.getAttribute('content') || '').trim();     // <meta content>
    if (tag === 'INPUT' || tag === 'TEXTAREA')                               // 폼 요소 값
      return (n.value || n.getAttribute('value') || '').trim();
    const txt = (n.innerText || n.textContent || '').trim();                 // 내부 텍스트
    if (txt) return txt;                                                     // 있으면 바로 반환
    return (n.getAttribute('title') || n.getAttribute('alt') || '').trim();  // 보조 속성
  } catch { return ''; }                                                     // 실패 시 빈 문자열
}                                                                            // safePickText 끝

function slugify(s) {                                                       // 파일/ID용 슬러그
  return (s || "")                                                           // 입력 문자열
    .toLowerCase()                                                           // 소문자화
    .replace(/[^a-z0-9가-힣-_]+/g, "-")                                      // 안전치환
    .replace(/-+/g, "-")                                                     // 중복 - 제거
    .replace(/^-|-$/g, "");                                                  // 양끝 - 제거
}                                                                            // slugify 끝
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-02L: DOM 텍스트 유틸(라이브러리 사용 위임) (START)                   // [추가] 라이브러리 구현으로 전역 유틸 위임
// ===== BLOCK-02L: DOM 텍스트 유틸(라이브러리 사용 위임) (START)
// ─────────────────────────────────────────────────────────────────────────────
;(function connectDomTextLib(){                                              // IIFE: 라이브러리 연결
  try {                                                                       // 예외 보호
    if (window.DWLib && window.DWLib.DomText) {                               // 라이브러리 탐색
      // 전역 동일 명칭 함수들을 라이브러리 구현으로 위임(호출부 변경 없이 전환)
      window.slugify = window.DWLib.DomText.slugify;                           // 슬러그 변환 위임
      window.htmlToPlainKeepBR = window.DWLib.DomText.htmlToPlainKeepBR;       // HTML→텍스트 위임
      window.safePickText = window.DWLib.DomText.safePickText;                 // 선택자 텍스트 안전 추출 위임
      console.info('[Downloader] DomText 라이브러리 연결 완료');               // 연결 로그
    } else {
      console.warn('[Downloader] DomText 라이브러리 미탑재(선로딩 필요)');     // 선로딩 필요 경고
    }
  } catch(e){ console.warn('[Downloader] DomText 연결 실패', e); }             // 실패 로그(회피)
})();                                                                         // connectDomTextLib 끝
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-02L: DOM 텍스트 유틸(라이브러리 사용 위임) (END)
// ===== BLOCK-02L: DOM 텍스트 유틸(라이브러리 사용 위임) (END)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-02LR: DomText 지역 함수 재바인딩 (START)                               // [추가] 함수 바인딩을 라이브러리 구현으로 교체
// ===== BLOCK-02LR: DomText 지역 함수 재바인딩 (START)
// ─────────────────────────────────────────────────────────────────────────────
;(function rebindDomTextLocals(){                                             // IIFE: 지역 심볼 재바인딩
  try {                                                                         // 예외 보호
    if (window.DWLib && window.DWLib.DomText) {                                  // 라이브러리 확인
      if (typeof htmlToPlainKeepBR === 'function') htmlToPlainKeepBR = window.DWLib.DomText.htmlToPlainKeepBR; // 재바인딩
      if (typeof safePickText === 'function')     safePickText     = window.DWLib.DomText.safePickText;         // 재바인딩
      if (typeof slugify === 'function')          slugify          = window.DWLib.DomText.slugify;              // 재바인딩
      console.info('[Downloader] DomText 지역 함수 재바인딩 완료');              // 로그
    }
  } catch(e){ console.warn('[Downloader] DomText 재바인딩 실패', e); }           // 실패 로그
})();                                                                           // rebindDomTextLocals 끝
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-02LR: DomText 지역 함수 재바인딩 (END)
// ===== BLOCK-02LR: DomText 지역 함수 재바인딩 (END)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-05: 텍스트 처리 유틸 (END)
// BLOCK-05: 텍스트 처리 유틸 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-06: 이미지 URL 수집(지연로딩/컨테이너/IMG 전부) (START)
// ===== BLOCK-06: 이미지/본문 수집 (START)
// ─────────────────────────────────────────────────────────────────────────────
function parseSrcset(ss) {                                                  // srcset 파서
  try {                                                                      // 예외 보호
    const parts = ss.split(",").map(s => s.trim()).filter(Boolean);          // 항목 분해
    let best = ""; let bestW = 0;                                            // 최고 후보/폭
    for (const p of parts) {                                                 // 각 항목
      const [u, w] = p.split(/\s+/);                                         // URL/폭 문자열
      const m = (w || "").match(/(\d+)w/);                                   // 숫자 폭 매칭
      const ww = m ? (+m[1]) : 0;                                            // 폭 숫자화
      if (ww >= bestW) { bestW = ww; best = u; }                             // 최댓값 갱신
    }                                                                         // for 끝
    return best || parts[0] || "";                                           // 가장 큰 것 반환
  } catch { return ""; }                                                     // 실패시 빈값
}                                                                            // parseSrcset 끝

function guessUrlFromAttrs(el) {                                            // 임의 data-* 등에서 URL 추정
  for (const a of Array.from(el.attributes || [])) {                          // 속성 순회
    const v = (a.value || "").trim();                                        // 값
    const m = v.match(/^https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|avif)(?:[?#][^\s"']*)?$/i); // 확장자 매칭
    if (m) return m[0];                                                       // 매칭시 URL 반환
  }                                                                           // for 끝
  return "";                                                                 // 없으면 빈값
}                                                                            // guessUrlFromAttrs 끝

function toAbs(u) {                                                         // 절대 URL 변환
  try { return new URL(u, location.href).href; } catch { return u; }         // 변환 실패시 원본
}                                                                            // toAbs 끝

function collectImageUrlsFlexible(selectors) {                               // 유연 수집(라이브러리 우선)
  try {                                                                        // [추가] 라이브러리 경로 우선 사용
    if (window.DWLib && window.DWLib.Image && typeof window.DWLib.Image.collect === 'function') {
      return window.DWLib.Image.collect(selectors);                             // 라이브러리 호출
    }
  } catch (e) { try { console.warn('[Downloader] Image.collect bridge', e); } catch {} }
  const urls = new Set();                                                     // 중복 제거용
  for (const sel of selectors || []) {                                        // 선택자 순회
    if (!sel) continue;                                                       // 공백 스킵
    const nodes = document.querySelectorAll(sel);                             // 노드 모아오기
    nodes.forEach(node => {                                                   // 각 노드
      if ((node.tagName || "").toUpperCase() === "IMG") {                     // IMG 직접 선택
        const ds  = node.getAttribute("data-src") || node.getAttribute("data-original") || ""; // lazy 속성
        const ss  = node.getAttribute("srcset") || "";                        // srcset
        const cur = node.currentSrc || "";                                    // currentSrc
        const s   = node.getAttribute("src") || "";                           // src
        const any = guessUrlFromAttrs(node);                                  // 임의 data-* 추정
        const best = ds || (ss ? parseSrcset(ss) : "") || cur || s || any;    // 우선순위 선택
        if (best) urls.add(toAbs(best));                                      // URL 추가
      } else {                                                                // 컨테이너 선택
        node.querySelectorAll("img").forEach(im => {                          // 내부 IMG 모두
          const ds  = im.getAttribute("data-src") || im.getAttribute("data-original") || "";
          const ss  = im.getAttribute("srcset") || "";
          const cur = im.currentSrc || "";
          const s   = im.getAttribute("src") || "";
          const any = guessUrlFromAttrs(im);
          const best = ds || (ss ? parseSrcset(ss) : "") || cur || s || any;
          if (best) urls.add(toAbs(best));
        });                                                                    // forEach 끝
      }                                                                         // if-else 끝
    });                                                                         // nodes.forEach 끝
  }                                                                             // for(sel) 끝
  if (urls.size === 0) {                                                        // 폴백(뉴토끼 경로 전역)
    document.querySelectorAll("img[src*='/data/file/webtoon/'], img[data-src*='/data/file/webtoon/'], img[srcset*='/data/file/webtoon/']")
      .forEach(im => {                                                          // 매칭 IMG 순회
        const ds  = im.getAttribute("data-src") || im.getAttribute("data-original") || "";
        const ss  = im.getAttribute("srcset") || "";
        const cur = im.currentSrc || "";
        const s   = im.getAttribute("src") || "";
        const any = guessUrlFromAttrs(im);
        const best = ds || (ss ? parseSrcset(ss) : "") || cur || s || any;
        if (best) urls.add(toAbs(best));
      });                                                                       // forEach 끝
  }                                                                             // 폴백 끝
  return Array.from(urls);                                                      // 배열로 반환
}                                                                              // collectImageUrlsFlexible 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-06: 이미지/본문 수집 (END)
// BLOCK-06: 이미지 URL 수집(지연로딩/컨테이너/IMG 전부) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-07: 파일 IO(FSA) (START)
// ===== BLOCK-07: 파일 IO(FSA) (START)
// ─────────────────────────────────────────────────────────────────────────────
async function ensureDir(base, path) {                                      // 하위 디렉토리 확보
  const parts = path.split("/").filter(Boolean);                              // 경로 분해
  let dir = base;                                                             // 현재 디렉토리
  for (const p of parts) {                                                    // 각 파트
    dir = await dir.getDirectoryHandle(p, { create: true });                  // 없으면 생성
  }                                                                           // for 끝
  return dir;                                                                 // 최종 디렉토리 반환
}                                                                              // ensureDir 끝

async function writeFile(fileHandle, text) {                                 // 파일 덮어쓰기
  const ws = await fileHandle.createWritable();                                // 쓰기 스트림
  await ws.write(text);                                                        // 쓰기
  await ws.close();                                                            // 닫기
}                                                                              // writeFile 끝

async function appendText(fileHandle, text) {                                 // 파일에 append
  const file = await fileHandle.getFile();                                     // 기존 파일
  const size = file.size;                                                      // 크기
  const ws = await fileHandle.createWritable({ keepExistingData: true });      // 기존 데이터 유지
  await ws.seek(size);                                                         // 끝으로 이동
  await ws.write(text);                                                        // 추가 쓰기
  await ws.close();                                                            // 닫기
}                                                                              // appendText 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-07: 파일 IO(FSA) (END)
// BLOCK-07: 파일 IO(FSA) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-08: 로그(JSONL) 작성 (START)
// ===== BLOCK-08: 로그(JSONL) 작성 (START)
// ─────────────────────────────────────────────────────────────────────────────
async function writeActivityLog(record) {                                    // 로그 1줄 기록(라이브러리 우선)
  try {                                                                        // 예외 보호
    if (window.DWLib && window.DWLib.Log && typeof window.DWLib.Log.writeActivity === 'function') {
      await window.DWLib.Log.writeActivity(record);                            // 라이브러리로 기록
      return;                                                                  // 종료
    }
  } catch (e) { try { console.warn('[Downloader]', e); } catch{} }             // 경고 로그
  try {                                                                        // 폴백: 기존 로직
    if (!state.logEnabled) return;                                             // 로그 OFF면 종료
    if (!state.seriesDirHandle) return;                                        // 폴더 없으면 종료
    const logsDir = await ensureDir(state.seriesDirHandle, 'logs');            // logs/
    const fh = await logsDir.getFileHandle('activity.jsonl', { create: true }); // 파일 핸들
    await appendText(fh, JSON.stringify(record) + '\n');                      // JSONL append
  } catch (e) { try { console.warn('[Downloader] log', e); } catch{} }          // 오류 로그
}                                                                              // writeActivityLog 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-08: 로그(JSONL) 작성 (END)
// BLOCK-08: 로그(JSONL) 작성 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-09: 패널 UI/섀도우/탭/라벨 (START)
// ===== BLOCK-09 09-01: Shadow Root (START)
/**
 * BLOCK-09: 섀도우 루트 보장                                                  // UI를 Shadow DOM에 격리
 * @returns {ShadowRoot|null}                                                  // 섀도우 루트 또는 null
 */
function ensureShadowRoot() {
  if (state.shadowRoot && state.shadowHost && document.contains(state.shadowHost)) return state.shadowRoot;
  const host = document.getElementById('dj-shadow-host') || document.createElement('div'); // 호스트 재사용/생성
  host.id = 'dj-shadow-host'; // ID 지정
  host.style.position = 'fixed'; // 전체 고정
  host.style.inset = '0'; // 화면 전체
  host.style.zIndex = '2147483647'; // 최상단
  host.style.pointerEvents = 'none'; // 클릭 통과(내부 요소에서만 처리)
  if (!host.isConnected) document.documentElement.appendChild(host); // 문서 부착
  const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }); // 섀도우 루트 확보
  if (!sr.getElementById('dj-style')) {
    const style = document.createElement('style');
    style.id = 'dj-style';
    style.textContent = `
      * { box-sizing: border-box; font-family: ui-sans-serif, Apple SD Gothic Neo, Inter, system-ui, sans-serif; }
      #dj-panel { position: fixed; left: 60px; top: 120px; width: 600px; max-height: 70vh; overflow: auto;
        background: rgba(31,31,31,.85); color: #eee; border: 1px solid #444; border-radius: 12px;
        backdrop-filter: blur(2px); font-size: 14px; line-height: 1.4; }
      #dj-mini { position: fixed; right: 14px; bottom: 14px; display: flex; gap: 8px; align-items: center;
        background: rgba(30,30,30,.85); color: #eee; border: 1px solid #444; border-radius: 24px; padding: 6px 10px; }
      .dj-row { display:flex; align-items:center; gap:8px; margin:6px 0; flex-wrap:wrap; }
      .dj-btn { padding: 6px 10px; border: 1px solid #555; border-radius: 6px; cursor: pointer; background: #2b2b2b; color: #fff; }
      #dj-save, #dj-quick-save { background: #2ecc71; color: #001; font-weight: 600; }
      input[type="text"], input[type="number"], input:not([type]) { padding: 4px 6px; border: 1px solid #555; border-radius: 6px; background:#222; color:#eee; }
      small { color: #bbb; }
      .path{margin-left:8px;color:#8ec07c;font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle}
      .tab-nav { display:flex; gap:8px; padding:8px 12px; border-bottom:1px solid #333; }
      .tab-btn { padding:6px 10px; border:1px solid #555; border-radius:6px; background:#2b2b2b; color:#fff; cursor:pointer; }
      .tab-btn.active { background:#2ecc71; color:#001; font-weight:600; }
      .tab-pane[hidden] { display:none; }
      .list { display:flex; flex-direction:column; gap:6px; }
      .list .row { display:flex; gap:6px; align-items:center; }
      .list .row input { flex:1; }
    `;
    sr.appendChild(style); // 스타일 1회 주입
  }
  // 최신 규칙 강제 적용: 보조 스타일 태그를 별도로 두어 여백/폭을 항상 덮어쓴다.         // [추가]
  let styleExtra = sr.getElementById('dj-style-extra');                         // 보강 스타일 태그 조회
  if (!styleExtra) {                                                            // 없으면 생성
    styleExtra = document.createElement('style');                               // 새 스타일 태그
    styleExtra.id = 'dj-style-extra';                                           // ID 지정
    sr.appendChild(styleExtra);                                                 // 섀도우에 부착
  }
  styleExtra.textContent = `
    .tab-pane { padding: 12px 18px; }   /* 탭 컨텐츠 좌우 여백(보통) */
    .dj-row { margin: 8px 0; }          /* 행 간격 완화(+2px) */
    .path { max-width: 520px; }         /* 경로 라벨 폭 확대 */
  `;                                                                            // 항상 최신으로 덮어쓰기
  state.shadowHost = host; state.shadowRoot = sr; return sr; // 상태 저장 후 반환
}
// ===== BLOCK-09 09-01: Shadow Root (END)
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-01C: 스타일 통합(Shadow DOM 내 규칙 일원화) (START)                   // [추가] 스타일 중복을 한 곳으로 통합
// ===== BLOCK-01C: 스타일 통합(Shadow DOM 내 규칙 일원화) (START)
// ─────────────────────────────────────────────────────────────────────────────
function consolidateStylesInShadow(){                                         // 섀도우 내 스타일 통합 함수
  try {                                                                        // 예외 보호
    const sr = state.shadowRoot || null;                                       // 섀도우 루트 참조
    if (!sr) return;                                                           // 없으면 종료
    // 이미 병합 스타일이 있으면 스킵
    if (!sr.getElementById('dj-style-merged')) {                                // 병합 스타일 미존재 시만
      const style = document.createElement('style');                            // 새 style 생성
      style.id = 'dj-style-merged';                                             // id 지정
      style.textContent = `                                                     /* 병합 CSS 시작 */
        /* 탭/패널 기본 레이아웃 및 숨김 규칙 */
        .tab-nav { display:flex; gap:8px; padding:8px 12px; border-bottom:1px solid #333; }
        .tab-btn { padding:6px 10px; border:1px solid #555; border-radius:6px; background:#2b2b2b; color:#fff; cursor:pointer; }
        .tab-btn.active { background:#2ecc71; color:#001; font-weight:600; }
        .tab-pane[hidden] { display:none !important; }
        /* 내부 여백/간격 일원화 */
        .dj-pane-inner { padding: 8px 10px; }
        .tab-pane { padding: 12px 18px; }
        .dj-row { margin: 8px 0; }
        .path { max-width: 520px; }
      `;                                                                        // CSS 본문
      sr.appendChild(style);                                                    // 섀도우에 부착
    }
    // 보조 스타일(#dj-style-extra)이 있다면 제거(병합 완료로 불필요)
    const styleExtra = sr.getElementById('dj-style-extra');                     // 보조 스타일 조회
    if (styleExtra && styleExtra.parentNode) {                                   // 존재하면
      styleExtra.parentNode.removeChild(styleExtra);                             // 제거
    }
  } catch (e) { console.warn('[Downloader] consolidateStylesInShadow', e); }    // 예외 로그
}                                                                                // consolidateStylesInShadow 끝
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-01C: 스타일 통합(Shadow DOM 내 규칙 일원화) (END)
// ===== BLOCK-01C: 스타일 통합(Shadow DOM 내 규칙 일원화) (END)
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-09 09-02: Panel Mount (START)
function ensurePanel() {                                                     // 패널 생성/보이기
  if (state.panelEl) { state.panelEl.style.display = "block"; return; }       // 이미 있으면 표시만
  const __sr = ensureShadowRoot();
  const wrap = document.createElement("div");                                  // 컨테이너
  wrap.id = "dj-panel";                                                        // ID
  wrap.style.cssText = "position:fixed;left:60px;top:120px;width:600px;max-height:70vh;overflow:auto;background:#1f1f1fcc;color:#eee;border:1px solid #444;border-radius:12px;z-index:2147483647;backdrop-filter:blur(2px);font-family:ui-sans-serif,Apple SD Gothic Neo,Inter;font-size:14px;line-height:1.4;box-sizing:border-box;pointer-events:auto;"; // 스타일
  wrap.innerHTML = `                                                           <!-- 내부 HTML -->
    <div id="dj-head" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #333;cursor:move;">
      <b style="flex:1">Downloader • 수동 캡처</b>                           <!-- 타이틀 -->
      <button id="dj-min" class="dj-btn">최소화</button>                      <!-- 최소화 -->
      <button id="dj-close" class="dj-btn">닫기</button>                       <!-- 닫기 -->
    </div>
    <div id="dj-body" style="padding:10px 12px;">
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">작품명 <input id="dj-series" style="width:70%" placeholder="작품명"></div> <!-- 작품명 -->
      <div class="dj-row" id="dj-title-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">제목칸</div>
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">구분자 <input id="dj-joiner" value=" | " style="width:120px"></div>         <!-- 구분자 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">본문/이미지 선택자(쉼표로 구분) <input id="dj-csel" placeholder=".v28b..., .view-content, .v28b... > img"></div> <!-- 선택자 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;"><label><input type="checkbox" id="dj-img" checked> 이미지 저장</label></div> <!-- 이미지 저장 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;"><label><input type="checkbox" id="dj-log" checked> 로그 기록(JSONL)</label></div> <!-- 로그 기록 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">지연(초) <input id="dj-delay" type="number" min="0" value="5" style="width:80px"> ± <input id="dj-jitter" type="number" min="0" value="2" style="width:80px"></div> <!-- 지연 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;">폴더 <button id="dj-pick-root" class="dj-btn" style="padding:4px 8px;border:1px solid #555;background:#2b2b2b;color:#fff;border-radius:6px;">루트 선택</button> <span id="dj-root-label" class="path">(미선택)</span> <button id="dj-pick-series" class="dj-btn" style="padding:4px 8px;border:1px solid #555;background:#2b2b2b;color:#fff;border-radius:6px;">작품 폴더 선택</button> <span id="dj-series-label" class="path">(미선택)</span></div> <!-- 폴더 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;"><button id="dj-save" class="dj-btn" style="padding:6px 10px;border:1px solid #555;background:#2ecc71;color:#001;border-radius:6px;font-weight:600;">저장(추가)</button></div>                <!-- 저장 버튼 -->
      <div class="dj-row" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;"><small>TIP: 뉴토끼는 컨테이너(.v28b...) 또는 &gt; img 둘 다 입력해 두면 안전합니다.</small></div> <!-- 팁 -->
    </div>
  `;                                                                            // innerHTML 끝
  if (__sr) { __sr.appendChild(wrap); } else { document.documentElement.appendChild(wrap); } // 문서에 추가
  state.panelEl = wrap;                                                         // 참조 보관
  makeDraggable(wrap, wrap.querySelector("#dj-head"));                         // 드래그 활성화
  try { consolidateStylesInShadow(); } catch {}                                  // [추가] 섀도우 스타일 통합 수행

  // ── 탭 레이아웃 구성 ─────────────────────────────────────────
  const body = wrap.querySelector('#dj-body');
  // [보강] 프리뷰 함수 선선언(호이스팅 문제 회피). 이후 실제 구현으로 재할당됨.
  let refreshPreview = () => {};                                               // 초기 더미 구현
  // ===== BLOCK-09 09-03: Tabs & Panes (START)
  const nav = document.createElement('div'); nav.className = 'tab-nav';
  nav.innerHTML = `
    <button class="tab-btn" data-tab="content">내용</button>
    <button class="tab-btn" data-tab="selectors">선택자</button>
    <button class="tab-btn" data-tab="settings">설정</button>
    <button class="tab-btn" data-tab="range">범위</button>`;                 // [추가] 범위 탭 버튼
  wrap.insertBefore(nav, body);
  const paneContent  = document.createElement('div'); paneContent.id='tab-content'; paneContent.className='tab-pane'; paneContent.dataset.tab='content';
  const paneSelectors= document.createElement('div'); paneSelectors.id='tab-selectors'; paneSelectors.className='tab-pane'; paneSelectors.dataset.tab='selectors';
  const paneSettings = document.createElement('div'); paneSettings.id='tab-settings'; paneSettings.className='tab-pane'; paneSettings.dataset.tab='settings';
  const paneRange    = document.createElement('div'); paneRange.id='tab-range'; paneRange.className='tab-pane'; paneRange.dataset.tab='range'; paneRange.setAttribute('hidden',''); // [추가] 범위 탭 패널
  body.parentNode.insertBefore(paneSettings, body.nextSibling);
  body.parentNode.insertBefore(paneSelectors, body);
  body.parentNode.insertBefore(paneContent, body);
  body.parentNode.insertBefore(paneRange, body);                                 // [추가] 범위 탭 패널 삽입(내용 앞)
  try { paneContent.hidden = true; paneSelectors.hidden = true; paneSettings.hidden = true; paneRange.hidden = true; } catch {} // [보강] 초기 전부 숨김
  body.style.display = 'none';                                                // 원본 컨테이너 숨김
  // ===== BLOCK-09 09-03: Tabs & Panes (END)

  // ===== BLOCK-09 09-03r: 범위 탭 초기 콘텐츠 (START)                        // [추가] 범위 탭 안내만 1차 배치
  (function seedRangePane(){                                                    // IIFE
    try {
      const box = document.createElement('div');                                 // 안내 박스
      box.style.cssText='display:flex;flex-direction:column;gap:8px';           // 레이아웃
      const h = document.createElement('div'); h.style.cssText='font-weight:600'; h.textContent='범위 저장'; // 제목
      const d = document.createElement('div'); d.style.cssText='font-size:12px;color:#bbb'; d.textContent='끝까지 이동하며 저장, 현재 페이지부터 N개 저장 기능을 여기에 연결합니다.'; // 설명
      const row1 = document.createElement('div'); row1.className='dj-row';       // [추가] 버튼 행(단일 저장)
      const btnScrollSave = document.createElement('button');                    // [추가] 버튼 생성
      btnScrollSave.id = 'dj-range-save-scroll';                                 // [추가] id
      btnScrollSave.className = 'dj-btn';                                        // [추가] 클래스
      btnScrollSave.textContent = '끝까지 이동하며 저장';                        // [추가] 라벨
      row1.appendChild(btnScrollSave);                                          // [추가] 행에 버튼 배치

      const row2 = document.createElement('div'); row2.className='dj-row';       // [추가] 배치 저장 행
      const lblN = document.createElement('span'); lblN.textContent = '개수';    // [추가] 라벨
      const inpN = document.createElement('input'); inpN.type='number'; inpN.id='dj-batch-count'; inpN.min='1'; inpN.value='3'; inpN.style.width='90px'; // [추가] 개수 입력
      const chkScroll = document.createElement('label');                          // [추가] 스크롤 체크
      const chk = document.createElement('input'); chk.type='checkbox'; chk.id='dj-batch-scroll'; chk.checked=true; // [추가] 체크박스
      chkScroll.append(chk, document.createTextNode(' 스크롤하며 저장'));         // [추가] 라벨 텍스트
      const btnBatchStart = document.createElement('button'); btnBatchStart.id='dj-batch-start'; btnBatchStart.className='dj-btn'; btnBatchStart.textContent='N개 저장 시작'; // [추가]
      const btnBatchCancel = document.createElement('button'); btnBatchCancel.id='dj-batch-cancel'; btnBatchCancel.className='dj-btn'; btnBatchCancel.textContent='중단'; // [추가]
      row2.append(lblN, inpN, chkScroll, btnBatchStart, btnBatchCancel);         // [추가] 조립

      const rowStatus = document.createElement('div'); rowStatus.className='dj-row'; // [추가] 상태 표시 행
      const status = document.createElement('small'); status.id='dj-range-status'; status.textContent='대기 중'; // [추가] 상태 라벨
      rowStatus.appendChild(status);                                            // [추가] 부착

      box.append(h,d,row1,row2,rowStatus);                                      // 조립(안내+버튼들+상태)
      paneRange.appendChild(box);                                                // 범위 패널에 추가

      // [추가] 이벤트: 끝까지 스크롤 후 저장 실행
      btnScrollSave.onclick = async () => {                                      // 클릭 핸들러
        try { status.textContent = '스크롤 중...'; } catch {}
        try {                                                                     // 스크롤 라이브러리 경로
          if (window.DWLib && window.DWLib.Scroll && typeof window.DWLib.Scroll.autoScrollDownUp==='function') {
            await window.DWLib.Scroll.autoScrollDownUp({ patchLazy: true, pause: 120, bottomHold: 300 }); // 자동 스크롤
          } else {                                                                // 폴백: 간단 스크롤
            const H = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); window.scrollTo(0, H); await sleep(600);
          }
          status.textContent = '저장 중...';                                      // 상태 갱신
          await onManualAdd();                                                    // 저장 실행
          status.textContent = '완료';                                           // 완료 라벨
        } catch (e) { try { status.textContent = '오류'; } catch {}; console.warn('[Downloader] 범위 저장', e); }
      };                                                                          // onclick 끝

      // [추가] 배치 저장 시작/중단 이벤트
      btnBatchStart.onclick = async () => {                                       // 시작 클릭
        try {
          const n = Math.max(1, parseInt(inpN.value, 10) || 1);                  // 개수 파싱
          const remainMoves = Math.max(0, n - 1);                                 // 남은 이동 횟수(N-1)
          const withScroll = !!chk.checked;                                      // 스크롤 여부
          const delayMs = (state && state.autoNextDelayMs) ? state.autoNextDelayMs : 2000; // 지연
          // 저장할 배치 작업 상태 보관
          const job = { remaining: remainMoves, withScroll, delayMs, startedAt: Date.now() }; // 배치 작업
          if (chrome?.storage?.local?.set) await chrome.storage.local.set({ dj_batch_job: job }); // 저장
          status.textContent = `배치 시작: ${n}개 (이동 ${remainMoves}회)`;         // 상태 표시
          // 첫 페이지 처리: 선택 시 스크롤 → 저장
          if (withScroll && window.DWLib?.Scroll?.autoScrollDownUp) {
            status.textContent = '스크롤 중...';
            await window.DWLib.Scroll.autoScrollDownUp({ patchLazy: true, pause: 120, bottomHold: 300 });
          }
          status.textContent = '저장 중...';
          await onManualAdd();                                                   // 저장 실행 → 래핑 후크에서 다음 페이지 이동 처리
          status.textContent = '완료(계속 중)';                                  // 진행 중 상태
        } catch (e) { console.warn('[Downloader] 배치 시작 실패', e); try { status.textContent='배치 시작 오류'; } catch{} }
      };

      btnBatchCancel.onclick = async () => {                                     // 중단 클릭
        try { if (chrome?.storage?.local?.remove) await chrome.storage.local.remove('dj_batch_job'); } catch {}
        try { if (chrome?.storage?.local?.remove) await chrome.storage.local.remove('dj_auto_next_job'); } catch {}
        status.textContent = '배치 중단';                                         // 상태 표시
      };
    } catch(e){ console.warn('[Downloader] seedRangePane', e); }
  })();                                                                          // seedRangePane 끝
  // ===== BLOCK-09 09-03r: 범위 탭 초기 콘텐츠 (END)

  const byId = (id)=>wrap.querySelector('#'+id);                               // ID 헬퍼(패널 내부 전용)
  const rowOf = (id)=>{ const el = byId(id); return el? el.closest('.dj-row'): null }; // 행 찾기(상위 .dj-row)
  const safeMove = (id, pane)=>{                                               // [보강] 행 이동 안전 래퍼
    try { const row = rowOf(id); if (row && pane) pane.appendChild(row); } catch(e){ console.warn('[Downloader][tabs] moveRow', id, e); }
  };                                                                            // safeMove 끝
  // move rows to tabs
  safeMove('dj-series', paneSelectors);
  // 제목칸 행 전체 이동
  const titleRow = wrap.querySelector('#dj-title-row');
  try { if (titleRow) paneSelectors.appendChild(titleRow); } catch(e){ console.warn('[Downloader][tabs] titleRow', e); }
  safeMove('dj-joiner', paneSelectors);
  safeMove('dj-csel', paneSelectors);
  const rSel = rowOf('dj-csel'); if (rSel) rSel.style.display='none';           // 단일 입력은 숨김(호환용)
  safeMove('dj-img', paneSettings);                                            // 이미지 저장은 설정 탭으로 분리
  safeMove('dj-log', paneSettings);
  safeMove('dj-delay', paneSettings);
  safeMove('dj-jitter', paneSettings);
  safeMove('dj-pick-root', paneSettings);
  safeMove('dj-pick-series', paneSettings);
  safeMove('dj-save', paneSettings);

  // ===== BLOCK-09 09-05: Folder Controls & Labels (START)
  // 설정 탭: 1) 전체 경로, 2) 폴더 이름, 3) 버튼들 배치
  const rowPath = document.createElement('div'); rowPath.className='dj-row';
  rowPath.innerHTML = '<b>전체 경로</b> <span id="dj-path-full" class="path">(루트 미선택)</span>';
  paneSettings.insertBefore(rowPath, paneSettings.firstChild);

  const rowName = document.createElement('div'); rowName.className='dj-row';
  rowName.innerHTML = '<b>폴더 이름</b> <span id="dj-folder-name" class="path">(폴더명 미지정)</span>';
  paneSettings.insertBefore(rowName, paneSettings.firstChild.nextSibling);

  const rowBtns = document.createElement('div'); rowBtns.className='dj-row';
  rowBtns.innerHTML = [
    '<button id="dj-change-location" class="dj-btn">폴더 변경>',
    '<button id="dj-edit-foldername" class="dj-btn">폴더명 수정>',
    '<button id="dj-title-foldername" class="dj-btn">폴더명 초기화</button>'
  ].join(' ');
  paneSettings.insertBefore(rowBtns, rowName.nextSibling);

  // 기존 직접 작품 선택 행은 감춤(입력/버튼 기반으로 일원화)
  const pickSeriesRow = rowOf('dj-pick-series');
  if (pickSeriesRow) pickSeriesRow.style.display = 'none';
  // ===== BLOCK-09 09-05: Folder Controls & Labels (END)

  // ===== BLOCK-09 09-07: Preview (START)
  // 프리뷰 영역 추가
  const prevCtl = document.createElement('div'); prevCtl.className='dj-row';
  prevCtl.innerHTML = '<button id="dj-preview-refresh" class="dj-btn">미리보기 갱신</button>';
  paneContent.appendChild(prevCtl);
  const preview = document.createElement('div'); preview.id='dj-preview'; preview.style.cssText='white-space:pre-wrap;background:#111;border:1px solid #333;border-radius:8px;padding:8px;max-height:240px;overflow:auto;';
  paneContent.appendChild(preview);

  // 선택자 탭: 동적 리스트 UI
  // ===== BLOCK-09 09-04: Selector Lists (START)                               // 선택자 리스트/템플릿
  const DEFAULT_BODY_SELECTORS = [
    '.view-content', '.viewer', '[id*=view]'
  ];
  const DEFAULT_IMG_SELECTORS = [
    '.view-content > img', '.viewer img', 'img[data-src]', 'img[srcset]'
  ];
  const uniq = (arr)=>Array.from(new Set((arr||[]).map(s=>String(s||'').trim()).filter(Boolean)));

  const mkList = (id,label,items,kind)=>{                                     // 동적 리스트 생성기(본문/이미지)
    const title = document.createElement('div'); title.style.cssText='margin:10px 0 6px;font-weight:600'; title.textContent=label; // 타이틀
    const list = document.createElement('div'); list.id=id; list.className='list'; // 리스트 컨테이너
    const ctrls = document.createElement('div'); ctrls.className='dj-row';    // 상단 공용 컨트롤(유지)
    const add = document.createElement('button'); add.id=id+'-add'; add.className='dj-btn'; add.textContent='추가'; // 전체 추가
    const del = document.createElement('button'); del.id=id+'-del'; del.className='dj-btn'; del.textContent='삭제'; // 전체 삭제
    ctrls.append(add, del);                                                   // 컨트롤 묶음
    const pane = id.includes('body')||id.includes('img')? paneSelectors: paneContent; // 배치 대상 패널
    pane.append(title,list,ctrls);                                            // 패널에 삽입
    const countFor = (sel)=>{
      try { return sel? document.querySelectorAll(sel).length : 0; } catch { return 0; }
    };
    const render = ()=>{                                                      // 리스트 다시 그리기
      list.innerHTML='';                                                      // 기존 행 비우기
      items.forEach((v,i)=>{                                                  // 각 항목 렌더링
        const row=document.createElement('div'); row.className='row';         // 행 컨테이너
        const inp=document.createElement('input'); inp.type='text';           // 입력창
        inp.value=v||'';                                                      // 값 설정
        inp.placeholder=(id.includes('body')?'컨테이너 선택자':'IMG 선택자'); // 플레이스홀더
        const badge=document.createElement('span');                           // 매칭 개수 배지
        badge.style.cssText='min-width:70px;text-align:right;color:#8ec07c';  // 배지 스타일
        badge.textContent=countFor(inp.value)+"개";                            // 현재 매칭 수
        const used=document.createElement('span');                            // 사용중 뱃지
        used.style.cssText='margin-left:6px;padding:2px 6px;border-radius:10px;font-size:12px;background:#2ecc71;color:#001;display:none;'; // 스타일
        used.textContent='사용중';                                            // 라벨
        const plus=document.createElement('button'); plus.className='dj-btn'; plus.textContent='+'; // [+] 버튼
        const minus=document.createElement('button'); minus.className='dj-btn'; minus.textContent='-'; // [-] 버튼

        inp.oninput=(e)=>{                                                    // 입력 변경 시
          items[i]=e.target.value;                                            // 배열 반영
          badge.textContent=countFor(e.target.value)+"개";                     // 배지 갱신
          syncSelectors(); saveLocal(); refreshPreview();                      // 상태/미리보기 동기화
        };
        plus.onclick=()=>{                                                    // [+] 클릭
          items.splice(i+1,0,'');                                             // 아래에 빈 줄 삽입
          syncSelectors(); saveLocal(); render(); refreshPreview();            // 동기화/렌더/미리보기
        };
        minus.onclick=()=>{                                                   // [-] 클릭
          if(items.length>1) items.splice(i,1); else items[0]='';             // 최소 1행 유지
          syncSelectors(); saveLocal(); render(); refreshPreview();            // 동기화/렌더/미리보기
        };
        const isUsed = (kind==='body' ? (state.lastUsed.body||[]).includes(v) : (state.lastUsed.img||[]).includes(v)); // 사용중 여부
        used.style.display = isUsed? 'inline-block' : 'none';                  // 사용중 뱃지 토글
        row.append(inp,badge,used,plus,minus); list.append(row);               // 행 구성/추가
      });
    };
    add.onclick = () => {                                    // [수정] 추가 버튼 동작
      items.push('');                                        // 선택자 한 줄 추가
      syncSelectors();                                       // 상태(contentSelectors) 즉시 동기화
      saveLocal();                                           // 로컬 저장
      render();                                              // 목록 다시 그리기
      refreshPreview();                                      // 미리보기 즉시 갱신
    };                                                       // add.onclick 끝
    del.onclick = () => {                                    // [수정] 삭제 버튼 동작
      items.pop();                                           // 선택자 한 줄 제거
      syncSelectors();                                       // 상태(contentSelectors) 즉시 동기화
      saveLocal();                                           // 로컬 저장
      render();                                              // 목록 다시 그리기
      refreshPreview();                                      // 미리보기 즉시 갱신
    };                                                       // del.onclick 끝
    render();                                                // 최초 렌더링(초기 갱신은 선언 순서 문제로 생략)
    return { render };
  };
  const syncSelectors = ()=>{ state.contentSelectors = [...(state.bodySelectors||[]), ...(state.imgSelectors||[])]; };
  // 타이틀 동적 표시(기본 3칸)
  (function setupTitleDyn(){                                                                                        // 제목칸 동적 UI 구성 IIFE
    const container = document.createElement('div'); container.id='dj-title-list'; container.className='list';      // 제목칸 리스트 컨테이너
    const ctrl = document.createElement('div'); ctrl.className='dj-row';                                            // 상단 컨트롤 행
    const add=document.createElement('button'); add.id='dj-title-add'; add.className='dj-btn'; add.textContent='추가'; // 전체 추가 버튼
    const del=document.createElement('button'); del.id='dj-title-del'; del.className='dj-btn'; del.textContent='삭제'; // 전체 삭제 버튼
    ctrl.append(add,del);                                                                                            // 컨트롤 부착
    if (titleRow) { titleRow.appendChild(container); titleRow.appendChild(ctrl); }                                   // 제목칸 영역에 삽입
    let showCount = Math.max(3, Math.min(10, (state.titleParts||[]).filter(Boolean).length||3));                    // 초기 표시 개수 계산
    state.titlePartSels = Array.isArray(state.titlePartSels) ? state.titlePartSels : [];                             // 선택자 배열 가드
    const pickText = (s)=>{                                                                                           // 선택자 → 텍스트 추출 유틸
      try{ if(!s) return ''; const n=document.querySelector(s); if(!n) return '';                                     // 가드/노드 없음
        const tag=(n.tagName||'').toUpperCase();                                                                      // 태그명
        if(tag==='META') return (n.getAttribute('content')||'').trim();                                               // <meta content>
        if(tag==='INPUT' || tag==='TEXTAREA') return (n.value||n.getAttribute('value')||'').trim();                  // form 값
        const txt=(n.innerText||n.textContent||'').trim(); if(txt) return txt;                                       // 일반 텍스트
        return (n.getAttribute('title')||n.getAttribute('alt')||'').trim();                                           // 보조 속성
      }catch{ return ''; }
    };
    const countFor=(s)=>{ try{ return s? document.querySelectorAll(s).length:0 }catch{ return 0 } };                  // 매칭 수 계산
    const render=()=>{                                                                                                // 렌더 함수
      container.innerHTML='';                                                                                        // 기존 내용 제거
      for (let i=0;i<showCount;i++){                                                                                 // 각 행 생성
        if (state.titleParts[i]===undefined) state.titleParts[i]='';                                                 // 값 가드
        if (state.titlePartSels[i]===undefined) state.titlePartSels[i]='';                                           // 선택자 가드
        const row=document.createElement('div'); row.className='row';                                                // 행 컨테이너
        const inp=document.createElement('input'); inp.type='text'; inp.value=state.titleParts[i]||'';               // 제목칸 텍스트 입력
        inp.placeholder=`타이틀 ${i+1}`;                                                                              // 플레이스홀더
        const sel=document.createElement('input'); sel.type='text'; sel.value=state.titlePartSels[i]||'';            // 제목칸 선택자 입력
        sel.placeholder='제목 선택자(CSS)';                                                                            // 힌트
        // per-row [↻]와 매칭 배지는 제거하고, 하단 합계 라인에만 [↻] 배치합니다.                       // [변경]
        const plusBtn=document.createElement('button'); plusBtn.className='dj-btn'; plusBtn.textContent='+';         // 행별 추가
        const minusBtn=document.createElement('button'); minusBtn.className='dj-btn'; minusBtn.textContent='-';      // 행별 삭제

        sel.oninput=(e)=>{                                                                                            // 선택자 변경 시
          state.titlePartSels[i]=(e.target.value||'');                                                                // 상태 반영
          saveLocal();                                                                                                // 저장
          // row 툴팁 갱신 + 합계/미리보기 반영                                                                         
          try{ const t=safePickText(state.titlePartSels[i]); row.title = t? t.slice(0,100):'매칭 없음'; }catch{ row.title='선택자 오류'; }
          try{ updateTitleCombined(); } catch(_) {}                                                                   // 합계 갱신
          try{ refreshPreview(); } catch(_) {}                                                                        // 미리보기 갱신
        };
        row.title = ( ()=>{ try{ const s=(state.titlePartSels[i]||'').trim(); if(!s) return '';                        // 툴팁 초기값
                              const t = pickText(s); return t? t.slice(0,100):'매칭 없음';
                            }catch{ return '선택자 오류' } })();
        inp.oninput=(e)=>{ state.titleParts[i]=e.target.value; saveLocal(); refreshPreview(); };                      // 텍스트 직접 입력 반영
        plusBtn.onclick=()=>{                                                                                         // 행별 [+]
          state.titleParts.splice(i+1,0,'');                                                                          // 다음 위치에 빈 칸 추가
          state.titlePartSels.splice(i+1,0,'');                                                                       // 선택자도 추가
          showCount=Math.min(20, showCount+1); saveLocal(); render();                                                 // 카운트/저장/재렌더
        };
        minusBtn.onclick=()=>{                                                                                        // 행별 [-]
          if(showCount>1){                                                                                            // 최소 1행 보장
            state.titleParts.splice(i,1); state.titlePartSels.splice(i,1); showCount=Math.max(1, showCount-1);       // 해당 행 제거
          } else { state.titleParts[0]=''; state.titlePartSels[0]=''; }                                               // 마지막 1행은 비우기
          saveLocal(); render();                                                                                      // 저장/재렌더
        };
        row.append(inp, sel, plusBtn, minusBtn); container.append(row);                                              // 행 구성(간소화) 및 추가
      }
    };
    add.onclick=()=>{ showCount=Math.min(20, showCount+1); if (state.titleParts.length<showCount) state.titleParts.push(''); if (state.titlePartSels.length<showCount) state.titlePartSels.push(''); render(); saveLocal(); }; // 전체 추가
    del.onclick=()=>{ showCount=Math.max(1, showCount-1); render(); saveLocal(); };                                    // 전체 삭제(한 칸은 유지)
    render();                                                                                                          // 초기 렌더
    // 하단 합계 라인과 전체 채우기 버튼 추가                                                                           // [추가]
    const sum = document.createElement('div'); sum.id='dj-title-combined'; sum.className='dj-row';                     // 합계 행
    const updateTitleCombined = ()=>{ sum.textContent = '모두 합친 제목: ' + collectTitleLine(); };                    // 합계 갱신
    const fillAll = document.createElement('button'); fillAll.className='dj-btn'; fillAll.textContent='↻';             // 전체 채우기
    fillAll.title='선택자들로 모든 제목칸 채우기';                                                                      // 설명
    fillAll.onclick=()=>{                                                                                            // 전체 채우기 클릭
      try{
        for(let i=0;i<state.titleParts.length;i++){                                                                  // 각 행 순회
          const t = pickText((state.titlePartSels[i]||'').trim());                                                   // 선택자 텍스트 추출
          if(t){ state.titleParts[i]=t; }                                                                             // 값 반영
        }
        saveLocal(); updateTitleCombined(); refreshPreview();                                                         // 저장/합계/미리보기
        render();                                                                                                     // 입력칸 값도 동기화
      }catch(e){ console.warn('[Downloader] title fill all', e); }
    };
    sum.appendChild(fillAll);                                                                                         // 합계 라인에 버튼 부착
    if (titleRow) titleRow.parentNode.insertBefore(sum, ctrl.nextSibling);                                            // 제목칸 블록 마지막에 표시
    // 합계 갱신을 기존 이벤트에도 연결                                                                                // [연결]
    const originalRender = render;                                                                                    // 필요시 참조(현재 직접 호출)
    // 컨트롤 버튼에 합계 갱신 추가                                                                                    // [보강]
    add.onclick = ()=>{ showCount=Math.min(20, showCount+1); if (state.titleParts.length<showCount) state.titleParts.push(''); if ((state.titlePartSels||[]).length<showCount) state.titlePartSels.push(''); render(); saveLocal(); updateTitleCombined(); refreshPreview(); };
    del.onclick = ()=>{ showCount=Math.max(1, showCount-1); render(); saveLocal(); updateTitleCombined(); refreshPreview(); };
    updateTitleCombined();                                                                                             // 초기 합계 표시
  })();

  // 초기 목록값
  if (!Array.isArray(state.bodySelectors) || !state.bodySelectors.length) state.bodySelectors = [...(state.contentSelectors||[])];
  if (!Array.isArray(state.imgSelectors)) state.imgSelectors = [];
  // [삭제] 요청에 따라 템플릿 버튼(기본 추가: 뉴토끼/일반) 제거됨

  // UI 공통 빌더가 있으면 사용, 없으면 기존 mkList 사용                        // [추가] 라이브러리 우선
  const mkListLib = (window.DWLib && window.DWLib.UI && typeof window.DWLib.UI.mkList==='function') ? window.DWLib.UI.mkList : null; // 빌더 참조
  const bodyListCtrl = mkListLib
    ? mkListLib({ id:'dj-body-list', label:'본문 선택자', items: state.bodySelectors, kind:'body', paneSelectors, paneContent, syncSelectors, saveLocal, refreshPreview })
    : mkList('dj-body-list','본문 선택자', state.bodySelectors, 'body');
  const imgListCtrl  = mkListLib
    ? mkListLib({ id:'dj-img-list',  label:'이미지 선택자', items: state.imgSelectors,  kind:'img',  paneSelectors, paneContent, syncSelectors, saveLocal, refreshPreview })
    : mkList('dj-img-list','이미지 선택자', state.imgSelectors, 'img');

  // ===== BLOCK-09 09-04b: 다음 링크 선택자 리스트 (START)                    // [추가] 자동 이동용 다음 링크 선택자 UI
  (function setupNextLinkList(){                                               // IIFE로 스코프 한정
    try {                                                                       // 예외 보호
      state.nextLinkSels = Array.isArray(state.nextLinkSels) ? state.nextLinkSels : []; // 상태 가드
      const title = document.createElement('div');                               // 섹션 제목
      title.style.cssText='margin:12px 0 6px;font-weight:600';                   // 스타일
      title.textContent='다음 링크 선택자';                                       // 라벨
      const tip = document.createElement('div');                                 // 설명
      tip.style.cssText='font-size:12px;color:#bbb;margin:-2px 0 8px';           // 설명 스타일
      tip.textContent='가능하면 <a href> 요소를 가리키는 선택자를 사용하세요. 버튼류는 실패할 수 있습니다.'; // 안내 문구
      const list = document.createElement('div'); list.id='dj-next-list'; list.className='list'; // 리스트 컨테이너
      const ctrls = document.createElement('div'); ctrls.className='dj-row';     // 상단 컨트롤
      const add = document.createElement('button'); add.className='dj-btn'; add.textContent='추가'; // 추가 버튼
      const del = document.createElement('button'); del.className='dj-btn'; del.textContent='삭제'; // 삭제 버튼
      ctrls.append(add, del);                                                    // 컨트롤 묶음
      paneSelectors.append(title, tip, list, ctrls);                             // 선택자 탭에 배치

      const countFor = (sel)=>{ try{ return sel? document.querySelectorAll(sel).length:0 }catch{ return 0 } }; // 매칭 수 헬퍼
      const render = ()=>{                                                       // 렌더 함수
        list.innerHTML='';                                                       // 초기화
        (state.nextLinkSels.length? state.nextLinkSels : ['']).forEach((v,i)=>{  // 최소 1행 유지
          if (state.nextLinkSels[i]===undefined) state.nextLinkSels[i]=String(v||''); // 값 가드
          const row=document.createElement('div'); row.className='row';          // 행
          const inp=document.createElement('input'); inp.type='text';            // 입력
          inp.value=state.nextLinkSels[i]||'';                                   // 값
          inp.placeholder='다음 링크 선택자(CSS)';                               // 힌트
          const badge=document.createElement('span');                             // 매칭 수 배지
          badge.style.cssText='min-width:70px;text-align:right;color:#8ec07c';
          badge.textContent=countFor(inp.value)+'개';                             // 카운트
          const plus=document.createElement('button'); plus.className='dj-btn'; plus.textContent='+'; // [+]
          const minus=document.createElement('button'); minus.className='dj-btn'; minus.textContent='-'; // [-]
          inp.oninput=(e)=>{ state.nextLinkSels[i]=e.target.value; badge.textContent=countFor(e.target.value)+'개'; saveLocal(); }; // 입력 반영
          plus.onclick=()=>{ state.nextLinkSels.splice(i+1,0,''); saveLocal(); render(); }; // 행 추가
          minus.onclick=()=>{ if(state.nextLinkSels.length>1){ state.nextLinkSels.splice(i,1);} else { state.nextLinkSels[0]=''; } saveLocal(); render(); }; // 행 삭제
          row.append(inp,badge,plus,minus); list.append(row);                    // 조립
        });
      };
      add.onclick=()=>{ state.nextLinkSels.push(''); saveLocal(); render(); };   // 전체 추가
      del.onclick=()=>{ if(state.nextLinkSels.length>1) state.nextLinkSels.pop(); else state.nextLinkSels[0]=''; saveLocal(); render(); }; // 전체 삭제
      render();                                                                  // 초기 렌더
    } catch(e) { console.warn('[Downloader] nextLink list', e); }                // 예외 로그
  })();                                                                          // setupNextLinkList 끝
  // ===== BLOCK-09 09-04b: 다음 링크 선택자 리스트 (END)

  // [삭제] 템플릿 적용 로직 제거(불필요)
  // ===== BLOCK-09 09-04: Selector Lists (END)

  // 탭 스위처
  // ===== BLOCK-09 09-06: Tab Switching (START)
  const panes = Array.from(wrap.querySelectorAll('.tab-pane')); // [보강] 탭 패널 목록 동적 수집(범위 포함)
  const btns=Array.from(nav.querySelectorAll('.tab-btn')); // 탭 버튼 목록
  const setTab=(k)=>{ // 탭 전환 함수
    try { panes.forEach(p=>{ p.hidden = (p.dataset.tab!==k); }); } catch(e){ console.warn('[Downloader][tabs] toggle', e); } // 표시/숨김 적용(가드)
    try { btns.forEach(b=>b.classList.toggle('active', b.dataset.tab===k)); } catch(e){ console.warn('[Downloader][tabs] active', e); } // 버튼 활성화 표시
    try { state.uiActiveTab=k; saveLocal(); } catch(e){ console.warn('[Downloader][tabs] state', e); } // 현재 탭 상태 저장
  };
  try { window.setTab = setTab; } catch{}                                      // [보강] 전역에 setTab 노출(외부 래퍼/호출 호환)
  try { panes.forEach(p=>p.hidden=true); } catch{}
  try { setTab(state.uiActiveTab||'content'); console.info('[Downloader] tabs: init ok'); } catch(e){ try { setTab('content'); console.warn('[Downloader] tabs: fallback to content'); } catch{} }
  btns.forEach(b=> b.onclick=(e)=>{ try { e.preventDefault(); setTab(b.dataset.tab); } catch(err){ console.warn('[Downloader][tabs] click', err); } }); // 클릭 바인딩(가드)
  // [보강] 최종 안전장치: 초기화 지연/예외로 모두 숨김 상태면 content를 표시
  setTimeout(()=>{
    try {
      const panes2 = Array.from(wrap.querySelectorAll('.tab-pane'));
      const anyVisible = panes2.some(p=>!p.hidden);
      if (!anyVisible) { setTab('content'); console.warn('[Downloader] tabs: failsafe show content'); }
      // 클릭 바인딩 누락 시 재바인딩
      const btns2 = Array.from(nav.querySelectorAll('.tab-btn'));
      btns2.forEach(b=>{ if (!b._dj_bound) { b._dj_bound=true; b.onclick=(e)=>{ try{ e.preventDefault(); setTab(b.dataset.tab); }catch(err){ console.warn('[Downloader][tabs] click2', err);} }; } });
    } catch {}
  }, 0);
  // [보강] 이벤트 위임: 래퍼에서 .tab-btn 클릭을 받아 setTab 호출(바인딩 실패 대비)
  try {
    wrap.addEventListener('click', (ev)=>{
      try {
        const btn = ev.target && ev.target.closest && ev.target.closest('.tab-btn'); // 가장 가까운 탭 버튼
        if (!btn) return;                                                             // 버튼이 아니면 무시
        ev.preventDefault();                                                          // 기본 동작 방지
        const name = btn.dataset && btn.dataset.tab ? btn.dataset.tab : 'content';   // 탭 이름
        setTab(name);                                                                 // 전환 실행
      } catch (e) { console.warn('[Downloader][tabs] delegate', e); }
    }, { passive: false });                                                           // 위임 리스너
  } catch (e) { console.warn('[Downloader][tabs] delegate bind', e); }
  // ===== BLOCK-09 09-06: Tab Switching (END)

  // 미리보기
  refreshPreview = ()=>{ // 제목/본문/이미지 요약 갱신(실제 구현으로 재할당)
    const titleLine = collectTitleLine();
    // 본문: 사용된 선택자 산출(첫 매칭)
    let bodyUsed = '';
    for (const s of (state.bodySelectors||[])) { try { if (s && document.querySelector(s)) { bodyUsed = s; break; } } catch {}
    }
    state.lastUsed.body = bodyUsed ? [bodyUsed] : [];
    const bodyHtml  = collectBodyHtml();
    const bodyText  = htmlToPlainKeepBR(bodyHtml).slice(0,1500);
    // 이미지: 선택자별 매칭 카운트
    const usedImg = [];
    for (const s of (state.imgSelectors||[])) { try { if (s && document.querySelectorAll(s).length) usedImg.push(s); } catch {} }
    state.lastUsed.img = usedImg;
    const imgUrls   = collectImageUrlsFlexible(state.contentSelectors||[]);
    preview.textContent = `제목: ${titleLine}\n이미지: ${imgUrls.length}개\n사용 본문 선택자: ${bodyUsed||'-'}\n사용 이미지 선택자: ${usedImg.length}개\n--- 본문 미리보기 ---\n` + bodyText;
    // 목록 하이라이트 갱신
    try { bodyListCtrl.render(); imgListCtrl.render(); } catch {}
  };
  wrap.querySelector('#dj-preview-refresh').onclick = refreshPreview;
  refreshPreview();
  // ===== BLOCK-09 09-07: Preview (END)
  // 값 채우기
  wrap.querySelector("#dj-series").value = state.seriesName || "";               // 작품명 복원
  wrap.querySelector("#dj-joiner").value = state.joiner || " | ";                // 구분자 복원
  wrap.querySelector("#dj-csel").value = (state.contentSelectors || []).join(", "); // 선택자 복원
  // 고정 10칸 제거됨: 동적 타이틀 UI에서 렌더링
  wrap.querySelector("#dj-img").checked = !!state.saveImages;                    // 이미지 저장 복원
  wrap.querySelector("#dj-log").checked = !!state.logEnabled;                    // 로그 복원
  wrap.querySelector("#dj-delay").value = state.baseDelaySec;                    // 지연 복원
  wrap.querySelector("#dj-jitter").value = state.jitterSec;                      // 지터 복원
  // 이벤트
  wrap.querySelector("#dj-close").onclick = () => { state.panelEl.style.display = "none"; state.panelWasOpen = false; saveLocal(); }; // 닫기
  wrap.querySelector("#dj-min").onclick = () => { ensureMiniBar(); state.panelEl.style.display = "none"; state.panelWasOpen = true; saveLocal(); }; // 최소화
  wrap.querySelector("#dj-save").onclick = onManualAdd;                         // 저장 실행
  wrap.querySelector("#dj-pick-root").onclick = async () => {                   // 루트 선택
    try {
      const dir = await window.showDirectoryPicker();                           // 디렉터리 선택
      const changed = !state.rootDirHandle || (state.rootDirHandle.name !== dir.name); // 변경 감지(이름 기준)
      state.rootDirHandle = dir;                                                // 상태 반영
      if (changed) {                                                            // 루트 변경 시 초기화
        state.seriesDirHandle = null;                                           // 작품 폴더 초기화
        try { await idbDel(FSA_SERIES_KEY); } catch {}
        state.seq = 0;                                                          // 번호 리셋
        saveLocal();                                                            // 로컬 상태 저장
      }
      await fsaSaveHandles();                                                   // 핸들 저장
      await updateFolderLabels();                                               // 라벨 갱신
    } catch(e) { console.warn('[Downloader] pick-root', e); }                   // 취소/오류 무시
  };                                                                           // onclick 끝
  // 시리즈 직접 선택은 비활성(입력 기반 사용)
  wrap.querySelector("#dj-series").oninput = (e) => { state.seriesName = e.target.value || ""; saveLocal(); }; // 작품명 반영
  wrap.querySelector("#dj-joiner").oninput = (e) => { state.joiner = e.target.value || " | "; saveLocal(); };  // 구분자 반영
  wrap.querySelector("#dj-csel").oninput = (e) => { state.contentSelectors = String(e.target.value||"").split(",").map(s=>s.trim()).filter(Boolean); saveLocal(); }; // 선택자 반영
  wrap.querySelector("#dj-img").onchange = (e) => { state.saveImages = !!e.target.checked; saveLocal(); };      // 이미지 저장 반영
  wrap.querySelector("#dj-log").onchange = (e) => { state.logEnabled = !!e.target.checked; saveLocal(); };      // 로그 반영
  wrap.querySelector("#dj-delay").onchange = (e) => { state.baseDelaySec = Math.max(0, Number(e.target.value||0)); saveLocal(); }; // 지연 반영
  wrap.querySelector("#dj-jitter").onchange = (e) => { state.jitterSec = Math.max(0, Number(e.target.value||0)); saveLocal(); };   // 지터 반영
  // 고정 10칸 제거됨: 동적 타이틀 UI에서 반영

  // 폴더 위치/이름 관련 버튼 이벤트
  const btnChangeLoc = wrap.querySelector('#dj-change-location');            // 폴더 위치 변경 버튼
  if (btnChangeLoc) {
    btnChangeLoc.onclick = async ()=>{
      try {
        const dir = await window.showDirectoryPicker();                      // 루트 위치 변경(사용자 제스처 필요)
        const changed = !state.rootDirHandle || (state.rootDirHandle.name !== dir.name);
        state.rootDirHandle = dir;                                           // 갱신
        if (changed) {                                                       // 루트 변경 시 초기화
          state.seriesDirHandle = null;                                      // 작품 폴더 초기화
          try { await idbDel(FSA_SERIES_KEY); } catch {}
          state.seq = 0; saveLocal();                                        // 시퀀스 리셋
        }
        await fsaSaveHandles();                                              // 보관
        await updateFolderLabels();                                          // 라벨 갱신
      } catch(e) {
        console.warn('[Downloader] change-location', e);                     // 콘솔 기록
        if (!window.isSecureContext) { alert('https/localhost 환경에서만 폴더 선택이 가능합니다.'); return; }
        if (e && (e.name === 'NotAllowedError' || e.code === 20)) {          // 제스처/취소
          alert('폴더 선택이 취소되었거나 사용자 제스처가 필요합니다. 다시 클릭해 주세요.');
          return;
        }
        alert('폴더 선택 중 오류가 발생했습니다. 콘솔 로그를 확인해 주세요.');
      }
    };
  }

  const btnEditName = wrap.querySelector('#dj-edit-foldername');             // 폴더명 수정 버튼
  if (btnEditName) {
    btnEditName.onclick = async ()=>{
      try {
        const cur = state.seriesFolderName || state.seriesName || '';
        const next = window.prompt('다음 저장 폴더명 입력', cur);
        if (next === null) return;                                           // 취소
        const trimmed = String(next).trim();
        if (!trimmed) { alert('폴더명이 비어 있습니다.'); return; }          // 빈값 방지
        if (trimmed === cur) { return; }                                     // 변경 없음
        state.seriesFolderName = trimmed; saveLocal();
        await updateFolderLabels();                                          // 라벨 갱신
      } catch(e){ console.warn('[Downloader] edit-foldername', e); alert('폴더명 변경 중 오류가 발생했습니다.'); }
    };
  }

  const btnTitleName = wrap.querySelector('#dj-title-foldername');           // 제목으로 폴더명 버튼
  if (btnTitleName) {
    btnTitleName.onclick = async ()=>{
      try {
        const t = (collectTitleLine() || state.seriesName || 'series').trim();
        if (!t) { alert('적용할 제목이 없습니다. 제목칸을 채워 주세요.'); return; }
        state.seriesFolderName = t; saveLocal();
        await updateFolderLabels();
      } catch(e){ console.warn('[Downloader] title-foldername', e); alert('제목 기반 폴더명 적용 중 오류가 발생했습니다.'); }
    };
  }

  // 선택자 탭: 작품명 행에 [제목으로 폴더명] 버튼 배치
  const seriesRow = rowOf('dj-series');
  if (seriesRow && !seriesRow.querySelector('#dj-series-to-folder')) {
    const toFolderBtn = document.createElement('button');
    toFolderBtn.id = 'dj-series-to-folder';
    toFolderBtn.className = 'dj-btn';
    toFolderBtn.textContent = '제목으로 폴더명';
    seriesRow.appendChild(toFolderBtn);
    toFolderBtn.onclick = async () => {
      try {
        state.seriesFolderName = (state.seriesName || 'series').trim();        // 작품명 그대로 사용
        saveLocal();
        await updateFolderLabels();                                           // 라벨 즉시 반영
        const firstSel = wrap.querySelector('#dj-body-list input');          // 선택자 첫 입력 포커스
        if (firstSel) firstSel.focus();
      } catch (e) { console.warn('[Downloader] series-to-folder', e); }
    };
  }
  // 설정 탭에 있던 동일 기능 버튼이 있다면 숨김(중복 방지)
  const oldTitleBtn = wrap.querySelector('#dj-title-foldername'); // 설정 탭 기존 버튼 참조
  if (oldTitleBtn) oldTitleBtn.style.display = '';               // 숨김 해제(원위치 복구)
}                                                                              // ensurePanel 끝
// ===== BLOCK-09 09-02: Panel Mount (END)

// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-09 09-05: Folder Controls & Labels (START)
// ─────────────────────────────────────────────────────────────────────────────
async function updateFolderLabels() {                                           // 설정 탭 라벨 갱신
  try {
    const root = state.rootDirHandle || null;                                   // 루트 핸들
    const series = state.seriesDirHandle || null;                                // 작품 핸들
    const panel = state.panelEl;                                                 // 패널 루트
    if (!panel) return;                                                          // 패널 없음
    const rootEl = panel.querySelector('#dj-root-label');                        // 루트 라벨(기존)
    const seriesEl = panel.querySelector('#dj-series-label');                    // 작품 라벨(기존)
    const pathEl = panel.querySelector('#dj-path-full');                         // 전체 경로 라벨(신규)
    const nameEl = panel.querySelector('#dj-folder-name');                       // 폴더명 라벨(신규)
    const rootName = root ? (root.name || '(미선택)') : '(미선택)';              // 루트 이름
    let rel = '';
    if (root && series && typeof root.resolve === 'function') {                 // 상대 경로 계산(가능 시)
      try { const parts = await root.resolve(series); if (Array.isArray(parts)) rel = parts.join('/'); } catch (_) {}
    }
    const folderName = (state.seriesFolderName || series?.name || '(폴더명 미지정)'); // 표기용 폴더명
    if (rootEl) rootEl.textContent = rel ? `${rootName}/${rel}` : rootName;     // 기존 루트 라벨 유지
    if (seriesEl) seriesEl.textContent = series ? (series.name || '(미선택)') : '(미선택)'; // 기존 작품 라벨 유지
    if (pathEl) pathEl.textContent = root ? `${rootName}${rel?('/'+rel):''} / ${folderName}` : '(루트 미선택)'; // 전체 경로
    if (nameEl) nameEl.textContent = folderName;                                // 폴더 이름 표시
  } catch (e) { console.warn('[Downloader] updateFolderLabels', e); }            // 오류 로그
}                                                                                // updateFolderLabels 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-09 09-05: Folder Controls & Labels (END)
// ─────────────────────────────────────────────────────────────────────────────

function ensureMiniBar() {                                                    // 최소화 바 표시
  if (state.miniEl) { state.miniEl.style.display = "flex"; return; }           // 이미 있으면 표시
  const __sr = ensureShadowRoot();
  const bar = document.createElement("div");                                    // 바 요소
  bar.id = "dj-mini";                                                           // ID
  bar.style.cssText = "position:fixed;right:14px;bottom:14px;display:flex;gap:8px;align-items:center;background:#1e1e1ecc;color:#eee;border:1px solid #444;border-radius:24px;padding:6px 10px;z-index:2147483647;backdrop-filter:blur(2px);pointer-events:auto"; // 스타일
  bar.innerHTML = `                                                             <!-- 내용 -->
    <span style="font-size:12px">Downloader</span>                              <!-- 라벨 -->
    <button id="dj-quick-save" class="dj-btn">저장</button>                     <!-- 빠른 저장 -->
    <button id="dj-restore" class="dj-btn">열기</button>                        <!-- 패널 복원 -->
  `;                                                                            // innerHTML 끝
  if (__sr) { __sr.appendChild(bar); } else { document.documentElement.appendChild(bar); } // 문서 추가
  state.miniEl = bar;                                                           // 참조 저장
  try { consolidateStylesInShadow(); } catch {}                                  // [추가] 섀도우 스타일 통합 수행
  bar.querySelector("#dj-quick-save").onclick = onManualAdd;                    // 빠른 저장
  bar.querySelector("#dj-restore").onclick = () => { ensurePanel(); if (state.miniEl) state.miniEl.style.display = "none"; }; // 패널 복원
}                                                                              // ensureMiniBar 끝

function makeDraggable(box, handle) {                                         // 드래그 구현
  let sx=0, sy=0, bx=0, by=0, dragging=false;                                  // 상태 변수
  handle.addEventListener("mousedown", (e) => {                                 // 다운
    dragging = true; sx = e.clientX; sy = e.clientY;                            // 시작 좌표
    const r = box.getBoundingClientRect(); bx = r.left; by = r.top;             // 박스 좌표
    e.preventDefault();                                                         // 기본 취소
  });                                                                            // 이벤트 끝
  document.addEventListener("mousemove", (e) => {                                // 이동
    if (!dragging) return;                                                       // 아니면 탈출
    const nx = bx + (e.clientX - sx);                                            // 새 X
    const ny = by + (e.clientY - sy);                                            // 새 Y
    box.style.left = Math.max(0, Math.min(window.innerWidth-80, nx)) + "px";     // X 클램프
    box.style.top  = Math.max(0, Math.min(window.innerHeight-40, ny)) + "px";    // Y 클램프
  });                                                                            // 이벤트 끝
  document.addEventListener("mouseup", () => {                                   // 업
    dragging = false;                                                            // 드래그 해제
  });                                                                            // 이벤트 끝
}                                                                                // makeDraggable 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-09: 패널 UI/섀도우/탭/라벨 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-10: 저장 루틴(스크롤→수집→저장→로그) (START)
// ===== BLOCK-10: 저장 루틴 (START)
// ─────────────────────────────────────────────────────────────────────────────
async function autoScrollOnce() {                                             // 지연로딩 대비 1패스 스크롤(라이브러리 사용)
  try {                                                                        // 예외 보호
    if (window.DWLib && window.DWLib.Scroll && typeof window.DWLib.Scroll.autoScrollDownUp === 'function') { // 라이브러리 가용성 확인
      await window.DWLib.Scroll.autoScrollDownUp({ patchLazy: true, pause: 120, bottomHold: 300 });           // 자동 스크롤 실행
      return;                                                                  // 종료(성공 경로)
    }                                                                           // if 끝
  } catch(e) { console.warn('[Downloader] autoScrollOnce 라이브러리 경로 실패', e); } // 경고 로그
  try {                                                                         // 폴백: 기존 단순 스크롤
    const H = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); // 전체 높이 계산
    window.scrollTo(0, H);                                                     // 맨 아래로 이동
    await sleep(600);                                                          // 짧은 대기
  } catch {}                                                                    // 실패 무시
}                                                                               // autoScrollOnce 끝

function collectTitleLine() {                                                  // 제목 라인 조립(텍스트 + 선택자 결과)
  const parts = [];                                                            // 결과 파트들
  const texts = Array.isArray(state.titleParts) ? state.titleParts : [];       // 텍스트 배열
  const sels  = Array.isArray(state.titlePartSels) ? state.titlePartSels : []; // 선택자 배열
  const max   = Math.max(texts.length, sels.length);                           // 최대 길이
  for (let i = 0; i < max; i++) {                                              // 각 인덱스 순회
    const t = String(texts[i] || '').trim();                                   // 텍스트
    const s = String(sels[i] || '').trim();                                    // 선택자 문자열
    const v = s ? safePickText(s) : '';                                        // 선택자 결과 텍스트
    const piece = [t, v].filter(Boolean).join(' ');                            // 공백으로 결합
    if (piece) parts.push(piece);                                              // 비어있지 않으면 추가
  }
  return parts.join(state.joiner || ' | ');                                    // 구분자로 연결
}                                                                               // collectTitleLine 끝

/**
 * BLOCK-06: 본문 HTML 수집(첫 매칭)                                            // bodySelectors 우선 사용
 * @returns {string}                                                            // 내부 HTML 또는 텍스트
 */
function collectBodyHtml() {                                                   // 본문 HTML 수집(첫 매칭)
  const list = (state.bodySelectors && state.bodySelectors.length) ? state.bodySelectors : state.contentSelectors; // 선택자 소스
  for (const s of list || []) {                                                // 선택자 순회
    if (!s) continue;                                                           // 공백 스킵
    const n = $(s);                                                             // 첫 매칭
    if (n) return n.innerHTML || n.textContent || "";                           // HTML/텍스트 반환
  }                                                                             // for 끝
  return "";                                                                    // 없으면 빈값
}                                                                               // collectBodyHtml 끝

async function fetchImageSmart(url) {                                          // 이미지 fetch(콘텐츠→BG 폴백)
  try {                                                                         // 1차: 콘텐츠 fetch
    const res = await fetch(url, { method: "GET", mode: "cors", credentials: "include", cache: "no-store" }); // 요청
    if (!res.ok) throw new Error(`HTTP ${res.status}`);                         // 실패시 예외
    const ct = res.headers.get("content-type") || "";                           // MIME
    const ab = await res.arrayBuffer();                                         // 바이너리
    return { ok: true, contentType: ct, arrayBuffer: ab };                      // 성공 반환
  } catch (e) {                                                                 // 2차: BG 폴백
    try {
      const targetOrigin = new URL(url, location.href).origin;                  // 대상 오리진
      await chrome.runtime.sendMessage({                                        // DNR 규칙 보장(Referer 주입)
        type: "DNR_ENSURE_REF",
        targetOrigin,
        referer: location.href
      });
    } catch (_) {}
    const resp = await chrome.runtime.sendMessage({ type: "BG_FETCH_IMAGE", url }); // 메시지
    if (!resp?.ok) return { ok: false, err: resp?.err || String(e) };           // 폴백 실패
    const bin = atob(resp.base64);                                              // base64 디코드
    const ab = new Uint8Array([...bin].map(c => c.charCodeAt(0))).buffer;       // 버퍼화
    return { ok: true, contentType: resp.contentType || "", arrayBuffer: ab };  // 성공 반환
  }                                                                             // try-catch 끝
}                                                                               // fetchImageSmart 끝

/**
 * BLOCK-10: 저장 실행(수동 추가)                                               // 파일/디렉터리 생성 및 이미지 저장
 * - 작품 폴더 미지정 시 루트 아래 제목 기반 폴더를 자동 생성.                   // 자동 폴더 생성 전략
 * @returns {Promise<void>}
 */
async function onManualAdd() {                                                 // 저장 실행(수동 추가)
  try {                                                                         // 예외 보호
    if (!state.rootDirHandle) {                                                // 루트 필수
      alert("먼저 [루트 폴더]를 선택해 주세요.");                                 // 안내
      return;                                                                   // 종료
    }
    // 루트 아래 폴더명 기준으로 작품 폴더 보장
    const desiredName = (state.seriesFolderName || state.seriesName || 'series').trim();
    try {
      state.seriesDirHandle = await ensureDir(state.rootDirHandle, slugify(desiredName));
      await fsaSaveHandles();
      await updateFolderLabels();
    } catch (e) { console.warn('[Downloader] ensure series dir', e); }

    const t0 = performance.now();                                               // 시간 측정 시작
    const startedAt = new Date().toISOString();                                 // 시작 시각 ISO

    await autoScrollOnce();                                                     // 지연 로딩 유도

    const titleLine = collectTitleLine();                                       // 제목 조립
    const bodyHtml = collectBodyHtml();                                         // 본문 HTML
    const bodyText = htmlToPlainKeepBR(bodyHtml);                               // 텍스트 변환

    const imgUrls = state.saveImages ? collectImageUrlsFlexible(state.contentSelectors) : []; // 이미지 URL 목록
    const discoveredImgCount = imgUrls.length;                                  // 발견 수

    // 디스크 기준으로 다음 번호 계산(이어 저장)
    try {
      const nextFromDisk = await (async () => {
        try {
          let maxN = 0;
          const textsDir = await ensureDir(state.seriesDirHandle, 'texts');
          if (textsDir && textsDir.entries) {
            for await (const [name] of textsDir.entries()) {
              const m = /^EP-(\d{4})\.txt$/i.exec(name);
              if (m) { const n = parseInt(m[1], 10); if (n>maxN) maxN=n; }
            }
          }
          const imagesDir = await ensureDir(state.seriesDirHandle, 'images');
          if (imagesDir && imagesDir.entries) {
            for await (const [name] of imagesDir.entries()) {
              const m = /^EP-(\d{4})$/i.exec(name);
              if (m) { const n = parseInt(m[1], 10); if (n>maxN) maxN=n; }
            }
          }
          return maxN + 1;
        } catch { return (state.seq|0) + 1; }
      })();
      state.seq = nextFromDisk - 1;
    } catch {}
    state.seq = (state.seq|0) + 1;                                              // 시퀀스 +1 (보정 후)
    saveLocal();                                                                // 로컬 저장
    const epId = "EP-" + String(state.seq).padStart(4, "0");                    // EP-0001

    const textsDir = await ensureDir(state.seriesDirHandle, "texts");           // texts/
    // 파일 있으면 append, 없으면 신규 작성
    let textFH;
    try { textFH = await textsDir.getFileHandle(`${epId}.txt`, { create: false }); }
    catch { textFH = await textsDir.getFileHandle(`${epId}.txt`, { create: true }); }
    try {
      const f = await textFH.getFile();
      if (f.size > 0) await appendText(textFH, "\n" + (titleLine ? titleLine + "\n\n" : "") + bodyText);
      else await writeFile(textFH, (titleLine ? titleLine + "\n\n" : "") + bodyText);
    } catch { await writeFile(textFH, (titleLine ? titleLine + "\n\n" : "") + bodyText); }

    const imagesSaved = [];                                                     // 저장 성공 경로
    const imagesFailed = [];                                                    // 실패 기록
    if (state.saveImages && imgUrls.length) {                                   // 이미지 저장 ON
      const epImgDir = await ensureDir(state.seriesDirHandle, `images/${epId}`);// images/EP-####
      let idx = 0;                                                              // 인덱스
      for (const url of imgUrls) {                                              // 각 URL
        idx++;                                                                  // 증가
        const r = await fetchImageSmart(url);                                   // 스마트 fetch
        if (!r.ok) { imagesFailed.push({ url, err: r.err||"fetch_error" }); continue; } // 실패시 기록
        const ct = (r.contentType||"").toLowerCase();                           // MIME
        const ext = (ct.includes("png")&&".png")||(ct.includes("webp")&&".webp")||(ct.includes("gif")&&".gif")||(ct.includes("avif")&&".avif")||".jpg"; // 확장자
        const fname = String(idx).padStart(3, "0") + ext;                       // 001.jpg
        const fh = await epImgDir.getFileHandle(fname, { create: true });       // 파일 핸들
        const ws = await fh.createWritable();                                    // 쓰기 스트림
        await ws.write(new Uint8Array(r.arrayBuffer));                           // 바이트 쓰기
        await ws.close();                                                        // 닫기
        imagesSaved.push(`images/${epId}/${fname}`);                             // 경로 기록
      }                                                                          // for 끝
    }                                                                            // if 끝

    const jsonlFH = await state.seriesDirHandle.getFileHandle("episodes.jsonl", { create: true }); // 메타 파일 핸들
    const rec = {                                                               // 레코드
      schema: "1.0",                                                            // 스키마
      series_id: slugify(state.seriesName || document.title || "series"),       // 시리즈 ID
      episode_id: epId,                                                         // EP ID
      seq: state.seq,                                                           // 시퀀스
      site: location.hostname,                                                  // 호스트
      series: state.seriesName || "",                                           // 시리즈명
      title_line: titleLine,                                                    // 제목 라인
      url: location.href,                                                       // 페이지 URL
      text_file: `texts/${epId}.txt`,                                           // 본문 파일
      img_files: imagesSaved,                                                   // 이미지 목록
      char_count: bodyText.length,                                              // 본문 길이
      img_count: imagesSaved.length,                                            // 이미지 수
      captured_at: startedAt                                                    // 캡처 시각
    };                                                                          // rec 끝
    await appendText(jsonlFH, JSON.stringify(rec) + "\n");                      // JSONL append

    const t1 = performance.now();                                               // 종료 시각
    await writeActivityLog({                                                    // 활동 로그
      type: "save",                                                             // 타입
      host: location.hostname,                                                  // 호스트
      url: location.href,                                                       // URL
      started_at: startedAt,                                                    // 시작
      ended_at: new Date().toISOString(),                                       // 끝
      duration_ms: Math.round(t1 - t0),                                         // 소요
      seq: state.seq,                                                           // 시퀀스
      episode_id: epId,                                                         // EP ID
      content_selectors: [...(state.contentSelectors||[])],                     // 선택자들
      title_line_len: (titleLine||"").length,                                   // 제목 길이
      body_char_count: bodyText.length,                                         // 본문 길이
      images_discovered: discoveredImgCount,                                    // 이미지 발견
      images_saved: imagesSaved.length,                                         // 저장 수
      images_failed: imagesFailed,                                              // 실패 목록
      settings: {                                                               // 설정 스냅샷
        joiner: state.joiner, base_delay_sec: state.baseDelaySec, jitter_sec: state.jitterSec, save_images: state.saveImages, log_enabled: state.logEnabled // 필드들
      }                                                                         // settings 끝
    });                                                                         // 로그 작성

    alert(`완료: ${epId} · 텍스트 ${bodyText.length}자 · 이미지 ${imagesSaved.length}장`); // 완료 알림
  } catch (e) {                                                                // 에러 핸들
    await writeActivityLog({ type: "error", host: location.hostname, url: location.href, at: new Date().toISOString(), message: String(e) }); // 에러 로그
    alert("오류: " + String(e));                                               // 안내
  }                                                                            // try-catch 끝
}                                                                               // onManualAdd 끝
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-10: 저장 루틴 (END)
// BLOCK-10: 저장 루틴(스크롤→수집→저장→로그) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11: 초기화(FSA/패널 복원) (START)
// ===== BLOCK-11: 초기화 (START)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * BLOCK-11: 초기화(IIFE)                                                       // 상태 복원/패널 표시/미니바
 */
(async function init() {                                                     // 초기화 IIFE
  try {                                                                       // 예외 보호
    await loadPersistent();                                                   // chrome.storage.local 우선 복원        // [변경]
    await fsaRestoreHandles();                                                // FSA 핸들 복원
    // 신규 키 초기화(하위호환): body/img 선택자 분리                           // [추가 없음: 기존 유지]
    if (!Array.isArray(state.bodySelectors) || !state.bodySelectors.length) {
      state.bodySelectors = Array.isArray(state.contentSelectors) ? [...state.contentSelectors] : [];
    }
    if (!Array.isArray(state.imgSelectors)) state.imgSelectors = [];
    state.contentSelectors = [...state.bodySelectors, ...state.imgSelectors];
    // 제목 관련 선택자/상태 가드(페이지 이동 후에도 유지)                      // [추가]
    if (typeof state.seriesSel !== 'string') state.seriesSel = '';            // 작품명 선택자 기본값 보장
    if (!Array.isArray(state.titlePartSels)) state.titlePartSels = [];        // 제목칸 선택자 배열 보장
    // 제목칸 수에 맞춰 선택자 배열 길이 정렬(부족하면 공백 채움)               // [추가]
    const tpLen = Array.isArray(state.titleParts) ? state.titleParts.length : 0; // 현재 제목칸 개수 파악
    for (let i = state.titlePartSels.length; i < tpLen; i++) {                // 부족분만큼
      state.titlePartSels.push('');                                           // 빈 선택자 추가
    }
    saveLocal();                                                              // 정규화된 상태 저장(다음 페이지에서도 복원)
    if (state.panelWasOpen || state.fsaRestored) {                            // 패널 열림 조건
      ensurePanel();                                                          // 패널 표시
      state.panelWasOpen = true;                                              // 상태 설정
      saveLocal();                                                            // 저장
      await updateFolderLabels();                                             // 폴더 라벨 1회 갱신
    }                                                                          // if 끝
    ensureMiniBar();                                                          // 최소화 바도 항상 제공
    // 안전 저장: 페이지 이탈 시 현재 입력 상태를 한번 더 보존                 // [추가]
    window.addEventListener('beforeunload', () => {                           // 언로드 직전
      try { saveLocal(); } catch (_) {}                                       // 오류 무시하고 저장 시도
    });                                                                       // 리스너 끝
    // ===== BLOCK-TEST: 셀프 테스트(라이브러리 로딩/핵심 함수 존재 확인) (START)
    try {                                                                     // [추가] 간단 테스트 로그
      const checks = [];
      checks.push(['DomText', !!(window.DWLib&&window.DWLib.DomText)]);
      checks.push(['Scroll',  !!(window.DWLib&&window.DWLib.Scroll)]);
      checks.push(['Store',   !!(window.DWLib&&window.DWLib.Store)]);
      checks.push(['FSA',     !!(window.DWLib&&window.DWLib.FSA)]);
      checks.push(['Nav',     !!(window.DWLib&&window.DWLib.Nav)]);
      checks.push(['Image',   !!(window.DWLib&&window.DWLib.Image)]);
      checks.push(['Log',     !!(window.DWLib&&window.DWLib.Log)]);
      const missing = checks.filter(([,ok])=>!ok).map(([k])=>k);
      if (missing.length===0) console.info('[Downloader] Self-test: OK (All libs loaded)');
      else console.warn('[Downloader] Self-test: missing →', missing.join(', '));
    } catch (e) { console.warn('[Downloader] Self-test error', e); }
    // ===== BLOCK-TEST: 셀프 테스트(라이브러리 로딩/핵심 함수 존재 확인) (END)
  } catch (e) { console.warn("[init]", e); }                                   // 오류 로그
})();                                                                          // init 즉시 실행
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-11: 초기화 (END)
// BLOCK-11: 초기화(FSA/패널 복원) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-12: 플로팅 토글(최소화 상태에서도 저장 가능) (START)
// ===== BLOCK-12: 플로팅 토글 (START)
// ─────────────────────────────────────────────────────────────────────────────
(function ensureFloatingDot(){                                               // 원형 토글 버튼
  const btn = document.createElement("div");                                   // 버튼 엘리먼트
  btn.id = "dj-fab";                                                           // ID
  btn.textContent = "●";                                                       // 표시 문자
  btn.title = "클릭: 패널 토글 / Shift+클릭: 즉시 저장";                        // 툴팁
  btn.style.cssText = "position:fixed;right:16px;bottom:70px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#2ecc71;color:#0a0;font-weight:700;z-index:2147483647;pointer-events:auto;"; // 스타일
  btn.onclick = (e) => {                                                       // 클릭 핸들러
    if (e.shiftKey) { onManualAdd(); return; }                                 // Shift: 즉시 저장
    if (!state.panelEl || state.panelEl.style.display === "none") {            // 패널 숨김이면
      ensurePanel(); state.panelWasOpen = true; saveLocal();                   // 패널 표시
    } else {                                                                    // 보이는 중이면
      state.panelEl.style.display = "none"; state.panelWasOpen = false; saveLocal(); // 숨김
    }                                                                           // if-else 끝
  };                                                                            // onclick 끝
  const __sr = ensureShadowRoot();
  if (__sr) { __sr.appendChild(btn); } else { document.documentElement.appendChild(btn); }
})();                                                                           // 즉시 실행
// ─────────────────────────────────────────────────────────────────────────────
// ===== BLOCK-12: 플로팅 토글 (END)
// BLOCK-12: 플로팅 토글(최소화 상태에서도 저장 가능) (END)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-12B: 배치 저장 상태머신(간단) (START)                                 // [추가] N개 저장 진행/재개/중단 로직
// ===== BLOCK-12B: 배치 저장 상태머신(간단) (START)
// ─────────────────────────────────────────────────────────────────────────────

/** 배치 작업 읽기 */
async function djGetBatchJob(){                                                // 함수 시작
  try { if (chrome?.storage?.local?.get) { const r = await new Promise(res=>chrome.storage.local.get('dj_batch_job', v=>res(v&&v.dj_batch_job))); return r||null; } } catch {}
  return null;                                                                 // 폴백
}                                                                              // djGetBatchJob 끝

/** 배치 작업 저장 */
async function djSetBatchJob(job){                                             // 함수 시작
  try { if (chrome?.storage?.local?.set) await chrome.storage.local.set({ dj_batch_job: job }); } catch {}
}                                                                              // djSetBatchJob 끝

/** 저장 후 배치 다음 페이지 이동 처리 */
async function djBatchAfterSaveHook(){                                         // 함수 시작
  try {                                                                         // 예외 보호
    const job = await djGetBatchJob();                                          // 작업 로드
    if (!job) return;                                                           // 작업 없음
    const remain = Number(job.remaining|0);                                     // 남은 이동 횟수
    if (remain <= 0) {                                                          // 더 이동 없음
      await djSetBatchJob(null);                                                // 작업 종료(값 제거)
      try { if (chrome?.storage?.local?.remove) await chrome.storage.local.remove('dj_batch_job'); } catch {}
      return;                                                                   // 종료
    }
    const sels = (typeof state!=='undefined' && state && state.nextLinkSels) || []; // 다음 링크 선택자 배열
    const nextUrl = (typeof djFindNextUrl==='function') ? djFindNextUrl(sels) : null; // 다음 URL 계산
    if (!nextUrl) {                                                             // 이동 불가
      await djSetBatchJob(null);                                                // 작업 종료
      try { if (chrome?.storage?.local?.remove) await chrome.storage.local.remove('dj_batch_job'); } catch {}
      return;                                                                   // 종료
    }
    const delayMs = Number(job.delayMs||0);                                     // 지연
    const newJob = { ...job, remaining: remain - 1 };                           // 남은 이동 -1
    await djSetBatchJob(newJob);                                                // 상태 갱신
    if (delayMs>0) await new Promise(res=>setTimeout(res, delayMs));            // 대기
    location.assign(nextUrl);                                                   // 다음 페이지로 이동
  } catch (e) { console.warn('[Downloader] djBatchAfterSaveHook', e); }         // 예외 로그
}                                                                              // djBatchAfterSaveHook 끝

/** onManualAdd 저장 함수 래핑: 저장 후 배치 처리 */
(function wrapOnManualAddForBatch(){                                           // IIFE 시작
  try {                                                                         // 예외 보호
    if (typeof window.onManualAdd === 'function' && !window._dj_wrapped_batch_onManualAdd) { // 중복 방지
      window._dj_wrapped_batch_onManualAdd = true;                              // 플래그
      const orig = window.onManualAdd;                                          // 원본 보관
      window.onManualAdd = async function(){                                    // 래핑된 함수
        const r = await orig.apply(this, arguments);                            // 원본 실행
        try { await djBatchAfterSaveHook(); } catch(e){ console.warn('[Downloader] batch hook', e); } // 후처리
        return r;                                                               // 반환
      };                                                                        // 함수 끝
    }
  } catch (e) { console.warn('[Downloader] wrapOnManualAddForBatch', e); }      // 예외 로그
})();                                                                            // IIFE 끝

/** 페이지 로드시 배치 재개: 스크롤 옵션 적용 후 저장 1회 */
document.addEventListener('DOMContentLoaded', async () => {                    // 리스너 시작
  try {                                                                         // 예외 보호
    const job = await djGetBatchJob();                                          // 작업 로드
    if (!job) return;                                                           // 작업 없음
    if (job.withScroll && window.DWLib?.Scroll?.autoScrollDownUp) {             // 스크롤 옵션
      await window.DWLib.Scroll.autoScrollDownUp({ patchLazy: true, pause: 120, bottomHold: 300 }); // 스크롤
    }
    await onManualAdd();                                                        // 저장 1회 실행(후크가 다음 페이지 이동 처리)
  } catch (e) { console.warn('[Downloader] batch resume', e); }                 // 예외 로그
}, { once: true });                                                              // 1회만

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-12B: 배치 저장 상태머신(간단) (END)
// ===== BLOCK-12B: 배치 저장 상태머신(간단) (END)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11: 탭 '범위' 추가 및 표시 안정화 (START)                             // 블록 시작: 새 탭 추가 및 표시 안정화
// ===== BLOCK-11: 탭 '범위' 추가 및 표시 안정화 (START)                      // 고정 포맷 시작
// ─────────────────────────────────────────────────────────────────────────────

/** 탭 공통 스타일 보강(숨김 토글·여백) */                                      // 스타일 주입 섹션 설명
(function ensureTabStyles() {                                                    // IIFE 시작: (통합됨) 더 이상 문서에 주입하지 않음
  try {                                                                          // 예외 보호 시작
    // NOTE: 스타일은 Shadow DOM 내 consolidateStylesInShadow()에서 일원화됩니다.     // 통합 안내
    // 문서 레벨 주입은 중복/충돌 소지가 있어 중단합니다.                             // 중단 사유
    return;                                                                      // 즉시 종료
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] 탭 스타일 주입 스킵', e);                           // 로그
  }                                                                              // try/catch 끝
})();                                                                            // ensureTabStyles 끝

/** '범위' 탭 버튼과 패널을 만들어 추가 */                                      // 새 탭 생성 섹션 설명
function addRangeTab(tabbarEl, panesWrapEl, setTabFn) {                          // 새 탭 추가 함수(탭바, 패널랩, setTab 전달)
  const btn = document.createElement('button');                                  // 버튼 요소 생성
  btn.id = 'dj-tab-range';                                                       // 버튼 id 지정
  btn.className = 'dj-tab';                                                      // 공통 탭 클래스
  btn.type = 'button';                                                           // 버튼 타입
  btn.textContent = '범위';                                                       // 표시 텍스트(요청명)
  btn.setAttribute('aria-selected', 'false');                                    // 초기 비선택 상태
  btn.addEventListener('click', (ev) => {                                        // 클릭 핸들러 등록
    ev.preventDefault();                                                         // 기본 동작 방지
    try { setTabFn && setTabFn('range'); } catch {}                              // setTab 호출 시도
  }, { passive: true });                                                         // 패시브 옵션
  tabbarEl.appendChild(btn);                                                     // 탭바에 버튼 추가

  const pane = document.createElement('div');                                    // 패널 요소 생성
  pane.id = 'dj-pane-range';                                                     // 패널 id 지정
  pane.className = 'dj-tab-pane';                                                // 공통 패널 클래스
  pane.setAttribute('hidden', '');                                               // 초기 숨김 처리
  const inner = document.createElement('div');                                   // 내부 래퍼 생성
  inner.className = 'dj-pane-inner';                                             // 여백 적용 클래스
  inner.innerHTML =                                                              // 초기 안내 콘텐츠 삽입
    '<div style="font-weight:600;margin-bottom:6px;">범위 저장</div>' +         // 제목 표시
    '<div style="font-size:12px;color:#666;margin-bottom:8px;">' +             // 설명 스타일
    '끝까지 이동하며 저장 또는 현재 페이지부터 N개 저장 기능이 여기에 배치됩니다.' + // 안내 문구
    '</div>';                                                                    // 설명 종료
  pane.appendChild(inner);                                                       // 패널에 내부 추가
  panesWrapEl.appendChild(pane);                                                 // 랩에 패널 추가
}                                                                                // addRangeTab 끝

/** setTab 확장: 'range' 선택 처리 및 숨김 토글 보장 */                         // setTab 확장 섹션 설명
function extendSetTabForRange(originalSetTab) {                                  // 기존 setTab을 래핑
  return function setTab(name) {                                                 // 새 setTab 정의
    try {                                                                        // 예외 보호 시작
      if (typeof originalSetTab === 'function') {                                // 원본이 함수면
        try { originalSetTab(name); } catch {}                                   // 원본 먼저 호출
      }                                                                          // if 끝
      const isRange = name === 'range';                                          // 선택된 탭이 범위인지
      const btn = document.getElementById('dj-tab-range');                       // 범위 탭 버튼 조회
      const pane = document.getElementById('dj-pane-range');                     // 범위 패널 조회
      if (btn && pane) {                                                         // 요소가 존재하면
        const allPanes = document.querySelectorAll('.dj-tab-pane');              // 모든 패널 조회
        if (isRange) {                                                           // 범위 탭 선택 시
          allPanes.forEach(p => p.setAttribute('hidden', ''));                   // 모든 패널 숨김
          pane.removeAttribute('hidden');                                        // 범위 패널만 표시
          const tabs = document.querySelectorAll('.dj-tabbar .dj-tab');          // 모든 탭 버튼
          tabs.forEach(t => t.setAttribute('aria-selected', 'false'));           // 전부 비선택 처리
          btn.setAttribute('aria-selected', 'true');                             // 범위 탭만 선택
        } else {                                                                 // 다른 탭 선택 시
          pane.setAttribute('hidden', '');                                       // 범위 패널 숨김
          btn.setAttribute('aria-selected', 'false');                            // 범위 탭 비선택
        }                                                                        // if 끝
      }                                                                          // if 끝
    } catch (e) {                                                                // 예외 처리
      console.warn('[Downloader] setTab(range) 확장 실패', e);                   // 회피 사유 로그
    }                                                                            // try/catch 끝
  };                                                                             // 래핑된 setTab 반환
}                                                                                // extendSetTabForRange 끝

/** 패널 준비 후 '범위' 탭을 삽입하고 setTab을 확장 */                          // 초기화 섹션 설명
function initRangeTabIfReady() {                                                 // 초기화 함수 정의
  try {                                                                          // 예외 보호 시작
    const tabbar = document.getElementById('dj-tabbar')                          // 탭바(우선 id)
                  || document.querySelector('.dj-tabbar');                       // 없으면 class로 조회
    const panes = document.getElementById('dj-panes')                             // 패널 랩(우선 id)
                 || document.querySelector('.dj-panes');                          // 없으면 class로 조회
    if (!tabbar || !panes) return;                                               // 아직 준비 안 됐으면 종료
    if (!document.getElementById('dj-tab-range')) {                               // 범위 탭이 없으면
      addRangeTab(tabbar, panes, window.setTab);                                  // 새 탭 추가
    }                                                                             // if 끝
    if (typeof window.setTab === 'function' && !window._dj_wrapped_setTab_range) { // setTab 래핑 여부 검사
      window._dj_wrapped_setTab_range = true;                                     // 래핑 플래그 설정
      window.setTab = extendSetTabForRange(window.setTab);                        // setTab 확장 적용
    }                                                                             // if 끝
  } catch (e) {                                                                   // 예외 처리
    console.warn('[Downloader] 범위 탭 초기화 실패', e);                          // 회피 사유 로그
  }                                                                              // try/catch 끝
}                                                                                // initRangeTabIfReady 끝

/** DOM 준비 시와 약간의 지연 후 초기화 시도 */                                 // 초기 호출 타이밍 설명
document.addEventListener('DOMContentLoaded', () => {                             // DOMContentLoaded 리스너
  initRangeTabIfReady();                                                          // 즉시 한 번 시도
  setTimeout(initRangeTabIfReady, 300);                                           // 300ms 후 재시도(ensurePanel 완료 대비)
}, { once: true });                                                               // 1회만 등록

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11: 탭 '범위' 추가 및 표시 안정화 (END)                               // 블록 종료 알림
// ===== BLOCK-11: 탭 '범위' 추가 및 표시 안정화 (END)                        // 고정 포맷 종료
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11X: '범위' 탭 Shadow DOM/타이밍 보강 (START)                         // 블록 시작: 보강 섹션
// ===== BLOCK-11X: '범위' 탭 Shadow DOM/타이밍 보강 (START)                  // 고정 포맷 시작
// ─────────────────────────────────────────────────────────────────────────────

/** 모든 루트(document + 열린 shadowRoot)를 순회하여 콜백 수행 */              // 루트 순회 유틸 설명
function djForEachRoot(cb) {                                                     // 유틸 함수 정의
  try {                                                                          // 예외 보호 시작
    const visited = new Set();                                                   // 중복 방지 집합
    function walk(root, depth) {                                                 // 내부 재귀 함수
      if (!root || visited.has(root) || depth > 4) return;                       // 한도/중복 체크(+1 여유)
      visited.add(root);                                                         // 방문 표시
      try { cb(root); } catch {}                                                 // 콜백 실행(예외 무시)
      const list = root.querySelectorAll ? root.querySelectorAll('*') : [];      // 자식 노드들
      list.forEach(n => { if (n.shadowRoot) walk(n.shadowRoot, depth + 1); });   // open shadow 재귀
    }                                                                            // walk 끝
    walk(document, 0);                                                           // 문서부터 시작
    // 닫힌 shadowRoot 목록도 포함(attachShadow 패치에서 수집) ------------------
    try {
      const extra = Array.isArray(window._dj_shadowRoots) ? window._dj_shadowRoots : []; // 수집된 루트
      extra.forEach(r => walk(r, 0));                                            // 닫힌 루트도 순회
    } catch {}                                                                    // 예외 무시
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] djForEachRoot 실패(무시 가능)', e);               // 회피 사유 기록
  }                                                                              // try/catch 끝
}                                                                                // djForEachRoot 끝

/** 특정 루트 내에서만 id로 style 주입 여부 확인 */                             // 스타일 존재 확인 유틸
function djHasStyleInRoot(root, id) {                                            // 함수 정의
  try { return !!(root && root.querySelector && root.querySelector('#' + id)); } // 쿼리로 확인
  catch { return false; }                                                        // 실패 시 false
}                                                                                // djHasStyleInRoot 끝

/** 루트별 탭 스타일 주입 */                                                     // 스타일 주입 보강
function ensureTabStylesInRoot(root) {                                           // 함수 정의
  try {                                                                          // 예외 보호 시작
    // NOTE: Shadow DOM 내부에 통합 스타일을 주입하므로, 루트별 문서 스타일 주입은 중단합니다. // 통합 안내
    return;                                                                      // 즉시 종료
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] ensureTabStylesInRoot 스킵', e);                   // 로그
  }                                                                              // try/catch 끝
}                                                                                // ensureTabStylesInRoot 끝

/** 모든 루트에서 탭바/패널 탐색 후 범위 탭 삽입 */                             // 초기화 보강 설명
function initRangeTabIfReadyAllRoots() {                                         // 함수 정의
  try {                                                                          // 예외 보호 시작
    djForEachRoot((root) => {                                                    // 각 루트 순회
      const tabbar = root.querySelector && (                                     // 탭바 탐색
        root.querySelector('#dj-tabbar') || root.querySelector('.dj-tabbar')
      );                                                                         // 탭바 결과
      const panes = root.querySelector && (                                      // 패널 랩 탐색
        root.querySelector('#dj-panes') || root.querySelector('.dj-panes')
      );                                                                         // 패널 랩 결과
      if (!tabbar || !panes) return;                                             // 없으면 이 루트는 스킵
      ensureTabStylesInRoot(root);                                               // 스타일 루트 주입
      if (!root.querySelector('#dj-tab-range')) {                                // 범위 탭 미존재 시
        try { addRangeTab(tabbar, panes, window.setTab); } catch {}              // 탭/패널 삽입
        console.info('[Downloader] 범위 탭 추가됨');                              // 로그
      }                                                                          // if 끝
    });                                                                          // djForEachRoot 끝
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] initRangeTabIfReadyAllRoots 실패', e);             // 회피 사유 기록
  }                                                                              // try/catch 끝
}                                                                                // initRangeTabIfReadyAllRoots 끝

/** setTab 보강(전 루트): range 토글을 모든 루트에 반영 */                      // setTab 전역 보강 설명
function extendSetTabForRangeAllRoots(originalSetTab) {                          // 래핑 함수
  function toggleInRoot(root, isRange) {                                         // 루트별 토글
    const btn = root.querySelector && root.querySelector('#dj-tab-range');       // 버튼 조회
    const pane = root.querySelector && root.querySelector('#dj-pane-range');     // 패널 조회
    if (!btn || !pane) return;                                                   // 없으면 종료
    const allPanes = root.querySelectorAll ? root.querySelectorAll('.dj-tab-pane') : []; // 모든 패널
    if (isRange) {                                                               // 범위 선택 시
      allPanes.forEach(p => p.setAttribute && p.setAttribute('hidden', ''));     // 전부 숨김
      pane.removeAttribute && pane.removeAttribute('hidden');                    // 범위만 표시
      const tabs = root.querySelectorAll ? root.querySelectorAll('.dj-tabbar .dj-tab') : []; // 탭 버튼
      tabs.forEach(t => t.setAttribute && t.setAttribute('aria-selected', 'false')); // 전부 비선택
      btn.setAttribute && btn.setAttribute('aria-selected', 'true');             // 범위만 선택
    } else {                                                                     // 다른 탭 선택 시
      pane.setAttribute && pane.setAttribute('hidden', '');                      // 범위 숨김
      btn.setAttribute && btn.setAttribute('aria-selected', 'false');            // 비선택
    }                                                                            // if 끝
  }                                                                              // toggleInRoot 끝

  return function setTab(name) {                                                 // 새 setTab
    try {                                                                        // 예외 보호
      if (typeof originalSetTab === 'function') {                                // 원본 존재 시
        try { originalSetTab(name); } catch {}                                   // 원본 먼저 호출
      }                                                                          // if 끝
      const isRange = name === 'range';                                          // 범위 여부 계산
      djForEachRoot((root) => toggleInRoot(root, isRange));                      // 모든 루트에 반영
    } catch (e) {                                                                // 예외 처리
      console.warn('[Downloader] setTab(range)-AllRoots 확장 실패', e);           // 회피 사유
    }                                                                            // try/catch 끝
  };                                                                             // setTab 반환
}                                                                                // extendSetTabForRangeAllRoots 끝

/** 초기 부트스트랩: DOM 준비 후 다회 재시도로 보장 */                          // 부트스트랩 설명
function scheduleRangeTabBootstrap() {                                           // 스케줄러 정의
  if (window._dj_range_bootstrap_scheduled) return;                              // 중복 방지
  window._dj_range_bootstrap_scheduled = true;                                   // 스케줄 플래그
  let count = 0;                                                                 // 시도 횟수
  const timer = setInterval(() => {                                              // 주기적 시도
    try { initRangeTabIfReadyAllRoots(); } catch {}                              // 초기화 시도
    if (++count >= 30) {                                                         // 30회(약 6초) 후 중단
      clearInterval(timer);                                                      // 타이머 해제
    }                                                                            // if 끝
  }, 200);                                                                       // 200ms 간격
}                                                                                // scheduleRangeTabBootstrap 끝

// setTab 전역 보강(한 번만): 모든 루트 반영 ----------------------------------- // setTab 보강 적용 주석
try {                                                                            // 예외 보호
  if (typeof window.setTab === 'function' && !window._dj_wrapped_setTab_range2) { // 중복 래핑 방지
    window._dj_wrapped_setTab_range2 = true;                                     // 플래그 설정
    window.setTab = extendSetTabForRangeAllRoots(window.setTab);                 // 전 루트 반영 래핑
  }                                                                              // if 끝
} catch (e) {                                                                    // 예외 처리
  console.warn('[Downloader] setTab 전역 보강 실패(무시 가능)', e);               // 회피 사유
}                                                                                // try/catch 끝

// DOM 준비 후 부트스트랩 수행 -------------------------------------------------- // 초기 진입 시도 주석
document.addEventListener('DOMContentLoaded', () => {                            // DOMContentLoaded 리스너
  try { initRangeTabIfReadyAllRoots(); } catch {}                                // 즉시 1회 시도
  scheduleRangeTabBootstrap();                                                   // 재시도 스케줄 등록
  try {                                                                          // [추가] 문서 레벨 구식 스타일 정리
    const old = document.getElementById('dj-style-tabs');                        // 구 스타일 태그
    if (old && old.parentNode) old.parentNode.removeChild(old);                  // 제거
  } catch {}                                                                      // 실패 무시
}, { once: true });                                                              // 1회만 등록

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11X: '범위' 탭 Shadow DOM/타이밍 보강 (END)                           // 블록 종료 알림
// ===== BLOCK-11X: '범위' 탭 Shadow DOM/타이밍 보강 (END)                    // 고정 포맷 종료
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11M: Shadow DOM 훅 + 변화 감시로 '범위' 탭 보장 (START)               // 블록 시작: 고급 보강 섹션
// ===== BLOCK-11M: Shadow DOM 훅 + 변화 감시로 '범위' 탭 보장 (START)        // 고정 포맷 시작
// ─────────────────────────────────────────────────────────────────────────────

/** attachShadow를 패치하여 closed shadowRoot도 보관 */                        // attachShadow 패치 설명
(function patchAttachShadowForMap() {                                            // IIFE 시작
  try {                                                                          // 예외 보호 시작
    if (Element.prototype._dj_attachShadowPatched) return;                       // 중복 패치 방지
    const orig = Element.prototype.attachShadow;                                 // 원본 보관
    const roots = [];                                                            // 생성된 shadowRoot 목록(열거용)
    const owners = new WeakMap();                                                // 호스트→루트 매핑(조회용)
    Element.prototype.attachShadow = function(init) {                            // 패치된 attachShadow
      const root = orig.call(this, init);                                        // 원본 호출로 루트 생성
      try { owners.set(this, root); roots.push(root); } catch {}                 // 매핑/목록에 보관
      try { if (typeof djObserveRoot === 'function') djObserveRoot(root); } catch {} // 감시자 연결 시도
      return root;                                                               // 생성 루트 반환
    };                                                                           // 패치 끝
    Element.prototype._dj_attachShadowPatched = true;                            // 패치 플래그
    window._dj_shadowRoots = roots;                                              // 전역에 루트 목록 노출
    window._dj_shadowOwners = owners;                                            // 전역에 매핑 노출
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] attachShadow 패치 실패(무시 가능)', e);            // 회피 사유 기록
  }                                                                              // try/catch 끝
})();                                                                            // patchAttachShadowForMap 끝

/** 루트별 MutationObserver를 설치하여 탭 생성 시점에 주입 */                   // 변화 감시 설명
const _dj_rootObservers = new WeakMap();                                         // 루트→옵저버 매핑
function djObserveRoot(root) {                                                   // 옵저버 설치 함수
  try {                                                                          // 예외 보호 시작
    if (!root || _dj_rootObservers.has(root)) return;                            // 중복 설치 방지
    const obs = new MutationObserver(() => {                                     // 옵저버 콜백 정의
      try { initRangeTabIfReadyAllRoots(); } catch {}                            // 탭 주입 시도
    });                                                                          // 콜백 끝
    obs.observe(root, { childList: true, subtree: true });                       // 자식/하위 감시 시작
    _dj_rootObservers.set(root, obs);                                            // 매핑에 저장
  } catch (e) {                                                                  // 예외 처리
    console.warn('[Downloader] djObserveRoot 설치 실패(무시 가능)', e);           // 회피 사유 기록
  }                                                                              // try/catch 끝
}                                                                                // djObserveRoot 끝

/** 초기 진입 시 모든 루트에 옵저버 설치 */                                      // 초기 옵저버 설치 설명
document.addEventListener('DOMContentLoaded', () => {                            // DOMContentLoaded 리스너
  try { djForEachRoot((r) => djObserveRoot(r)); } catch {}                       // 기존/중첩 루트 모두 설치
}, { once: true });                                                              // 1회만 실행

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-11M: Shadow DOM 훅 + 변화 감시로 '범위' 탭 보장 (END)                 // 블록 종료 알림
// ===== BLOCK-11M: Shadow DOM 훅 + 변화 감시로 '범위' 탭 보장 (END)          // 고정 포맷 종료
// ─────────────────────────────────────────────────────────────────────────────
