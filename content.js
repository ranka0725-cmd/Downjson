/********************************************************************** // [파일 헤더 시작]
 * Downjson Content Script (Shadow DOM)                                 // 파일명/목적
 * 기능 번호 체계: 01 상위 기능, 01-01 하위 기능                         // 번호 규칙
 * - 01 패널 토글/표시                                                    // 상위 기능 01
 * - 02 선택모드                                                          // 상위 기능 02
 * - 03 선택자/텍스트 처리                                                // 상위 기능 03
 * - 04 저장/불러오기                                                     // 상위 기능 04
 * - 05 아키텍처/초기화                                                   // 상위 기능 05
 **********************************************************************/ // [파일 헤더 끝]

/* ============================== [섹션 시작 05-02] 스타일 정의 ============================== */ // 섹션 번호: 05-02
const STYLE_CSS = `                                   // 05-02-01: Shadow DOM 내부에 적용할 CSS 시작
  .downjson-panel { position: fixed; top: 16px; right: 16px; z-index: 2147483647;     /* 05-02-01-01 */
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;               /* 05-02-01-02 */
    background:#111; color:#fff; border:1px solid #333; border-radius:12px;           /* 05-02-01-03 */
    box-shadow:0 6px 24px rgba(0,0,0,.35); width: 360px; overflow: hidden; }           /* 05-02-01-04 */
  .downjson-header { display:flex; align-items:center; justify-content:space-between;  /* 05-02-01-05 */
    padding:10px 12px; border-bottom:1px solid #333; }                                  /* 05-02-01-06 */
  .downjson-title { font-weight:700; font-size:14px; }                                  /* 05-02-01-07 */
  .downjson-min { background:#0b1220; border:1px solid #374151; color:#e5e7eb;         /* 05-02-01-08 */
    font-size:12px; padding:4px 8px; border-radius:6px; cursor:pointer; }               /* 05-02-01-09 */
  .downjson-btns { display:flex; gap:6px; flex-wrap: wrap; padding:10px 12px; }        /* 05-02-01-10 */
  .downjson-btn { flex: 1 1 auto; padding:8px 10px; font-size:12px; background:#1f2937;/* 05-02-01-11 */
    color:#fff; border:1px solid #374151; border-radius:8px; cursor:pointer; }          /* 05-02-01-12 */
  .downjson-btn:hover { background:#374151; }                                           /* 05-02-01-13 */
  .downjson-row { padding:10px 12px; border-top:1px solid #222; }                       /* 05-02-01-14 */
  .downjson-input { width:100%; padding:8px; border-radius:8px; border:1px solid #374151;/* 05-02-01-15 */
    background:#0b1220; color:#e5e7eb; font-size:12px; }                                 /* 05-02-01-16 */
  .downjson-caption { font-size:11px; color:#9ca3af; margin-top:6px; line-height:1.3; } /* 05-02-01-17 */
  .downjson-badge { display:inline-block; font-size:11px; padding:2px 6px;              /* 05-02-01-18 */
    border:1px solid #374151; border-radius:9999px; margin-left:6px; color:#cbd5e1; }    /* 05-02-01-19 */
  .downjson-pre { white-space: pre-wrap; background:#0b1220; color:#e5e7eb; padding:8px;/* 05-02-01-20 */
    border:1px solid #374151; border-radius:8px; max-height:180px; overflow:auto; font-size:12px; } /* 05-02-01-21 */
  .downjson-hidden { display:none !important; }                                          /* 05-02-01-22 */
  .downjson-hoverbox { position: fixed; pointer-events:none; border:2px solid #60a5fa;  /* 05-02-01-23 */
    background: rgba(96,165,250,.12); z-index:2147483646; border-radius:4px; }           /* 05-02-01-24 */
`;                                                 // 05-02-02: CSS 문자열 종료
/* ============================== [섹션 끝 05-02] 스타일 정의 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 05-01] Shadow Host 구성 ============================== */ // 섹션 번호: 05-01
let hostEl = null;                                   // 05-01-01: Shadow 호스트 div 참조
let shadowRoot = null;                               // 05-01-02: ShadowRoot 참조
/* ============================== [섹션 끝 05-01] Shadow Host 구성 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 01-03] 패널 전역/상태 ============================== */ // 섹션 번호: 01-03
let downjsonPanel = null;                            // 01-03-01: 패널 루트
let downjsonMinimized = false;                       // 01-03-02: 최소화 상태
/* ============================== [섹션 끝 01-03] 패널 전역/상태 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 02-01] 선택모드/하이라이트 상태 ============================== */ // 섹션 번호: 02-01
let selectionActive = false;                         // 02-01-01: 선택모드 on/off
let hoveredEl = null;                                // 02-01-02: 현재 호버 요소
let selectedEl = null;                               // 02-01-03: 클릭 선택 요소
let hoverBox = null;                                 // 02-04-01: 하이라이트 박스
/* ============================== [섹션 끝 02-01] 선택모드/하이라이트 상태 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 04-01] 저장용 상수 ============================== */ // 섹션 번호: 04-01
const HOST_KEY = location.host;                      // 04-01-01: 도메인 키(저장 기준)
/* ============================== [섹션 끝 04-01] 저장용 상수 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 03-01] 유틸: 선택자/텍스트 ============================== */ // 섹션 번호: 03-01
function escId(id) {                                  // 03-01-00: ID 이스케이프
  return `#${CSS.escape(id)}`;                        // 03-01-00-01
}                                                     // 03-01-00-02

