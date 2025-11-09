// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상수/유틸 (START)
// ─────────────────────────────────────────────────────────────────────────────
const EXT_NS = "down-jsonl";                                                // 스토리지 네임스페이스(로컬 상태 저장 키 접두)
const PANEL_ID = "dj-panel-root";                                           // 패널 루트 DOM ID
const FAB_ID = "dj-fab";                                                    // 플로팅 액션 버튼 ID
const DEFAULT_DELAY_BASE = 4;                                               // 기본 지연(초) — 밴 회피용 평균값
const DEFAULT_DELAY_JITTER = 2;                                             // 지연 지터(±초) — 랜덤성 부여
const IMG_DELAY_MIN_MS = 600;                                               // 이미지 간 최소 대기(ms)
const IMG_DELAY_MAX_MS = 900;                                               // 이미지 간 최대 대기(ms)

const $  = (sel, root=document) => root.querySelector(sel);                 // 단일 선택자 헬퍼
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));  // 다중 선택자 헬퍼
const sleep   = (ms) => new Promise(r=>setTimeout(r, ms));                  // sleep 유틸
const nowISO  = () => new Date().toISOString();                             // 현재시각 ISO 문자열
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));               // 값 범위 제한
const toAbs   = (u) => new URL(u, document.baseURI).href;                   // 상대 URL → 절대 URL로 변환

function slugify(s){                                                        // 파일/폴더명 안전 슬러그 변환
  return (s||"").normalize("NFKD").replace(/[^\w\s\-\.]+/g,"")             // 특수문자 제거
    .replace(/\s+/g,"_").replace(/_+/g,"_").slice(0,80) || "series";       // 공백→_ , 연속_ 정리, 길이 제한
}                                                                           // 함수 끝

function randomInt(lo, hi){ return Math.floor(Math.random()*(hi-lo+1))+lo } // [lo,hi] 정수 난수
function randomDelayMs(baseSec, jitterSec){                                  // 밴 회피용 랜덤 지연 계산
  const delta = (Math.random()*2 - 1) * jitterSec;                           // -j ~ +j 범위
  const sec   = clamp(baseSec + delta, 1, 30);                               // 1~30초 범위 제한
  return Math.round(sec*1000);                                               // 밀리초로 반환
}                                                                            // 함수 끝

function htmlToPlainKeepBR(html){                                           // HTML → 텍스트(줄바꿈 유지) 변환
  if (!html) return "";                                                      // 빈 입력 처리
  return html.replace(/<\s*br\s*\/?>/gi, "\n")                               // <br> → 개행
             .replace(/<\/p\s*>/gi, "\n")                                    // </p> → 개행
             .replace(/<script[\s\S]*?<\/script>/gi, "")                     // 스크립트 제거
             .replace(/<style[\s\S]*?<\/style>/gi, "")                       // 스타일 제거
             .replace(/<[^>]+>/g, "")                                        // 태그 제거
             .replace(/\u00A0/g, " ")                                        // NBSP → 공백
             .replace(/\n{3,}/g, "\n\n")                                     // 과다 개행 정리
             .trim();                                                        // 전후 공백 제거
}                                                                            // 함수 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상수/유틸 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 도메인 기본 선택자 템플릿 (START)
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_TEMPLATES = {                                                  // 사이트별 기본 선택자 템플릿
  "novelpia.com": {                                                         // 노벨피아
    titleParts: [".menu-top-title", ".menu-top-tag"],                       // 타이틀 후보(제목/태그)
    content:    ["#novel_drawing","#novel_text","#novel_box","#novel_content"] // 본문 영역 후보
  },
  "booktoki": {                                                             // 북토끼(가변 서브도메인)
    titleParts: [".navbar-wrapper .toon-title","select[name='wr_id'] option[selected]"], // 타이틀
    content:    ["#novel_content",".novel-content","#nv_viewer",".view-content"]         // 본문
  },
  "newtoki": {                                                              // 뉴토끼(가변 서브도메인)
    titleParts: [".navbar-wrapper .toon-title","select[name='wr_id'] option[selected]"], // 타이틀
    content:    [".e1400b65b00",".view-content","#html_encoder_div"]                     // 본문(텍본/이미지 혼재)
  }
};                                                                          // 템플릿 끝

