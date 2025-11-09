/********************************************************************** // [파일 헤더 시작]
 * Downjson Content Script (Shadow DOM · v0.1.4 frames+diag)            // 파일/버전
 * - 모든 줄 주석 / 기능 번호 표기                                       // 규칙
 * - iframe 포함(all_frames:true) 환경에서도 동작                         // 특징
 **********************************************************************/ // [파일 헤더 끝]

/* ============================== [섹션 99-LOG] 로그 유틸 ============================== */
function log(...a){try{console.log("[Downjson]",...a)}catch{}}             // 99-LOG-01
function warn(...a){try{console.warn("[Downjson]",...a)}catch{}}           // 99-LOG-02
/* ============================== [섹션 끝 99-LOG] ===================================== */

/* ============================== [섹션 05-02] 스타일 정의 ============================== */
const STYLE_CSS = `                                                         /* 05-02-01 */
  .downjson-panel { position: fixed; top: 16px; right: 16px; z-index: 2147483647;      /* 05-02-01-01 */
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
`;                                                                                       /* 05-02-02 */
/* ============================== [섹션 끝 05-02] ====================================== */

/* ============================== [섹션 05-01] Shadow Host 구성 ============================== */
let hostEl = null;                                                                          // 05-01-01
let shadowRoot = null;                                                                      // 05-01-02
/* ============================== [섹션 끝 05-01] ============================================ */

/* ============================== [섹션 01-03] 패널 전역/상태 ============================== */
let downjsonPanel = null;                                                                   // 01-03-01
let downjsonMinimized = false;                                                              // 01-03-02
/* ============================== [섹션 끝 01-03] =========================================== */

/* ============================== [섹션 02-01] 선택모드/하이라이트 상태 ============================== */
let selectionActive = false;                                                                // 02-01-01
let hoveredEl = null;                                                                       // 02-01-02
let selectedEl = null;                                                                      // 02-01-03
let hoverBox = null;                                                                        // 02-01-04
/* ============================== [섹션 끝 02-01] ============================================== */

/* ============================== [섹션 04-01] 저장용 상수 ============================== */
const HOST_KEY = location.host;                                                             // 04-01-01
/* ============================== [섹션 끝 04-01] ======================================== */

/* ============================== [섹션 03-01] 유틸: 선택자/텍스트 ============================== */
function escId(id){ return `#${CSS.escape(id)}` }                                           // 03-01-00
function getUniqueSelector(el){                                                             // 03-01-01
  if(!el || el.nodeType!==1) return "";                                                     // 03-01-01-01
  if(el.id) return escId(el.id);                                                            // 03-01-01-02
  const path=[]; let node=el;                                                               // 03-01-01-03
  while(node && node.nodeType===1 && node!==document.documentElement){                      // 03-01-01-04
    const tag=node.tagName.toLowerCase();                                                   // 03-01-01-05
    const cls=(node.classList?.[0])?`.${CSS.escape(node.classList[0])}`:"";                 // 03-01-01-06
    let nth=1, sib=node; while((sib=sib.previousElementSibling)){ if(sib.tagName===node.tagName) nth++; } //03-01-01-07
    path.unshift(`${tag}${cls}:nth-of-type(${nth})`);                                       // 03-01-01-08
    if(node.parentElement===document.body) break;                                           // 03-01-01-09
    node=node.parentElement;                                                                // 03-01-01-10
  }                                                                                         // 03-01-01-11
  return path.join(" > ");                                                                  // 03-01-01-12
}
function getTextWithBreaks(el){                                                             // 03-02-01
  const c=el.cloneNode(true);                                                               // 03-02-01-01
  c.querySelectorAll("br").forEach(b=>b.replaceWith("\n"));                                 // 03-02-01-02
  return c.innerText.trim();                                                                // 03-02-01-03
}
async function saveSelectorForSite(selector){                                               // 04-01-02
  const d=await chrome.storage.local.get(HOST_KEY);                                         // 04-01-02-01
  const list=Array.isArray(d[HOST_KEY])?d[HOST_KEY]:[];                                     // 04-01-02-02
  if(!list.includes(selector)) list.push(selector);                                         // 04-01-02-03
  await chrome.storage.local.set({[HOST_KEY]:list});                                        // 04-01-02-04
  return list;                                                                              // 04-01-02-05
}
async function loadSelectorsForSite(){                                                      // 04-02-01
  const d=await chrome.storage.local.get(HOST_KEY);                                         // 04-02-01-01
  return Array.isArray(d[HOST_KEY])?d[HOST_KEY]:[];                                         // 04-02-01-02
}
/* ============================== [섹션 끝 03-01] ====================================== */