function getUniqueSelector(el) {                      // 03-01-01: 고유 CSS 선택자 생성
  if (!el || el.nodeType !== 1) return "";            // 03-01-01-01
  if (el.id) return escId(el.id);                     // 03-01-01-02
  const path = [];                                    // 03-01-01-03
  let node = el;                                      // 03-01-01-04
  while (node && node.nodeType === 1 && node !== document.documentElement) { // 03-01-01-05
    const tag = node.tagName.toLowerCase();           // 03-01-01-06
    const cls = (node.classList?.[0]) ? `.${CSS.escape(node.classList[0])}` : ""; // 03-01-01-07
    let nth = 1;                                      // 03-01-01-08
    let sib = node;                                   // 03-01-01-09
    while ((sib = sib.previousElementSibling)) {      // 03-01-01-10
      if (sib.tagName === node.tagName) nth++;        // 03-01-01-11
    }                                                 // 03-01-01-12
    path.unshift(`${tag}${cls}:nth-of-type(${nth})`); // 03-01-01-13
    if (node.parentElement === document.body) break;  // 03-01-01-14
    node = node.parentElement;                        // 03-01-01-15
  }                                                   // 03-01-01-16
  return path.join(" > ");                            // 03-01-01-17
}                                                     // 03-01-01-18

function getTextWithBreaks(el) {                      // 03-02-01: <br> 줄바꿈 유지 텍스트
  const clone = el.cloneNode(true);                   // 03-02-01-01
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n")); // 03-02-01-02
  return clone.innerText.trim();                      // 03-02-01-03
}                                                     // 03-02-01-04
/* ============================== [섹션 끝 03-01] 유틸: 선택자/텍스트 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 04-01] 유틸: 저장/불러오기 ============================== */ // 섹션 번호: 04-01
async function saveSelectorForSite(selector) {        // 04-01-02: 저장
  const data = await chrome.storage.local.get(HOST_KEY); // 04-01-02-01
  const list = Array.isArray(data[HOST_KEY]) ? data[HOST_KEY] : []; // 04-01-02-02
  if (!list.includes(selector)) list.push(selector);  // 04-01-02-03
  await chrome.storage.local.set({ [HOST_KEY]: list });// 04-01-02-04
  return list;                                        // 04-01-02-05
}                                                     // 04-01-02-06