function currentDomainKey(){                                                // 현재 도메인 키 판별
  const h = location.hostname;                                              // 호스트명 가져오기
  if (h.includes("novelpia.")) return "novelpia.com";                       // 노벨피아인 경우
  if (/booktoki\d*\./.test(h)) return "booktoki";                           // 북토끼 패턴
  if (/newtoki\d*\./.test(h))  return "newtoki";                            // 뉴토끼 패턴
  return "novelpia.com";                                                    // 기본값(안전)
}                                                                           // 함수 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 도메인 기본 선택자 템플릿 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상태/스토리지 (START)
// ─────────────────────────────────────────────────────────────────────────────
let panelOpen = false;                                                      // 패널 열림 상태
let state = {                                                               // 런타임 상태 컨테이너
  baseDelaySec: DEFAULT_DELAY_BASE,                                         // 기본 지연 값
  jitterSec: DEFAULT_DELAY_JITTER,                                          // 지터(±)
  joiner: " | ",                                                            // 타이틀 파트 구분자
  titleSelectors: [],                                                       // 타이틀 선택자 배열
  contentSelectors: [],                                                     // 본문 선택자 배열
  saveImages: true,                                                         // 이미지 저장 여부
  rootDirHandle: null,                                                      // FSA 루트 폴더 핸들
  seriesDirHandle: null,                                                    // FSA 작품 폴더 핸들
  seriesName: "",                                                           // 작품명(폴더명 생성 기준)
  seq: 0                                                                    // 에피소드 시퀀스 카운터
};                                                                          // 상태 끝
const KEY_LOCAL = `${EXT_NS}:local`;                                       // localStorage 키

function loadLocal(){                                                       // 로컬 상태 로드
  try{ const raw=localStorage.getItem(KEY_LOCAL);                           // 문자열 읽기
       if(raw) Object.assign(state, JSON.parse(raw)) }catch{}              // JSON 병합(실패 무시)
}                                                                           // 함수 끝
function saveLocal(){                                                       // 로컬 상태 저장
  try{ const o={                                                             // 보존할 필드만 선별
        baseDelaySec:state.baseDelaySec, jitterSec:state.jitterSec, joiner:state.joiner,
        titleSelectors:state.titleSelectors, contentSelectors:state.contentSelectors,
        saveImages:state.saveImages, seriesName:state.seriesName, seq:state.seq
      };                                                                     //
      localStorage.setItem(KEY_LOCAL, JSON.stringify(o));                   // 저장
  }catch{}                                                                  // 실패 무시
}                                                                           // 함수 끝
loadLocal();                                                                // 시작 시 복원
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 상태/스토리지 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] UI(패널/스타일/FAB) (START)
// ─────────────────────────────────────────────────────────────────────────────
function ensureStyle(){                                                     // 패널/FAB CSS 주입
  if ($("#dj-style")) return;                                               // 중복 방지
  const st = document.createElement("style");                               // <style> 생성
  st.id = "dj-style";                                                       // ID 부여
  st.textContent = `                                                      
#${PANEL_ID}{position:fixed;top:80px;left:40px;width:520px;background:#1f1f1fe6;color:#eee;border:1px solid #444;border-radius:12px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans KR,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.35);backdrop-filter:blur(2px)}
#${PANEL_ID} .head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #333;cursor:move}
#${PANEL_ID} .title{font-weight:700;font-size:14px;flex:1}
#${PANEL_ID} .btn{border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}
#${PANEL_ID} .btn:active{transform:translateY(1px)}
#${PANEL_ID} .body{max-height:60vh;overflow:auto;padding:10px 12px}
#${PANEL_ID} .row{display:flex;gap:8px;align-items:center;margin:6px 0}
#${PANEL_ID} .row label{width:90px;color:#bbb;font-size:12px}
#${PANEL_ID} input[type="text"],#${PANEL_ID} input[type="number"]{flex:1;background:#181818;border:1px solid #555;color:#eee;border-radius:6px;padding:6px 8px;outline:none}
#${PANEL_ID} .tag{display:inline-flex;align-items:center;gap:6px;margin:3px 0}
#${PANEL_ID} .tag input{width:360px}
#${PANEL_ID} .tag .x{background:#444;border:1px solid #666;border-radius:6px;color:#ddd;font-size:12px;padding:2px 6px;cursor:pointer}
#${PANEL_ID} .muted{color:#aaa;font-size:12px}
#${PANEL_ID} .sep{height:1px;background:#313131;margin:8px 0}
#${PANEL_ID} .status{font-size:12px;color:#9ad;white-space:pre-line}
#${FAB_ID}{position:fixed;right:16px;bottom:16px;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#999;color:#111;font-weight:700;font-size:14px;cursor:pointer;z-index:2147483647;box-shadow:0 8px 28px rgba(0,0,0,.4)}
#${FAB_ID}.ok{background:#12c964;color:#fff}
#${FAB_ID}.wait{background:#2a7afe;color:#fff}
#${FAB_ID}.err{background:#cc3d3d;color:#fff}
`;                                                                         // 스타일 본문
  document.documentElement.appendChild(st);                                  // 문서에 부착
}                                                                            // 함수 끝

