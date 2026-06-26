// ==UserScript==
// @name         飞书图片大图预览
// @namespace    hkq.feishu
// @version      1.4.0
// @description  飞书文档/多维表格中,按住 Alt 悬停图片弹大图浮窗;多维表格跳过缩略图直接显示原图
// @match        https://*.feishu.cn/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // =========== 浮窗 ===========
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', zIndex: '2147483647', padding: '6px',
    background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
    boxShadow: '0 4px 24px rgba(0,0,0,.28)', pointerEvents: 'none',
    display: 'none',
  });
  const imgEl = document.createElement('img');
  imgEl.referrerPolicy = 'no-referrer';
  Object.assign(imgEl.style, {
    display: 'block', maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain',
  });
  const tipEl = document.createElement('div');
  Object.assign(tipEl.style, {
    fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'center',
  });
  box.appendChild(imgEl);
  box.appendChild(tipEl);
  document.documentElement.appendChild(box);

  imgEl.addEventListener('load',  () => { tipEl.textContent = ''; place(lastX, lastY); });
  imgEl.addEventListener('error', () => {
    if (imgEl.getAttribute('src')) tipEl.textContent = '⚠️ 图片加载失败';
  });

  // =========== 状态 ===========
  let altHeld = false;
  let lastX = 0, lastY = 0, lastTarget = null;
  let popupMode = null;   // 'doc' | 'bitable' | null
  let currentSrc = '';
  let bitableTimer = null;
  let popoverEl = null;      // 当前追踪的 attachment-popover-img 元素
  let popoverSrcObs = null;
  let hiddenNativeEl = null; // 被我们临时隐藏的 Feishu 原生浮窗根节点
  const LARGE_MIN_W = 200;   // naturalWidth 低于此值视为缩略图,等待原图

  function place(x, y) {
    const pad = 16, vw = innerWidth, vh = innerHeight;
    const w = box.offsetWidth || 500, h = box.offsetHeight || 400;
    let left = x + pad, top = y + pad;
    if (left + w > vw - pad) left = x - w - pad;
    if (top  + h > vh - pad) top  = y - h - pad;
    box.style.left = Math.max(pad, left) + 'px';
    box.style.top  = Math.max(pad, top)  + 'px';
  }

  // 找到 attachment-popover-img 所在的 body 直接子节点(portal 根)
  function findNativeRoot(el) {
    let cur = el;
    while (cur.parentElement && cur.parentElement !== document.body) cur = cur.parentElement;
    if (cur === document.body) return null;
    const pos = getComputedStyle(cur).position;
    return (pos === 'fixed' || pos === 'absolute') ? cur : null;
  }

  function hideNativeContainer() {
    if (hiddenNativeEl || !popoverEl) return;
    const root = findNativeRoot(popoverEl);
    if (!root) return;
    hiddenNativeEl = root;
    root.style.setProperty('opacity', '0', 'important');
    root.style.setProperty('pointer-events', 'none', 'important');
  }

  function restoreNativeContainer() {
    if (!hiddenNativeEl) return;
    hiddenNativeEl.style.removeProperty('opacity');
    hiddenNativeEl.style.removeProperty('pointer-events');
    hiddenNativeEl = null;
  }

  function showUrl(url, x, y, mode) {
    if (!url) return;
    if (url === currentSrc) {
      if (box.style.display === 'block') place(x, y);
      return;
    }
    currentSrc = url;
    imgEl.src = url;  // 保留旧图过渡,不提前 removeAttribute
    popupMode = mode;
    box.style.display = 'block';
    place(x, y);
    if (mode === 'bitable') hideNativeContainer();
  }

  // 根据来源元素的已知尺寸预设 imgEl 大小,避免浮窗出现时先小后大
  function presizeImgEl(nw, nh) {
    if (!nw || !nh) { imgEl.style.width = ''; imgEl.style.height = ''; return; }
    const maxW = innerWidth * 0.8, maxH = innerHeight * 0.8;
    const scale = Math.min(1, maxW / nw, maxH / nh);
    imgEl.style.width  = Math.round(nw * scale) + 'px';
    imgEl.style.height = Math.round(nh * scale) + 'px';
  }

  function showLoading() {
    hideNativeContainer();
    imgEl.removeAttribute('src');
    imgEl.style.width = ''; imgEl.style.height = '';
    currentSrc = '';
    tipEl.textContent = '加载原图中…';
    popupMode = 'bitable';
    box.style.display = 'block';
    place(lastX, lastY);
  }

  function hide() {
    restoreNativeContainer();
    box.style.display = 'none';
    imgEl.removeAttribute('src');
    imgEl.style.width = ''; imgEl.style.height = '';
    tipEl.textContent = '';
    currentSrc = '';
    popupMode = null;
  }

  // =========== 文档图片 ===========
  function findDocImg(el) {
    let cur = el;
    for (let i = 0; i < 8 && cur; i++) {
      if (cur.tagName === 'IMG' && cur.classList.contains('docx-image') && cur.src) return cur;
      // 图片上方可能有 overlay div（image-area-container），向下找同容器内的 docx-image
      if (cur.tagName !== 'IMG') {
        const inner = cur.querySelector?.('img.docx-image');
        if (inner?.src) return inner;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function detectDoc() {
    if (!altHeld || !lastTarget) return false;
    const found = findDocImg(lastTarget);
    if (found) {
      presizeImgEl(found.naturalWidth, found.naturalHeight);
      showUrl(found.src, lastX, lastY, 'doc');
      return true;
    }
    if (popupMode === 'doc') hide();
    return false;
  }

  // =========== 多维表格图片 ===========

  function isElVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0;
  }

  // 原图 load 完成回调
  function onPopoverLoad() {
    if (!altHeld || !popoverEl) return;
    if (popoverEl.naturalWidth > LARGE_MIN_W && isElVisible(popoverEl)) {
      presizeImgEl(popoverEl.naturalWidth, popoverEl.naturalHeight);
      showUrl(popoverEl.src, lastX, lastY, 'bitable');
    }
  }

  function bindPopover(el) {
    if (el === popoverEl) return;
    unbindPopover();
    popoverEl = el;
    el.addEventListener('load', onPopoverLoad);
    // src 变更时也检查（若浏览器已缓存,load 不会再触发）
    popoverSrcObs = new MutationObserver(() => {
      if (popoverEl?.naturalWidth > LARGE_MIN_W) onPopoverLoad();
    });
    popoverSrcObs.observe(el, { attributes: true, attributeFilter: ['src'] });
  }

  function unbindPopover() {
    if (popoverSrcObs) { popoverSrcObs.disconnect(); popoverSrcObs = null; }
    if (popoverEl) { popoverEl.removeEventListener('load', onPopoverLoad); popoverEl = null; }
  }

  // 常驻 200ms tracker:提前绑定监听器,不等 Alt 按下再发现元素
  setInterval(() => {
    const el = document.querySelector('img.attachment-popover-img');
    if (el) {
      bindPopover(el);
    } else if (popoverEl) {
      unbindPopover();
      if (popupMode === 'bitable') hide();
    }
  }, 200);

  // Alt 按住时的轮询:处理 CSS 显隐 + 兜底触发
  function checkBitable() {
    if (popupMode === 'doc') return;
    // 若 tracker 还没来得及绑定,主动查一次
    if (!popoverEl) {
      const el = document.querySelector('img.attachment-popover-img');
      if (el) bindPopover(el);
    }
    if (!popoverEl || !isElVisible(popoverEl)) {
      if (popupMode === 'bitable') hide();
      return;
    }
    if (!altHeld) return;
    if (popoverEl.src && popoverEl.naturalWidth > LARGE_MIN_W) {
      presizeImgEl(popoverEl.naturalWidth, popoverEl.naturalHeight);
      showUrl(popoverEl.src, lastX, lastY, 'bitable');
    } else if (popupMode !== 'bitable') {
      showLoading();  // 占位:大图还在加载
    }
  }

  function startBitableWatch() {
    if (bitableTimer) return;
    checkBitable();
    bitableTimer = setInterval(checkBitable, 50);
  }

  function stopBitableWatch() {
    clearInterval(bitableTimer);
    bitableTimer = null;
  }

  // =========== 事件 ===========
  document.addEventListener('mouseover', (e) => {
    lastTarget = e.target; lastX = e.clientX; lastY = e.clientY;
    if (e.altKey !== altHeld) altHeld = e.altKey;
    if (altHeld) {
      if (!detectDoc()) checkBitable();  // doc 优先;未命中时也检查 bitable
    }
  }, true);

  document.addEventListener('mousemove', (e) => {
    lastTarget = e.target; lastX = e.clientX; lastY = e.clientY;
    if (e.altKey !== altHeld) {
      altHeld = e.altKey;
      if (!altHeld) { stopBitableWatch(); hide(); return; }
      startBitableWatch();
    }
    if (!altHeld) return;
    if (popupMode === 'bitable') {
      place(e.clientX, e.clientY);
    } else {
      if (!detectDoc()) checkBitable();  // 同上
    }
  }, true);

  addEventListener('keydown', (e) => {
    if (e.key !== 'Alt' || e.repeat) return;
    e.preventDefault();
    altHeld = true;
    startBitableWatch();
    detectDoc();
  }, true);

  addEventListener('keyup', (e) => {
    if (e.key === 'Alt') { altHeld = false; stopBitableWatch(); hide(); }
  }, true);

  addEventListener('blur',   () => { altHeld = false; stopBitableWatch(); hide(); });
  addEventListener('scroll', hide, true);
})();