async function loadSelectorsForSite() {               // 04-02-01: 불러오기
  const data = await chrome.storage.local.get(HOST_KEY); // 04-02-01-01
  return Array.isArray(data[HOST_KEY]) ? data[HOST_KEY] : []; // 04-02-01-02
}                                                     // 04-02-01-03
/* ============================== [섹션 끝 04-01] 유틸: 저장/불러오기 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 02-04] 하이라이트 박스 ============================== */ // 섹션 번호: 02-04
function ensureHoverBox() {                           // 02-04-02: 박스 생성 보장
  if (hoverBox) return hoverBox;                      // 02-04-02-01
  hoverBox = document.createElement("div");           // 02-04-02-02
  hoverBox.className = "downjson-hoverbox";           // 02-04-02-03
  document.documentElement.appendChild(hoverBox);     // 02-04-02-04
  return hoverBox;                                    // 02-04-02-05
}                                                     // 02-04-02-06

function updateHoverBoxFor(el) {                      // 02-02-01: 박스 위치/크기 갱신
  if (!el) {                                          // 02-02-01-01
    if (hoverBox) hoverBox.classList.add("downjson-hidden"); // 02-02-01-02
    return;                                           // 02-02-01-03
  }                                                   // 02-02-01-04
  ensureHoverBox();                                   // 02-02-01-05
  const r = el.getBoundingClientRect();               // 02-02-01-06
  hoverBox.style.left = `${Math.round(r.left + scrollX)}px`;  // 02-02-01-07
  hoverBox.style.top = `${Math.round(r.top + scrollY)}px`;    // 02-02-01-08
  hoverBox.style.width = `${Math.round(r.width)}px`;           // 02-02-01-09
  hoverBox.style.height = `${Math.round(r.height)}px`;         // 02-02-01-10
  hoverBox.classList.remove("downjson-hidden");       // 02-02-01-11
}                                                     // 02-02-01-12
/* ============================== [섹션 끝 02-04] 하이라이트 박스 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 02-02/02-03] 선택모드 이벤트 ============================== */ // 섹션 번호: 02-02/02-03
function onMouseMove(e) {                             // 02-02-02: 마우스 이동
  if (!selectionActive) return;                       // 02-02-02-01
  hoveredEl = e.target;                               // 02-02-02-02
  updateHoverBoxFor(hoveredEl);                       // 02-02-02-03
}                                                     // 02-02-02-04

function onClick(e) {                                 // 02-03-01: 클릭으로 선택 확정
  if (!selectionActive) return;                       // 02-03-01-01
  e.preventDefault();                                  // 02-03-01-02
  e.stopPropagation();                                 // 02-03-01-03
  selectedEl = e.target;                               // 02-03-01-04
  updateHoverBoxFor(selectedEl);                       // 02-03-01-05
  toggleSelection(false);                              // 02-03-01-06
  const input = shadowRoot.getElementById("downjson-selector-input"); // 02-03-01-07
  if (input && selectedEl) input.value = getUniqueSelector(selectedEl); // 02-03-01-08
  updatePreview();                                     // 03-05-01
}                                                     // 02-03-01-09