function makeDraggable(box, handle){                                         // 드래그 이동 유틸
  let sx=0,sy=0,bx=0,by=0,drag=false;                                        // 시작 좌표/상태
  handle.addEventListener("mousedown",(e)=>{                                 // 마우스 다운
    drag=true; sx=e.clientX; sy=e.clientY;                                   // 시작점 기록
    const r=box.getBoundingClientRect(); bx=r.left; by=r.top;                // 박스 좌표
    e.preventDefault();                                                      // 기본 동작 취소
  });                                                                        //
  document.addEventListener("mousemove",(e)=>{                               // 마우스 이동
    if(!drag) return;                                                        // 드래그 중만
    const nx=bx+(e.clientX-sx); const ny=by+(e.clientY-sy);                  // 새 좌표
    box.style.left=Math.max(0,Math.min(window.innerWidth-100,nx))+"px";      // 좌우 클램프
    box.style.top=Math.max(0,Math.min(window.innerHeight-60,ny))+"px";       // 상하 클램프
  });                                                                        //
  document.addEventListener("mouseup",()=>{ drag=false; });                  // 마우스 업 시 종료
}                                                                            // 함수 끝

function ensurePanel(){                                                      // 패널 생성/보장
  if ($("#"+PANEL_ID)) return;                                               // 이미 있으면 패스
  ensureStyle();                                                             // 스타일 주입 보장
  const domKey = currentDomainKey();                                         // 도메인 키 결정
  const tmpl  = DOMAIN_TEMPLATES[domKey] || DOMAIN_TEMPLATES["novelpia.com"];// 템플릿 선택
  if (!state.titleSelectors?.length)   state.titleSelectors   = [...tmpl.titleParts]; // 타이틀 기본값
  if (!state.contentSelectors?.length) state.contentSelectors = [...tmpl.content];    // 본문 기본값

  const root = document.createElement("div");                                // 루트 DOM 생성
  root.id = PANEL_ID;                                                        // ID 지정
  root.innerHTML = `                                                         // 내부 HTML 구성
    <div class="head">                                                       <!-- 패널 헤드 -->
      <div class="title">Downloader · JSONL Manual</div>                     <!-- 타이틀 -->
      <button class="btn" id="dj-close">닫기</button>                         <!-- 닫기 버튼 -->
    </div>                                                                   <!-- /헤드 -->
    <div class="body">                                                       <!-- 바디 -->
      <div class="row"><label>폴더</label>                                   <!-- 폴더 선택 -->
        <button class="btn" id="dj-pick">폴더 선택</button>                  <!-- FSA 시작 -->
        <span class="muted" id="dj-picked">선택 안 됨</span>                 <!-- 상태 라벨 -->
      </div>                                                                 <!-- /row -->
      <div class="row"><label>작품명</label>                                 <!-- 시리즈명 -->
        <input type="text" id="dj-series" placeholder="폴더명으로 사용(미입력 시 자동)"/> <!-- 입력 -->
      </div>                                                                 <!-- /row -->
      <div class="row"><label>구분자</label>                                 <!-- 구분자 -->
        <input type="text" id="dj-joiner" value="${state.joiner}"/>          <!-- 입력 -->
      </div>                                                                 <!-- /row -->
      <div class="row"><label>지연(초)</label>                                <!-- 지연 설정 -->
        <input type="number" id="dj-delay"  min="1" max="30" step="0.1" value="${state.baseDelaySec}"/> <!-- 기본 -->
        <span class="muted">±</span>                                         <!-- 텍스트 -->
        <input type="number" id="dj-jitter" min="0" max="10" step="0.1" value="${state.jitterSec}"/>   <!-- 지터 -->
      </div>                                                                 <!-- /row -->
      <div class="sep"></div>                                                <!-- 구분선 -->
      <div class="row"><label>타이틀 선택자</label>                           <!-- 타이틀 셀렉터 -->
        <div style="flex:1" id="dj-title-list"></div>                        <!-- 리스트 -->
        <button class="btn" id="dj-title-add">+추가</button>                 <!-- 추가 -->
      </div>                                                                 <!-- /row -->
      <div class="row"><label>본문 선택자</label>                             <!-- 본문 셀렉터 -->
        <div style="flex:1" id="dj-content-list"></div>                      <!-- 리스트 -->
        <button class="btn" id="dj-content-add">+추가</button>               <!-- 추가 -->
      </div>                                                                 <!-- /row -->
      <div class="row"><label>이미지 저장</label>                             <!-- 이미지 ON/OFF -->
        <input type="checkbox" id="dj-img" ${state.saveImages?'checked':''}/> <!-- 체크박스 -->
        <span class="muted">서비스워커 프록시로 CORS 우회 저장</span>         <!-- 설명 -->
      </div>                                                                 <!-- /row -->
      <div class="sep"></div>                                                <!-- 구분선 -->
      <div class="row">                                                      <!-- 실행 버튼 -->
        <button class="btn" id="dj-add">[추가] 현재 페이지 저장</button>      <!-- 수동 추가 -->
        <span class="muted">수동 모드(페이지 넘기며 클릭)</span>              <!-- 안내 -->
      </div>                                                                 <!-- /row -->
      <div class="sep"></div>                                                <!-- 구분선 -->
      <div class="status" id="dj-status">대기 중…</div>                      <!-- 상태창 -->
    </div>                                                                   <!-- /바디 -->
  `;                                                                         // 템플릿 끝
  document.documentElement.appendChild(root);                                 // DOM에 부착
  makeDraggable(root, $(".head", root));                                      // 헤더로 드래그 가능

  $("#dj-pick").onclick = onPickFolder;                                       // 폴더 선택 핸들러 연결
  $("#dj-close").onclick = togglePanel;                                       // 닫기 버튼 → 패널 토글
  $("#dj-series").value = state.seriesName || "";                             // 기존 시리즈명 반영
  $("#dj-joiner").oninput = (e)=>{ state.joiner = e.target.value; saveLocal(); };      // 구분자 변경 저장
  $("#dj-delay").oninput  = (e)=>{ state.baseDelaySec = Number(e.target.value)||DEFAULT_DELAY_BASE; saveLocal(); };  // 지연 저장
  $("#dj-jitter").oninput = (e)=>{ state.jitterSec   = Number(e.target.value)||DEFAULT_DELAY_JITTER; saveLocal(); }; // 지터 저장
  $("#dj-img").onchange   = (e)=>{ state.saveImages  = !!e.target.checked; saveLocal(); };                              // 이미지 ON/OFF 저장
  $("#dj-add").onclick    = onManualAdd;                                      // 수동 저장 실행

  renderSelectorList("title",   state.titleSelectors);                        // 타이틀 선택자 렌더
  renderSelectorList("content", state.contentSelectors);                      // 본문 선택자 렌더
  $("#dj-title-add").onclick   = ()=>{ state.titleSelectors.push(""); renderSelectorList("title", state.titleSelectors); saveLocal(); };   // 타이틀 추가
  $("#dj-content-add").onclick = ()=>{ state.contentSelectors.push(""); renderSelectorList("content", state.contentSelectors); saveLocal(); }; // 본문 추가

  updatePickedFolderLabel();                                                  // 폴더 선택 상태 라벨 갱신
}                                                                             // 함수 끝

