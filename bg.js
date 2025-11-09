/********************************************************************** // [파일 헤더 시작]
 * bg.js (MV3 Service Worker · frames+diag v0.1.4)                      // 파일/버전
 * - 01-01: 아이콘 클릭 → 패널 토글                                      // 기능
 * - 01-02: 단축키 → 패널 토글 / 강제 주입                               // 기능
 * - 01-03: 메시지 실패 시 content.js 자동 주입 후 재시도                // 기능
 * - 05-00: 탭 활성/로드 완료 시 '한 번만' 자동 주입                     // 기능(보조)
 **********************************************************************/ // [파일 헤더 끝]

function log(...a){try{console.log("[Downjson]",...a)}catch{}}            // 공통 로그
function warn(...a){try{console.warn("[Downjson]",...a)}catch{}}          // 공통 경고

async function sendToggle(tab, forceOpen=false){                           // 01-03-00
  if(!tab || !tab.id) return false;                                       // 01-03-00-01
  const url = tab.url || "";                                              // 01-03-00-02
  const blocked=/^(chrome|edge|about|brave|opera|vivaldi|chrome-extension):/i.test(url);//01-03-00-03
  if(blocked){ warn("주입 불가 페이지:", url);                             // 01-03-00-04
    chrome.action.setBadgeText({text:"X",tabId:tab.id});                  // 01-03-00-05
    chrome.action.setBadgeBackgroundColor({color:"#d00",tabId:tab.id});   // 01-03-00-06
    return false;                                                         // 01-03-00-07
  }
  try{
    await chrome.tabs.sendMessage(tab.id,{type:"DOWNJSON_TOGGLE_PANEL",forceOpen}); // 01-03-01
    chrome.action.setBadgeText({text:"",tabId:tab.id});                   // 01-03-01-1
    log("메시지 전송 성공");                                              // 01-03-01-2
    return true;                                                          // 01-03-01-3
  }catch(err){ warn("수신자 없음 → 자동 주입 시도",err) }                 // 01-03-01-4

  try{
    if(forceOpen){
      await chrome.scripting.executeScript({ target:{tabId:tab.id}, func:()=>{ window.__DOWNJSON_FORCE_OPEN__=true; } });
    }
    await chrome.scripting.executeScript({ target:{tabId:tab.id}, files:["content.js"] });
  }catch(err){
    warn("content.js 주입 실패",err);
    chrome.action.setBadgeText({text:"ERR",tabId:tab.id});
    chrome.action.setBadgeBackgroundColor({color:"#d00",tabId:tab.id});
    return false;
  }

  try{
    await chrome.tabs.sendMessage(tab.id,{type:"DOWNJSON_TOGGLE_PANEL",forceOpen}); // 01-03-03
    chrome.action.setBadgeText({text:"",tabId:tab.id});
    log("주입 후 메시지 전송 성공");
    return true;
  }catch(err){
    warn("2차 메시지 실패",err);
    chrome.action.setBadgeText({text:"ERR",tabId:tab.id});
    chrome.action.setBadgeBackgroundColor({color:"#d00",tabId:tab.id});
    return false;
  }
}

chrome.action.onClicked.addListener(async(tab)=>{ await sendToggle(tab,false); }); // 01-01

chrome.commands.onCommand.addListener(async(command)=>{                           // 01-02
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab) return;
  if(command==="toggle-panel") return void sendToggle(tab,false);
  if(command==="force-inject") return void sendToggle(tab,true);
});

const injected = new Set();                                                       // 05-00
async function tryAutoInject(tabId){
  if(injected.has(tabId)) return;
  injected.add(tabId);
  try{
    await chrome.scripting.executeScript({target:{tabId},files:["content.js"]});
    chrome.action.setBadgeText({text:".",tabId});
    chrome.action.setBadgeBackgroundColor({color:"#888",tabId});
  }catch(e){ /* 무시 */ }
}
chrome.tabs.onActivated.addListener(info=>tryAutoInject(info.tabId));
chrome.tabs.onUpdated.addListener((tabId,change)=>{ if(change.status==="complete") tryAutoInject(tabId); });