/* ============================== [섹션 02-04] 하이라이트 박스 ============================== */
function ensureHoverBox(){                                                                  // 02-04-01
  if(hoverBox) return hoverBox;                                                             // 02-04-01-01
  hoverBox=document.createElement("div");                                                   // 02-04-01-02
  hoverBox.className="downjson-hoverbox";                                                  // 02-04-01-03
  document.documentElement.appendChild(hoverBox);                                          // 02-04-01-04
  return hoverBox;                                                                          // 02-04-01-05
}
function updateHoverBoxFor(el){                                                             // 02-02-01
  if(!el){ if(hoverBox) hoverBox.classList.add("downjson-hidden"); return }                 // 02-02-01-01
  ensureHoverBox();                                                                         // 02-02-01-02
  const r=el.getBoundingClientRect();                                                       // 02-02-01-03
  hoverBox.style.left=`${Math.round(r.left+scrollX)}px`;                                    // 02-02-01-04
  hoverBox.style.top=`${Math.round(r.top+scrollY)}px`;                                      // 02-02-01-05
  hoverBox.style.width=`${Math.round(r.width)}px`;                                          // 02-02-01-06
  hoverBox.style.height=`${Math.round(r.height)}px`;                                        // 02-02-01-07
  hoverBox.classList.remove("downjson-hidden");                                             // 02-02-01-08
}
/* ============================== [섹션 끝 02-04] ====================================== */

/* ============================== [섹션 02-02/02-03] 선택모드 이벤트 ============================== */
function onMouseMove(e){ if(!selectionActive) return; hoveredEl=e.target; updateHoverBoxFor(hoveredEl) } // 02-02-02
function onClick(e){                                                                          // 02-03-01
  if(!selectionActive) return;                                                                // 02-03-01-01
  e.preventDefault(); e.stopPropagation();                                                    // 02-03-01-02
  selectedEl=e.target; updateHoverBoxFor(selectedEl);                                         // 02-03-01-03
  toggleSelection(false);                                                                     // 02-03-01-04
  const input=shadowRoot.getElementById("downjson-selector-input");                           // 02-03-01-05
  if(input && selectedEl) input.value=getUniqueSelector(selectedEl);                          // 02-03-01-06
  updatePreview();                                                                            // 02-03-01-07
}
function toggleSelection(force){                                                              // 02-01-02
  selectionActive=typeof force==="boolean"?force:!selectionActive;                            // 02-01-02-01
  if(selectionActive){                                                                        // 02-01-02-02
    document.addEventListener("mousemove",onMouseMove,true);                                  // 02-01-02-03
    document.addEventListener("click",onClick,true);                                          // 02-01-02-04
  }else{                                                                                      // 02-01-02-05
    document.removeEventListener("mousemove",onMouseMove,true);                               // 02-01-02-06
    document.removeEventListener("click",onClick,true);                                       // 02-01-02-07
    updateHoverBoxFor(selectedEl||null);                                                      // 02-01-02-08
  }                                                                                           // 02-01-02-09
}
/* ============================== [섹션 끝 02-02/02-03] ================================= */

/* ============================== [섹션 05-01] Shadow Host 보장 ============================== */
function ensureShadowHost(){                                                                  // 05-01-03
  if(shadowRoot && hostEl && document.contains(hostEl)) return;                               // 05-01-03-01
  const exist=document.getElementById("downjson-host");                                       // 05-01-03-02
  if(exist && exist.shadowRoot){ hostEl=exist; shadowRoot=exist.shadowRoot; return }          // 05-01-03-03
  hostEl=document.createElement("div");                                                       // 05-01-03-04
  hostEl.id="downjson-host";                                                                  // 05-01-03-05
  document.documentElement.appendChild(hostEl);                                               // 05-01-03-06
  shadowRoot=hostEl.attachShadow({mode:"open"});                                              // 05-01-03-07
  const style=document.createElement("style"); style.textContent=STYLE_CSS; shadowRoot.appendChild(style); // 05-02-03
}
/* ============================== [섹션 끝 05-01] ======================================= */