function renderSelectorList(kind, arr){                                       // 선택자 리스트 동적 렌더링
  const box = $("#dj-"+kind+"-list");                                         // 컨테이너 찾기
  box.innerHTML = "";                                                         // 초기화
  arr.forEach((sel, idx)=>{                                                   // 항목 반복
    const row = document.createElement("div"); row.className = "tag";         // 행 DOM
    row.innerHTML = `<input type="text" value="${(sel||"").replaceAll('"','&quot;')}" data-idx="${idx}" /><span class="x" data-idx="${idx}">삭제</span>`; // 입력+삭제버튼
    box.appendChild(row);                                                     // 부착
  });                                                                         // forEach 끝
  $$("input", box).forEach(inp=>{                                             // 입력 핸들러 바인딩
    inp.oninput=(e)=>{ const i=Number(e.target.dataset.idx); arr[i]=e.target.value; saveLocal(); };     // 값 저장
  });                                                                         //
  $$(".x", box).forEach(btn=>{                                                // 삭제 버튼 바인딩
    btn.onclick=()=>{ const i=Number(btn.dataset.idx); arr.splice(i,1); renderSelectorList(kind,arr); saveLocal(); }; // 삭제/리렌더
  });                                                                         //
}                                                                             // 함수 끝

function togglePanel(){                                                       // 패널 토글
  const el=$("#"+PANEL_ID);                                                   // 패널 요소
  if(el){ el.remove(); panelOpen=false; } else { ensurePanel(); panelOpen=true; } // 열려있으면 닫고, 없으면 생성
}                                                                             // 함수 끝
function ensureFab(){                                                         // FAB 생성 보장
  if($("#"+FAB_ID)) return;                                                   // 이미 있으면 패스
  const fab=document.createElement("div"); fab.id=FAB_ID;                     // DIV 생성/ID
  fab.textContent="추가"; fab.title="현재 페이지 저장";                        // 라벨/툴팁
  fab.onclick=onManualAdd;                                                    // 클릭 → 수동 추가
  document.documentElement.appendChild(fab);                                  // 화면에 부착
}                                                                             // 함수 끝
function setFabState(cls){                                                    // FAB 색상 상태
  const el=$("#"+FAB_ID); if(!el) return;                                     // 요소 없으면 패스
  el.classList.remove("ok","wait","err"); if(cls) el.classList.add(cls);      // 상태 클래스 교체
}                                                                             // 함수 끝
function updatePickedFolderLabel(){                                           // 폴더 라벨 갱신
  const el=$("#dj-picked"); if(el) el.textContent = state.seriesDirHandle ? "선택됨" : "선택 안 됨"; // 표시
}                                                                             // 함수 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] UI(패널/스타일/FAB) (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] FSA 유틸 (START)
// ─────────────────────────────────────────────────────────────────────────────
async function onPickFolder(){                                                // 폴더 선택 트리거
  try{
    const root = await window.showDirectoryPicker();                          // 루트 폴더 선택(권한 요청)
    state.rootDirHandle = root;                                               // 상태 저장
    const seriesInput = $("#dj-series");                                      // 시리즈 입력
    const seriesName  = (seriesInput?.value?.trim()) || document.title || location.hostname; // 입력 없으면 제목/호스트
    const dirName     = slugify(seriesName);                                   // 안전 폴더명 변환
    state.seriesName  = seriesName;                                            // 상태 반영
    state.seriesDirHandle = await root.getDirectoryHandle(dirName,{create:true}); // 작품 폴더 보장
    await touchMetaAndSeq();                                                   // meta.json/seq 초기화/로드
    updatePickedFolderLabel(); saveLocal();                                    // 라벨/저장
    logStatus("폴더 선택 완료: "+dirName);                                     // 상태 로그
  }catch{ logStatus("폴더 선택 취소/오류"); }                                  // 취소 또는 오류
}                                                                              // 함수 끝

