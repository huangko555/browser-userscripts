// ==UserScript==
// @name         DMS 图片 URL 悬停预览
// @namespace    hkq.dms
// @version      1.0.0
// @description  DMS 查询结果里,按住 Alt 悬停含图片 URL 的单元格直接弹窗预览;截断单元格自动展开抓取,结果缓存
// @match        https://dms.aliyun.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const IMG_URL_RE = /https?:\/\/[^\s"'<>()]+?\.(?:jpe?g|png|gif|webp|bmp|svg)(?:\?[^\s"'<>()]*)?/i;
  const IMG_URL_RE_G = new RegExp(IMG_URL_RE.source, 'gi');
  const TRUNCATION_MARKER = '内容已被截断';
  // 只用作"礼貌关闭":在已追踪节点 *内部* 找到关闭按钮
  const CLOSE_SELECTOR = [
    '.next-dialog-close', '.next-overlay-wrapper-close', '.next-icon-close',
    '.ant-modal-close', '.ant-modal-close-x',
    '[aria-label*="lose" i]', '[aria-label*="关闭"]',
  ].join(', ');
  // 出问题想看日志时把 DEBUG 改为 true,刷新页面即可
  const DEBUG = false;
  const log = (...a) => DEBUG && console.log('[dms-preview]', ...a);

  // ============== 浮窗 ==============
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', zIndex: '2147483647', padding: '4px',
    background: '#fff', border: '1px solid #ccc', borderRadius: '4px',
    boxShadow: '0 2px 12px rgba(0,0,0,.25)', pointerEvents: 'none',
    display: 'none',
  });
  const img = document.createElement('img');
  img.referrerPolicy = 'no-referrer';
  Object.assign(img.style, {
    display: 'block', maxWidth: '400px', maxHeight: '400px', objectFit: 'contain',
  });
  const tip = document.createElement('div');
  Object.assign(tip.style, {
    fontSize: '11px', color: '#999', marginTop: '4px',
    maxWidth: '400px', wordBreak: 'break-all',
  });
  box.appendChild(img);
  box.appendChild(tip);
  document.documentElement.appendChild(box);

  // ============== 状态 ==============
  let altHeld = false;
  let lastTarget = null, lastX = 0, lastY = 0;
  let currentUrl = '';
  let lastPreviewUrl = '';
  let lastAltDownAt = 0;
  const URL_CACHE = new Map();
  // 正在进行的 scrape:{ sig, abortFn, promise }
  let activeScrape = null;

  const clearImg = () => { img.removeAttribute('src'); };
  const hide = () => {
    box.style.display = 'none';
    clearImg(); tip.textContent = ''; currentUrl = '';
  };

  function place(x, y) {
    const pad = 16, vw = innerWidth, vh = innerHeight;
    const w = box.offsetWidth, h = box.offsetHeight;
    let left = x + pad, top = y + pad;
    if (left + w > vw) left = x - w - pad;
    if (top + h > vh) top = y - h - pad;
    box.style.left = Math.max(pad, left) + 'px';
    box.style.top = Math.max(pad, top) + 'px';
  }

  function showUrl(url, x, y) {
    if (url !== currentUrl) {
      currentUrl = url; img.src = url; tip.textContent = '加载中…';
    }
    lastPreviewUrl = url;
    box.style.display = 'block';
    place(x, y);
  }

  function collectText(el) {
    const chunks = [(el.innerText || el.textContent || '').slice(0, 8000)];
    let cur = el;
    for (let i = 0; i < 6 && cur; i++) {
      if (cur.title) chunks.push(cur.title);
      const al = cur.getAttribute && cur.getAttribute('aria-label');
      if (al) chunks.push(al);
      if (cur.dataset) for (const k in cur.dataset) chunks.push(cur.dataset[k]);
      cur = cur.parentElement;
    }
    return chunks.join(' \n ');
  }

  function findTruncatedCell(el) {
    // 优先返回含截断标记的 TD / gridcell(canonical cell 边界,稳定的 signature)
    let cur = el;
    for (let i = 0; i < 15 && cur; i++) {
      if (cur.tagName === 'TD' || (cur.getAttribute && cur.getAttribute('role') === 'gridcell')) {
        if ((cur.innerText || '').includes(TRUNCATION_MARKER)) return cur;
      }
      cur = cur.parentElement;
    }
    // 兜底:没找到 TD,用第一个含 marker 的祖先
    cur = el;
    for (let i = 0; i < 12 && cur; i++) {
      if ((cur.innerText || '').includes(TRUNCATION_MARKER)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  const cellSignature = (el) => (el.innerText || '').slice(0, 200).trim();

  // ============== 静默自动展开 ==============
  function hideNode(n) {
    if (!n || n.nodeType !== 1) return;
    try {
      n.style.setProperty('visibility', 'hidden', 'important');
      n.style.setProperty('opacity', '0', 'important');
      n.style.setProperty('pointer-events', 'none', 'important');
    } catch (_) {}
  }

  async function scrapeTruncated(cellEl) {
    const sig = cellSignature(cellEl);

    if (URL_CACHE.has(sig) && URL_CACHE.get(sig)) {
      log('cache hit', sig.slice(0, 50));
      return URL_CACHE.get(sig);
    }
    // 同 cell 已在跑 → 复用 promise
    if (activeScrape && activeScrape.sig === sig) {
      return activeScrape.promise;
    }
    // 别的 cell 在跑 → 立即中断它,开始新的
    if (activeScrape && activeScrape.sig !== sig) {
      log('aborting previous scrape');
      activeScrape.abortFn();
      activeScrape = null;
    }

    let aborted = false;
    const promise = runScrape(cellEl, sig, () => aborted);
    activeScrape = { sig, abortFn: () => { aborted = true; }, promise };
    try {
      return await promise;
    } finally {
      if (activeScrape && activeScrape.sig === sig) activeScrape = null;
    }
  }

  async function runScrape(cellEl, sig, isAborted) {
    log('start scrape', sig.slice(0, 50));
    const urlsBefore = new Set();
    for (const m of (document.body.innerText || '').matchAll(IMG_URL_RE_G)) urlsBefore.add(m[0]);

    const tracked = new Set();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.parentNode === document.body || node.parentNode === document.documentElement) {
            hideNode(node);
            tracked.add(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true });
    observer.observe(document.documentElement, { childList: true });

    let foundUrl = null;
    try {
      if (isAborted()) throw new Error('aborted');
      const seq = ['mousedown', 'mouseup', 'click', 'mousedown', 'mouseup', 'click', 'dblclick'];
      for (const t of seq) {
        cellEl.dispatchEvent(new MouseEvent(t, {
          bubbles: true, cancelable: true, view: window, button: 0,
          clientX: lastX, clientY: lastY,
        }));
      }

      foundUrl = await new Promise((resolve, reject) => {
        const start = Date.now();
        const iv = setInterval(() => {
          if (isAborted()) { clearInterval(iv); reject(new Error('aborted')); return; }
          for (const node of tracked) {
            const text = node.innerText || node.textContent || '';
            const m = text.match(IMG_URL_RE);
            if (m) { clearInterval(iv); resolve(m[0]); return; }
          }
          const bodyText = document.body.innerText || '';
          for (const m of bodyText.matchAll(IMG_URL_RE_G)) {
            if (!urlsBefore.has(m[0])) { clearInterval(iv); resolve(m[0]); return; }
          }
          if (Date.now() - start > 4000) {
            clearInterval(iv);
            log('TIMEOUT, tracked count=' + tracked.size);
            reject(new Error('timeout'));
          }
        }, 20);
      });

      log('scraped url:', foundUrl);
    } catch (e) {
      log('scrape ' + e.message);
    } finally {
      observer.disconnect();
      for (const node of tracked) {
        try {
          const closeBtn = node.querySelector && node.querySelector(CLOSE_SELECTOR);
          if (closeBtn) closeBtn.click();
        } catch (_) {}
      }
      if (foundUrl) URL_CACHE.set(sig, foundUrl);
    }
    return foundUrl;
  }

  // 控制台手动清缓存:__dmsClearCache()
  window.__dmsClearCache = () => { URL_CACHE.clear(); log('cache cleared'); };

  // ============== 主流程 ==============
  async function detect() {
    if (!altHeld || !lastTarget) { hide(); return; }
    if (lastTarget === box || box.contains(lastTarget)) return;

    const text = collectText(lastTarget);
    const m = text.match(IMG_URL_RE);
    if (m) { showUrl(m[0], lastX, lastY); return; }

    const truncated = findTruncatedCell(lastTarget);
    if (truncated) {
      // 缓存命中?直接给(避免误判 busy)
      const sig = cellSignature(truncated);
      if (URL_CACHE.has(sig) && URL_CACHE.get(sig)) {
        showUrl(URL_CACHE.get(sig), lastX, lastY);
        return;
      }
      const savedTarget = truncated;
      tip.textContent = '抓取中…';
      clearImg();
      box.style.display = 'block';
      place(lastX, lastY);
      const url = await scrapeTruncated(truncated);
      if (altHeld && (lastTarget === savedTarget || savedTarget.contains(lastTarget))) {
        if (url) showUrl(url, lastX, lastY);
        else { tip.textContent = '⚠️ 未找到 URL,松开 Alt 重按可重试'; clearImg(); }
      } else {
        hide();
      }
    } else {
      hide();
    }
  }

  img.addEventListener('error', () => {
    if (img.getAttribute('src')) tip.textContent = '⚠️ 图片加载失败(可能防盗链/已过期)';
  });
  img.addEventListener('load',  () => { tip.textContent = ''; });

  document.addEventListener('mouseover', (e) => {
    lastTarget = e.target; lastX = e.clientX; lastY = e.clientY;
    altHeld = e.altKey;
    detect();
  }, true);

  document.addEventListener('mousemove', (e) => {
    lastTarget = e.target; lastX = e.clientX; lastY = e.clientY;
    if (e.altKey !== altHeld) { altHeld = e.altKey; detect(); }
    else if (altHeld && box.style.display === 'block') place(e.clientX, e.clientY);
    else if (!altHeld && box.style.display === 'block') hide();
  }, true);

  addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
      e.preventDefault();
      if (!e.repeat) {
        const now = Date.now();
        if (lastPreviewUrl && now - lastAltDownAt <= 350) {
          window.open(lastPreviewUrl, '_blank', 'noopener,noreferrer');
          lastAltDownAt = 0;
          return;
        }
        lastAltDownAt = now;
      }
      if (!altHeld) { altHeld = true; detect(); }
    }
  }, true);
  addEventListener('keyup', (e) => {
    if (e.key === 'Alt') { altHeld = false; hide(); }
  }, true);
  addEventListener('blur', () => { altHeld = false; hide(); });
  addEventListener('scroll', hide, true);
})();