function toggleSelection(force) {                     // 02-01-02: 선택모드 토글
  selectionActive = typeof force === "boolean" ? force : !selectionActive; // 02-01-02-01
  if (selectionActive) {                              // 02-01-02-02
    document.addEventListener("mousemove", onMouseMove, true); // 02-01-02-03
    document.addEventListener("click", onClick, true);         // 02-01-02-04
  } else {                                            // 02-01-02-05
    document.removeEventListener("mousemove", onMouseMove, true); // 02-01-02-06
    document.removeEventListener("click", onClick, true);         // 02-01-02-07
    updateHoverBoxFor(selectedEl || null);            // 02-01-02-08
  }                                                   // 02-01-02-09
}                                                     // 02-01-02-10
/* ============================== [섹션 끝 02-02/02-03] 선택모드 이벤트 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 05-01] Shadow Host 보장 ============================== */ // 섹션 번호: 05-01
function ensureShadowHost() {                          // 05-01-03: Host/스타일 보장
  if (hostEl && shadowRoot) return;                    // 05-01-03-01
  hostEl = document.createElement("div");              // 05-01-03-02
  hostEl.id = "downjson-host";                         // 05-01-03-03
  document.documentElement.appendChild(hostEl);        // 05-01-03-4
  shadowRoot = hostEl.attachShadow({ mode: "open" });  // 05-01-03-05
  const style = document.createElement("style");       // 05-02-03-01
  style.textContent = STYLE_CSS;                       // 05-02-03-02
  shadowRoot.appendChild(style);                       // 05-02-03-03
}                                                      // 05-01-03-06
/* ============================== [섹션 끝 05-01] Shadow Host 보장 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 01-03/01-04] 패널 생성/토글 ============================== */ // 섹션 번호: 01-03/01-04
function createPanel() {                               // 01-03-01: 패널 생성
  if (downjsonPanel) return downjsonPanel;             // 01-03-01-01
  ensureShadowHost();                                  // 05-01-03-07

  const panel = document.createElement("div");         // 01-03-01-02
  panel.className = "downjson-panel";                  // 01-03-01-03
  panel.id = "downjson-panel";                         // 01-03-01-04

  const header = document.createElement("div");        // 01-03-01-05
  header.className = "downjson-header";                // 01-03-01-06
  const title = document.createElement("div");         // 01-03-01-07
  title.className = "downjson-title";                  // 01-03-01-08
  title.textContent = "Downjson 패널";                  // 01-03-01-09
  const minBtn = document.createElement("button");     // 01-04-01-01
  minBtn.className = "downjson-min";                   // 01-04-01-02
  minBtn.textContent = "최소화";                        // 01-04-01-03

  const btns = document.createElement("div");          // 01-03-01-10
  btns.className = "downjson-btns";                    // 01-03-01-11
  const btnSelect = document.createElement("button");  // 02-01-03-01
  btnSelect.className = "downjson-btn";                // 02-01-03-02
  btnSelect.textContent = "선택모드";                   // 02-01-03-03
  const btnCopySel = document.createElement("button"); // 03-03-01-01
  btnCopySel.className = "downjson-btn";               // 03-03-01-02
  btnCopySel.textContent = "복사(선택자)";              // 03-03-01-03
  const btnCopyText = document.createElement("button");// 03-04-01-01
  btnCopyText.className = "downjson-btn";              // 03-04-01-02
  btnCopyText.textContent = "복사(텍스트)";             // 03-04-01-03
  const btnSave = document.createElement("button");    // 04-03-01-01
  btnSave.className = "downjson-btn";                  // 04-03-01-02
  btnSave.textContent = "저장(도메인별)";               // 04-03-01-03

  const rowSel = document.createElement("div");        // 01-03-01-12
  rowSel.className = "downjson-row";                   // 01-03-01-13
  const inputSel = document.createElement("input");    // 01-03-01-14
  inputSel.className = "downjson-input";               // 01-03-01-15
  inputSel.placeholder = "여기에 선택자 표시 (수정 가능)"; // 01-03-01-16
  inputSel.id = "downjson-selector-input";             // 01-03-01-17

  const rowPreview = document.createElement("div");    // 03-05-02-01
  rowPreview.className = "downjson-row";               // 03-05-02-02
  const preview = document.createElement("div");       // 03-05-02-03
  preview.innerHTML = `<div class="downjson-caption">미리보기 (선택자 / 텍스트)</div>`; // 03-05-02-04
  const preSel = document.createElement("pre");        // 03-05-02-05
  preSel.className = "downjson-pre";                   // 03-05-02-06
  preSel.id = "downjson-preview-selector";             // 03-05-02-07
  const preTxt = document.createElement("pre");        // 03-05-02-08
  preTxt.className = "downjson-pre";                   // 03-05-02-09
  preTxt.id = "downjson-preview-text";                 // 03-05-02-10

  const rowCap = document.createElement("div");        // 01-03-01-18
  rowCap.className = "downjson-row";                   // 01-03-01-19
  const cap = document.createElement("div");           // 01-03-01-20
  cap.className = "downjson-caption";                  // 01-03-01-21
  cap.innerHTML = `아이콘 또는 <b>Alt+Shift+X</b>로 패널 토글 · "선택모드" 후 요소 클릭 → 선택자/텍스트가 아래 미리보기에 즉시 표시됩니다.
    <span class="downjson-badge">줄바꿈 유지</span><span class="downjson-badge">도메인별 저장</span>`; // 01-03-01-22

  header.appendChild(title);                           // 01-03-01-23
  header.appendChild(minBtn);                          // 01-03-01-24
  btns.appendChild(btnSelect);                         // 01-03-01-25
  btns.appendChild(btnCopySel);                        // 01-03-01-26
  btns.appendChild(btnCopyText);                       // 01-03-01-27
  btns.appendChild(btnSave);                           // 01-03-01-28
  rowSel.appendChild(inputSel);                        // 01-03-01-29
  rowPreview.appendChild(preview);                     // 03-05-02-11
  rowPreview.appendChild(preSel);                      // 03-05-02-12
  rowPreview.appendChild(preTxt);                      // 03-05-02-13
  rowCap.appendChild(cap);                             // 01-03-01-30
  panel.appendChild(header);                           // 01-03-01-31
  panel.appendChild(btns);                             // 01-03-01-32
  panel.appendChild(rowSel);                           // 01-03-01-33
  panel.appendChild(rowPreview);                       // 03-05-02-14
  panel.appendChild(rowCap);                           // 01-03-01-34
  shadowRoot.appendChild(panel);                       // 05-01-03-08

  minBtn.addEventListener("click", () => {             // 01-04-01-04: 최소화/펼치기
    downjsonMinimized = !downjsonMinimized;            // 01-04-01-05
    btns.classList.toggle("downjson-hidden", downjsonMinimized);      // 01-04-01-06
    rowSel.classList.toggle("downjson-hidden", downjsonMinimized);    // 01-04-01-07
    rowPreview.classList.toggle("downjson-hidden", downjsonMinimized);// 01-04-01-08
    rowCap.classList.toggle("downjson-hidden", downjsonMinimized);    // 01-04-01-09
    minBtn.textContent = downjsonMinimized ? "펼치기" : "최소화";     // 01-04-01-10
  });                                                // 01-04-01-11

  btnSelect.addEventListener("click", () => {          // 02-01-03-04: 선택모드 버튼
    toggleSelection();                                  // 02-01-03-05
    btnSelect.textContent = selectionActive ? "선택모드 해제" : "선택모드"; // 02-01-03-06
  });                                                // 02-01-03-07

  btnCopySel.addEventListener("click", async () => {   // 03-03-01-04: 선택자 복사
    const sel = inputSel.value?.trim() || (selectedEl ? getUniqueSelector(selectedEl) : ""); // 03-03-01-05
    if (!sel) return alert("선택자가 없습니다. 먼저 요소를 선택하세요."); // 03-03-01-06
    await navigator.clipboard.writeText(sel);          // 03-03-01-07
    alert("선택자를 클립보드에 복사했습니다.");            // 03-03-01-08
  });                                                // 03-03-01-09

  btnCopyText.addEventListener("click", async () => {  // 03-04-01-04: 텍스트 복사
    let el = selectedEl;                                // 03-04-01-05
    if (!el) {                                         // 03-04-01-06
      const sel = inputSel.value?.trim();              // 03-04-01-07
      if (sel) el = document.querySelector(sel);       // 03-04-01-08
    }                                                  // 03-04-01-09
    if (!el) return alert("복사할 요소가 없습니다. 먼저 선택하거나 선택자를 입력하세요."); // 03-04-01-10
    const text = getTextWithBreaks(el);                // 03-04-01-11
    await navigator.clipboard.writeText(text);         // 03-04-01-12
    alert("텍스트를 클립보드에 복사했습니다.");            // 03-04-01-13
  });                                                // 03-04-01-14

  btnSave.addEventListener("click", async () => {      // 04-03-01-04: 저장 버튼
    const sel = inputSel.value?.trim();                // 04-03-01-05
    if (!sel) return alert("저장할 선택자가 없습니다.");   // 04-03-01-06
    const list = await saveSelectorForSite(sel);       // 04-03-01-07
    alert(`[${HOST_KEY}] 저장됨\n현재 목록:\n- ` + list.join("\n- ")); // 04-03-01-08
  });                                                // 04-03-01-09

  downjsonPanel = panel;                               // 01-03-01-35
  loadSelectorsForSite().then((list) => {              // 04-02-01-04
    if (list[0]) inputSel.value = list[0];             // 04-02-01-05
    updatePreview();                                   // 03-05-01-02
  });                                                // 04-02-01-06

  return panel;                                        // 01-03-01-36
}                                                      // 01-03-01-37