async function touchMetaAndSeq(){                                              // 시퀀스 메타 로드/초기화
  const metaHandle = await state.seriesDirHandle.getFileHandle("meta.json",{create:true}); // meta 핸들
  const file = await metaHandle.getFile();                                     // 파일 객체
  if (file.size>0){                                                            // 기존 데이터 존재
    try{ const meta=JSON.parse(await file.text()); state.seq=Number(meta.seq)||0; }catch{ state.seq=0; } // 파싱/보정
  } else {                                                                     // 신규인 경우
    state.seq=0; await writeFile(metaHandle, JSON.stringify({seq:0}, null, 2)); // 초기 메타 작성
  }                                                                            //
}                                                                              // 함수 끝

async function writeFile(fileHandle, data){                                    // 전체 쓰기
  const w=await fileHandle.createWritable(); await w.write(data); await w.close(); // 덮어쓰기
}                                                                              // 함수 끝
async function writeBytes(fileHandle, bytes){                                  // 바이트 쓰기
  const w=await fileHandle.createWritable(); await w.write(bytes); await w.close(); // 바이너리 저장
}                                                                              // 함수 끝
async function appendText(fileHandle, text){                                   // append(추가) 쓰기
  const file=await fileHandle.getFile(); const size=file.size;                 // 현재 크기
  const w=await fileHandle.createWritable({keepExistingData:true});            // 기존 데이터 유지
  await w.seek(size); await w.write(text); await w.close();                    // 끝에 추가
}                                                                              // 함수 끝
async function ensureDir(dirHandle, subPath){                                  // 하위 폴더 보장
  const parts=subPath.split("/").filter(Boolean); let cur=dirHandle;           // 경로 분해
  for(const p of parts){ cur=await cur.getDirectoryHandle(p,{create:true}); }  // 단계별 생성
  return cur;                                                                  // 최종 핸들 반환
}                                                                              // 함수 끝
async function saveMetaSeq(){                                                  // 시퀀스 값 저장
  const metaHandle=await state.seriesDirHandle.getFileHandle("meta.json",{create:true}); // 핸들
  await writeFile(metaHandle, JSON.stringify({seq:state.seq}, null, 2));       // 기록
}                                                                              // 함수 끝
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] FSA 유틸 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 수집(타이틀/본문/이미지URL) + BG 프록시 다운로드 (START)
// ─────────────────────────────────────────────────────────────────────────────
function collectTitleLine(){                                                  // 타이틀 라인 조립
  const parts=[];                                                             // 결과 파트 배열
  for(const sel of state.titleSelectors){                                     // 선택자 순회
    if(!sel) continue;                                                        // 빈 값 건너뛰기
    const n=$(sel);                                                           // 노드 조회
    if(n){ const t=(n.textContent||"").trim(); if(t) parts.push(t); }         // 텍스트 추가
  }                                                                            //
  return parts.join(state.joiner||" ");                                       // 구분자로 결합
}                                                                              // 함수 끝

