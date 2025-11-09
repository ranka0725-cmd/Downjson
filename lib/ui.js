// lib/ui.js — UI 공통 빌더(리스트/배지) (IIFE)                               // 파일 목적 설명
// - window.DWLib.UI 네임스페이스로 제공                                        // 공개 네임스페이스
// - 기존 content.js의 리스트 UI 패턴을 공통 함수로 구성                         // 호환성 유지
(function(){                                                                  // IIFE 시작
  'use strict';                                                               // 엄격 모드

  /**
   * 선택자 리스트 UI를 생성합니다.
   * opts: { id, label, items, kind, paneSelectors, paneContent, syncSelectors, saveLocal, refreshPreview }
   * 반환: { render() }
   */                                                                           // JSDoc
  function mkList(opts){                                                       // 함수 시작
    const { id, label, items, kind, paneSelectors, paneContent, syncSelectors, saveLocal, refreshPreview } = opts || {}; // 파라미터 해체
    const title = document.createElement('div'); title.style.cssText='margin:10px 0 6px;font-weight:600'; title.textContent=String(label||''); // 타이틀
    const list = document.createElement('div'); list.id=String(id||''); list.className='list'; // 리스트 컨테이너
    const ctrls = document.createElement('div'); ctrls.className='dj-row';    // 상단 공용 컨트롤
    const add = document.createElement('button'); add.id=String(id||'')+'-add'; add.className='dj-btn'; add.textContent='추가'; // 전체 추가
    const del = document.createElement('button'); del.id=String(id||'')+'-del'; del.className='dj-btn'; del.textContent='삭제'; // 전체 삭제
    ctrls.append(add, del);                                                   // 컨트롤 묶음
    const pane = (String(id||'').includes('body')||String(id||'').includes('img')) ? paneSelectors : paneContent; // 배치 대상
    pane.append(title, list, ctrls);                                          // DOM 삽입

    const countFor = (sel)=>{ try { return sel? document.querySelectorAll(sel).length : 0; } catch { return 0; } }; // 매칭 수

    const render = ()=>{                                                      // 렌더 함수
      list.innerHTML='';                                                      // 초기화
      (items||[]).forEach((v,i)=>{                                            // 각 행 렌더링
        const row=document.createElement('div'); row.className='row';         // 행 컨테이너
        const inp=document.createElement('input'); inp.type='text';           // 입력창
        inp.value=String(v||'');                                              // 값 설정
        inp.placeholder=(String(id||'').includes('body')?'컨테이너 선택자':'IMG 선택자'); // 힌트
        const badge=document.createElement('span');                           // 매칭 배지
        badge.style.cssText='min-width:70px;text-align:right;color:#8ec07c';  // 스타일
        badge.textContent=countFor(inp.value)+'개';                            // 카운트
        const used=document.createElement('span');                            // 사용중 배지(옵션)
        used.style.cssText='margin-left:6px;padding:2px 6px;border-radius:10px;font-size:12px;background:#2ecc71;color:#001;display:none;';
        used.textContent='사용중';                                            // 라벨
        const plus=document.createElement('button'); plus.className='dj-btn'; plus.textContent='+'; // [+]
        const minus=document.createElement('button'); minus.className='dj-btn'; minus.textContent='-'; // [-]

        inp.oninput=(e)=>{                                                    // 입력 변경
          items[i]=e.target.value;                                            // 배열 업데이트
          badge.textContent=countFor(e.target.value)+'개';                     // 배지 갱신
          try { syncSelectors && syncSelectors(); } catch{}
          try { saveLocal && saveLocal(); } catch{}
          try { refreshPreview && refreshPreview(); } catch{}
        };
        plus.onclick=()=>{ items.splice(i+1,0,''); try{ syncSelectors&&syncSelectors(); saveLocal&&saveLocal(); render(); refreshPreview&&refreshPreview(); } catch{} }; // [+]
        minus.onclick=()=>{ if(items.length>1) items.splice(i,1); else items[0]=''; try{ syncSelectors&&syncSelectors(); saveLocal&&saveLocal(); render(); refreshPreview&&refreshPreview(); } catch{} }; // [-]

        row.append(inp,badge,used,plus,minus); list.append(row);              // 조립
      });
    };                                                                        // render 끝

    add.onclick = ()=>{ items.push(''); try { syncSelectors&&syncSelectors(); saveLocal&&saveLocal(); render(); refreshPreview&&refreshPreview(); } catch{} }; // 추가
    del.onclick = ()=>{ items.pop(); try { syncSelectors&&syncSelectors(); saveLocal&&saveLocal(); render(); refreshPreview&&refreshPreview(); } catch{} };     // 삭제
    render();                                                                  // 최초 렌더
    return { render };                                                         // 컨트롤 반환
  }                                                                            // mkList 끝

  // 네임스페이스 바인딩 ----------------------------------------------------- // API 노출
  const root = (typeof window!=='undefined') ? window : self;                  // 전역 선택
  root.DWLib = root.DWLib || {};                                               // 루트 보장
  root.DWLib.UI = { mkList };                                                  // UI API 노출
})();                                                                          // IIFE 끝