/* ============================== [섹션 01-03/01-04] 패널 생성/토글 ============================== */
function createPanel(){                                                                       // 01-03-01
  ensureShadowHost();                                                                         // 01-03-01-01
  if(downjsonPanel && shadowRoot.contains(downjsonPanel)) return downjsonPanel;               // 01-03-01-02
  const panel=document.createElement("div"); panel.className="downjson-panel"; panel.id="downjson-panel"; // 01-03-01-03
  const header=document.createElement("div"); header.className="downjson-header";             // 01-03-01-04
  const title=document.createElement("div"); title.className="downjson-title"; title.textContent="Downjson 패널"; // 01-03-01-05
  const minBtn=document.createElement("button"); minBtn.className="downjson-min"; minBtn.textContent="최소화"; // 01-04-01
  const btns=document.createElement("div"); btns.className="downjson-btns";                   // 01-03-01-06
  const btnSelect=document.createElement("button"); btnSelect.className="downjson-btn"; btnSelect.textContent="선택모드"; // 02-01-03
  const btnCopySel=document.createElement("button"); btnCopySel.className="downjson-btn"; btnCopySel.textContent="복사(선택자)"; // 03-03-01
  const btnCopyText=document.createElement("button"); btnCopyText.className="downjson-btn"; btnCopyText.textContent="복사(텍스트)"; // 03-04-01
  const btnSave=document.createElement("button"); btnSave.className="downjson-btn"; btnSave.textContent="저장(도메인별)"; // 04-03-01
  const rowSel=document.createElement("div"); rowSel.className="downjson-row";                // 01-03-01-07
  const inputSel=document.createElement("input"); inputSel.className="downjson-input"; inputSel.placeholder="여기에 선택자 표시 (수정 가능)"; inputSel.id="downjson-selector-input"; // 01-03-01-08
  const rowPreview=document.createElement("div"); rowPreview.className="downjson-row";        // 03-05-02
  const preview=document.createElement("div"); preview.innerHTML=`<div class="downjson-caption">미리보기 (선택자 / 텍스트)</div>`; // 03-05-02-01
  const preSel=document.createElement("pre"); preSel.className="downjson-pre"; preSel.id="downjson-preview-selector"; // 03-05-02-02
  const preTxt=document.createElement("pre"); preTxt.className="downjson-pre"; preTxt.id="downjson-preview-text"; // 03-05-02-03

  header.appendChild(title); header.appendChild(minBtn);                                      // 01-03-01-09
  btns.appendChild(btnSelect); btns.appendChild(btnCopySel); btns.appendChild(btnCopyText); btns.appendChild(btnSave); // 01-03-01-10
  rowSel.appendChild(inputSel);                                                               // 01-03-01-11
  rowPreview.appendChild(preview); rowPreview.appendChild(preSel); rowPreview.appendChild(preTxt); // 03-05-02-04
  panel.appendChild(header); panel.appendChild(btns); panel.appendChild(rowSel); panel.appendChild(rowPreview); // 01-03-01-12
  shadowRoot.appendChild(panel);                                                              // 01-03-01-13

  minBtn.addEventListener("click",()=>{                                                       // 01-04-01-01
    downjsonMinimized=!downjsonMinimized;                                                     // 01-04-01-02
    btns.classList.toggle("downjson-hidden",downjsonMinimized);                               // 01-04-01-03
    rowSel.classList.toggle("downjson-hidden",downjsonMinimized);                             // 01-04-01-04
    rowPreview.classList.toggle("downjson-hidden",downjsonMinimized);                         // 01-04-01-05
    minBtn.textContent=downjsonMinimized?"펼치기":"최소화";                                   // 01-04-01-06
  });

  btnSelect.addEventListener("click",()=>{                                                    // 02-01-03-04
    toggleSelection(); btnSelect.textContent=selectionActive?"선택모드 해제":"선택모드";       // 02-01-03-05
  });

  btnCopySel.addEventListener("click",async()=>{                                              // 03-03-01-04
    const sel=inputSel.value?.trim()||(selectedEl?getUniqueSelector(selectedEl):"");          // 03-03-01-05
    if(!sel) return alert("선택자가 없습니다. 먼저 요소를 선택하세요.");                         // 03-03-01-06
    await navigator.clipboard.writeText(sel); alert("선택자를 클립보드에 복사했습니다.");       // 03-03-01-07
  });

  btnCopyText.addEventListener("click",async()=>{                                             // 03-04-01-04
    let el=selectedEl; if(!el){ const sel=inputSel.value?.trim(); if(sel) el=document.querySelector(sel); } // 03-04-01-05
    if(!el) return alert("복사할 요소가 없습니다. 먼저 선택하거나 선택자를 입력하세요.");        // 03-04-01-06
    const text=getTextWithBreaks(el); await navigator.clipboard.writeText(text); alert("텍스트를 클립보드에 복사했습니다."); // 03-04-01-07
  });

  btnSave.addEventListener("click",async()=>{                                                 // 04-03-01-04
    const sel=inputSel.value?.trim(); if(!sel) return alert("저장할 선택자가 없습니다.");       // 04-03-01-05
    const list=await saveSelectorForSite(sel); alert(`[${HOST_KEY}] 저장됨\n현재 목록:\n- `+list.join("\n- ")); // 04-03-01-06
  });

  downjsonPanel=panel;                                                                        // 01-03-01-14
  loadSelectorsForSite().then(list=>{ if(list[0]) inputSel.value=list[0]; updatePreview(); }); // 04-02-01-03
  return panel;                                                                               // 01-03-01-15
}
function togglePanel(){                                                                       // 01-03-02
  const panel=createPanel();                                                                  // 01-03-02-01
  const hidden=panel.classList.toggle("downjson-hidden");                                     // 01-03-02-02
  if(hidden) updateHoverBoxFor(null);                                                         // 01-03-02-03
  if(!hidden && downjsonMinimized){                                                           // 01-03-02-04
    downjsonMinimized=false; shadowRoot.querySelectorAll(".downjson-btns,.downjson-row").forEach(el=>el.classList.remove("downjson-hidden")); // 01-03-02-05
  }                                                                                           // 01-03-02-06
}
/* ============================== [섹션 끝 01-03/01-04] ================================= */