function pickCandidate(selectors){                                            // 첫 매칭 노드 반환
  for(const s of selectors){ const n=$(s); if(n) return n; } return null;     // 순서대로 첫 성공 반환
}                                                                              // 함수 끝

function collectBodyHtml(){                                                   // 본문 HTML 수집
  const n=pickCandidate(state.contentSelectors||[]);                          // 본문 루트
  return n ? (n.innerHTML||n.textContent||"") : "";                           // HTML 우선 획득
}                                                                              // 함수 끝

function parseSrcset(srcset){                                                 // srcset 해석(고해상도 우선)
  try{
    const items = srcset.split(",").map(s=>s.trim()).filter(Boolean)          // 항목 분리/정리
      .map(it=>{ const m=it.trim().split(/\s+/); const url=m[0]; const d=m[1]||""; // URL+서픽스
                 let w=0;                                                     // 가중치
                 if(/^\d+w$/.test(d)) w=parseInt(d);                          // 너비 명시(예: 1200w)
                 else if(/^\d+(\.\d+)?x$/.test(d)) w=Math.round(parseFloat(d)*1000); // 배수(예: 2x)
                 return {url, weight:w}; });                                  // 결과 반환
    items.sort((a,b)=>b.weight-a.weight);                                     // 가중치 내림차순
    return items[0]?.url || "";                                               // 최상 선택
  }catch{ return ""; }                                                         // 실패 시 빈값
}                                                                              // 함수 끝

