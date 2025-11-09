// lib/dom-text.js — 텍스트/선택자 유틸 (IIFE)
// - window.DWLib.DomText 네임스페이스로 제공
// - content.js 호환을 위해 전역 함수가 비어 있을 때만 주입
(function(){
  'use strict';

  function slugify(s) { // 파일/폴더명 안전 슬러그
    try {
      return String(s||'')
        .normalize('NFKD')
        .replace(/[^\w\s\-\.]+/g,'')
        .replace(/\s+/g,'_')
        .replace(/_+/g,'_')
        .slice(0,80) || 'series';
    } catch { return 'series'; }
  }

  function htmlToPlainKeepBR(html) { // <br> 유지하며 HTML → 텍스트
    if (!html) return '';
    try {
      return String(html)
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/p\s*>/gi, '\n')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch { return ''; }
  }

  function safePickText(sel) { // CSS 선택자 → 텍스트 안전 추출
    try {
      const s = String(sel||'').trim(); if (!s) return '';
      const n = document.querySelector(s); if (!n) return '';
      const tag = (n.tagName||'').toUpperCase();
      if (tag === 'META') return (n.getAttribute('content')||'').trim();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return (n.value || n.getAttribute('value') || '').trim();
      const txt = (n.innerText || n.textContent || '').trim(); if (txt) return txt;
      return (n.getAttribute('title') || n.getAttribute('alt') || '').trim();
    } catch { return ''; }
  }

  // 네임스페이스 바인딩
  const root = (typeof window !== 'undefined') ? window : self;
  root.DWLib = root.DWLib || {};
  root.DWLib.DomText = { slugify, htmlToPlainKeepBR, safePickText };

  // 기존 전역이 없을 때만 주입(호환)
  if (typeof root.slugify === 'undefined') root.slugify = slugify;
  if (typeof root.htmlToPlainKeepBR === 'undefined') root.htmlToPlainKeepBR = htmlToPlainKeepBR;
  if (typeof root.safePickText === 'undefined') root.safePickText = safePickText;
})();