function togglePanel() {                               // 01-03-02: 패널 토글
  const panel = createPanel();                         // 01-03-02-01
  const hidden = panel.classList.toggle("downjson-hidden"); // 01-03-02-02
  if (hidden) updateHoverBoxFor(null);                 // 01-03-02-03
  if (!hidden && downjsonMinimized) {                  // 01-03-02-04
    downjsonMinimized = false;                         // 01-03-02-05
    shadowRoot.querySelectorAll(".downjson-btns,.downjson-row")      // 01-03-02-06
      .forEach(el => el.classList.remove("downjson-hidden"));        // 01-03-02-07
  }                                                    // 01-03-02-08
}                                                      // 01-03-02-09
/* ============================== [섹션 끝 01-03/01-04] 패널 생성/토글 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 03-05] 미리보기 ============================== */ // 섹션 번호: 03-05
function updatePreview() {                             // 03-05-01: 프리뷰 갱신
  if (!shadowRoot) return;                             // 03-05-01-01
  const input = shadowRoot.getElementById("downjson-selector-input"); // 03-05-01-02
  const preSel = shadowRoot.getElementById("downjson-preview-selector"); // 03-05-01-03
  const preTxt = shadowRoot.getElementById("downjson-preview-text");     // 03-05-01-04
  if (!input || !preSel || !preTxt) return;           // 03-05-01-05

  const sel = input.value?.trim() || (selectedEl ? getUniqueSelector(selectedEl) : ""); // 03-05-01-06
  preSel.textContent = sel || "(선택자 없음)";         // 03-05-01-07

  let el = selectedEl;                                 // 03-05-01-08
  if (!el && sel) el = document.querySelector(sel);    // 03-05-01-09
  preTxt.textContent = el ? getTextWithBreaks(el) : "(텍스트 없음)"; // 03-05-01-10
}                                                     // 03-05-01-11
/* ============================== [섹션 끝 03-05] 미리보기 ============================== */ // 섹션 끝

/* ============================== [섹션 시작 05-03/05-04] 메시지 & 초기화 ============================== */ // 섹션 번호: 05-03/05-04
chrome.runtime.onMessage.addListener((msg) => {        // 05-03-01: 메시지 수신
  if (msg?.type === "DOWNJSON_TOGGLE_PANEL") {         // 05-03-01-01
    togglePanel();                                     // 01-03-02-10
  }                                                    // 05-03-01-02
});                                                    // 05-03-01-03

(function init() {                                     // 05-04-01: 초기화 IIFE
  ensureShadowHost();                                  // 05-01-03-09
  ensureHoverBox();                                    // 02-04-02-07
  createPanel();                                       // 01-03-01-38
})();                                                  // 05-04-01-01
/* ============================== [섹션 끝 05-03/05-04] 메시지 & 초기화 ============================== */ // 섹션 끝