function collectImageUrls(){                                                  // 본문 이미지 URL 수집
  const root = pickCandidate(state.contentSelectors||[]);                      // 본문 루트 노드
  if (!root) return [];                                                        // 없으면 빈배열
  const imgs = $$("img", root);                                                // 모든 <img>
  const urls = imgs.map(im => {                                                // 각 이미지 처리
      const ds  = im.getAttribute("data-src") || im.getAttribute("data-original") || ""; // lazy 속성
      const cur = im.currentSrc || "";                                         // 렌더러가 선택한 실제 소스
      const ss  = im.getAttribute("srcset") || "";                              // srcset 후보
      const s   = im.getAttribute("src") || "";                                 // 기본 src
      const bestFromSrcset = ss ? parseSrcset(ss) : "";                         // srcset 최선
      const pick = ds || bestFromSrcset || cur || s;                            // 우선순위 선택
      return pick ? toAbs(pick) : "";                                           // 절대 URL 변환
    })
    .filter(Boolean);                                                           // 빈값 제거
  return Array.from(new Set(urls));                                            // 중복 제거 후 반환
}                                                                              // 함수 끝

const MIME_EXT = {                                                             // MIME → 확장자 매핑
  "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/pjpeg": ".jpg",
  "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp",
  "image/avif": ".avif", "image/bmp": ".bmp"
};                                                                             // 매핑 끝

function extFromUrl(u){                                                        // URL에서 확장자 추출
  const m=(new URL(u, document.baseURI).pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)(?:$|\?)/i));
  return m ? ("." + m[1].toLowerCase()) : "";                                  // 일치 시 확장자 반환
}                                                                              // 함수 끝

function base64ToUint8(base64){                                               // Base64 → Uint8Array
  const bin = atob(base64);                                                   // 바이너리 디코드
  const len = bin.length;                                                     // 길이
  const bytes = new Uint8Array(len);                                          // 배열 준비
  for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);                          // 바이트 채움
  return bytes;                                                                // 반환
}                                                                              // 함수 끝

async function fetchImageViaBG(url){                                          // BG 프록시 통해 이미지 가져오기
  const res = await chrome.runtime.sendMessage({ type: "FETCH_IMG", url });   // 서비스워커로 메시지
  return res;                                                                  // {ok, base64, contentType, err}
}                                                                              // 함수 끝