/* ============================== [섹션 03-05] 미리보기 ============================== */
function updatePreview(){                                                                     // 03-05-01
  if(!shadowRoot) return;                                                                     // 03-05-01-01
  const input=shadowRoot.getElementById("downjson-selector-input");                           // 03-05-01-02
  const preSel=shadowRoot.getElementById("downjson-preview-selector");                        // 03-05-01-03
  const preTxt=shadowRoot.getElementById("downjson-preview-text");                            // 03-05-01-04
  if(!input||!preSel||!preTxt) return;                                                        // 03-05-01-05
  const sel=input.value?.trim()||(selectedEl?getUniqueSelector(selectedEl):"");               // 03-05-01-06
  preSel.textContent=sel||"(선택자 없음)";                                                    // 03-05-01-07
  let el=selectedEl; if(!el && sel) el=document.querySelector(sel);                           // 03-05-01-08
  preTxt.textContent=el?getTextWithBreaks(el):"(텍스트 없음)";                                // 03-05-01-09
}
/* ============================== [섹션 끝 03-05] ===================================== */

/* ============================== [섹션 05-03/05-04] 메시지 & 초기화 ============================== */
chrome.runtime.onMessage.addListener((msg)=>{                                                 // 05-03-01
  try{ if(msg?.type==="DOWNJSON_TOGGLE_PANEL"){ if(msg.forceOpen===true){ const p=createPanel(); p.classList.remove("downjson-hidden"); return } togglePanel() } } // 05-03-01-01
  catch(e){ warn("메시지 처리 오류",e) }                                                      // 05-03-01-02
});
(function init(){                                                                             // 05-04-01
  if(window.__DOWNJSON_ALREADY__){ log("중복 주입 방지: 이미 초기화"); return }                 // 05-04-01-01
  window.__DOWNJSON_ALREADY__=true; log("content.js 로드됨");                                  // 05-04-01-02
  try{ ensureShadowHost(); ensureHoverBox(); createPanel(); }catch(e){ warn("초기화 오류",e) }  // 05-04-01-03
  try{ if(window.__DOWNJSON_FORCE_OPEN__ || !sessionStorage.getItem("__downjson_auto_open_done__")){ const p=createPanel(); p.classList.remove("downjson-hidden"); sessionStorage.setItem("__downjson_auto_open_done__","1"); log("패널 자동 열기 실행") } }catch(e){} // 05-04-01-04
})();                                                                                         // 05-04-01-05
/* ============================== [섹션 끝 05-03/05-04] ================================= */