async function onManualAdd(){                                                 // [추가] 클릭 시 수집/저장
  try{
    if (!state.rootDirHandle || !state.seriesDirHandle){                      // 폴더 선택 필수
      setFabState("err");                                                     // FAB 빨강
      logStatus("폴더를 먼저 선택해 주세요.");                                  // 안내
      return;                                                                 // 종료
    }                                                                          //
    const seriesInput=$("#dj-series");                                        // 시리즈 입력
    if(seriesInput){ const v=seriesInput.value.trim(); if(v) state.seriesName=v; } // 값 반영
    saveLocal();                                                              // 상태 저장

    setFabState("wait");                                                      // FAB 파랑(진행)
    logStatus("수집 시작…");                                                  // 상태 로그

    const titleLine = collectTitleLine();                                     // 타이틀 조립
    const bodyHtml  = collectBodyHtml();                                      // 본문 HTML 획득
    const bodyText  = htmlToPlainKeepBR(bodyHtml);                            // 텍스트 변환
    const imgUrls   = state.saveImages ? collectImageUrls() : [];             // 이미지 URL 목록
    const seq = ++state.seq; await saveMetaSeq();                             // 시퀀스 증가/저장
    const epId = "EP-"+String(seq).padStart(4,"0");                           // 에피소드 ID

    const textsDir = await ensureDir(state.seriesDirHandle, "texts");         // texts 폴더
    const textFH   = await textsDir.getFileHandle(`${epId}.txt`,{create:true}); // 텍스트 파일 핸들
    await writeFile(textFH, (titleLine?titleLine+"\n\n":"")+bodyText);        // 텍스트 저장

    const imagesSaved = [];                                                   // 저장된 이미지 경로 모음
    if (state.saveImages && imgUrls.length){                                  // 이미지 저장 ON이면
      const epImgDir = await ensureDir(state.seriesDirHandle, `images/${epId}`); // 화별 이미지 폴더
      let idx = 0;                                                            // 이미지 번호
      for (const url of imgUrls){                                             // 모든 이미지 순회
        idx++;                                                                // 번호 증가
        const r = await fetchImageViaBG(url);                                  // BG fetch(CORS 우회)
        if (!r?.ok){                                                          // 실패 시
          logStatus(`이미지 실패: ${url}\n${r?.err||""}`);                    // 로그 남기고
          continue;                                                           // 다음으로
        }                                                                      //
        const bytes = base64ToUint8(r.base64);                                // Base64 → 바이트
        const extFromCT = MIME_EXT[(r.contentType||"").toLowerCase()] || "";  // MIME 우선 확장자
        const extFromU  = extFromUrl(url) || "";                               // URL에서 추출
        const ext       = extFromCT || extFromU || ".jpg";                     // 최종 확장자 결정
        const fname     = String(idx).padStart(3, "0") + ext;                  // 001.jpg 형태
        const fh        = await epImgDir.getFileHandle(fname, {create:true});  // 파일 핸들
        await writeBytes(fh, bytes);                                           // 파일 기록
        imagesSaved.push(`images/${epId}/${fname}`);                           // 경로 기록
        await sleep(randomInt(IMG_DELAY_MIN_MS, IMG_DELAY_MAX_MS));            // 이미지 간 짧은 대기
      }                                                                        // for 끝
    }                                                                          // if 끝

    const jsonlFH = await state.seriesDirHandle.getFileHandle("episodes.jsonl",{create:true}); // JSONL 핸들
    const record = {                                                           // JSONL 1라인 레코드
      schema:"1.0",                                                            // 스키마 버전
      series_id: slugify(state.seriesName||document.title||"series"),          // 시리즈 식별자
      episode_id: epId,                                                        // 에피소드 ID
      seq,                                                                     // 시퀀스 번호
      site: location.hostname,                                                 // 수집 도메인
      series: state.seriesName||"",                                            // 시리즈명(표시용)
      title_line: titleLine,                                                   // 타이틀 라인(10칸 합침)
      url: location.href,                                                      // 페이지 URL
      text_file: `texts/${epId}.txt`,                                          // 본문 파일 경로
      img_files: imagesSaved,                                                  // 이미지 파일 경로 목록
      char_count: bodyText.length,                                             // 본문 글자 수
      img_count: imagesSaved.length,                                           // 이미지 수
      captured_at: nowISO()                                                    // 캡처 시각
    };                                                                         // 레코드 끝
    await appendText(jsonlFH, JSON.stringify(record)+"\n");                    // JSONL에 1줄 append

    setFabState("ok");                                                         // 성공(초록)
    logStatus(`[완료] ${epId} 저장 · 텍스트 ${bodyText.length}자 · 이미지 ${imagesSaved.length}장`); // 완료 로그

    const wait = randomDelayMs(state.baseDelaySec, state.jitterSec);          // 권장 대기시간 계산
    logStatus(`다음 실행 권장 대기: ${Math.round(wait/1000)}초 (수동 모드)`);    // 안내(밴 회피)
  }catch(e){
    setFabState("err");                                                       // 실패(빨강)
    logStatus("오류: "+String(e));                                            // 에러 메시지 표시
  }                                                                           // try-catch 끝
}                                                                             // 함수 끝

function logStatus(msg){ const box=$("#dj-status"); if(box) box.textContent = msg; } // 상태창 출력 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 수집(타이틀/본문/이미지URL) + BG 프록시 다운로드 (END)
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 메시지/초기화 (START)
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg)=>{                                // 백그라운드 메시지 리스너
  if(msg?.type==="TOGGLE_PANEL") togglePanel();                              // 아이콘 클릭 → 패널 토글
});                                                                           // 리스너 끝
ensureFab();                                                                  // 플로팅 버튼 보장(항상 표시)
// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] 메시지/초기화 (END)
// ─────────────────────────────────────────────────────────────────────────────
