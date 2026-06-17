// ==UserScript==
// @name         链路测试 - 外部编辑同步
// @namespace    hkq.local.scripts
// @version      0.3.0
// @description  用来验证「Claude 改文件 → Violentmonkey 自动同步 → 刷新网页就能看到」这条链路。验证完可以删。
// @author       hkq
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // 想确认链路是否生效:我每改一次,就会把下面这个 VERSION 往上加,
  // 你刷新页面后看右下角小标签的版本号有没有跟着变,变了就说明同步成功。
  const VERSION = '0.3.0';

  const badge = document.createElement('div');
  badge.textContent = '油猴脚本已注入 ✓ v' + VERSION;
  badge.style.cssText = [
    'position:fixed',
    'right:12px',
    'bottom:12px',
    'z-index:2147483647',
    'padding:6px 12px',
    'background:#1f6feb',
    'color:#fff',
    'font:13px/1.4 system-ui,sans-serif',
    'border-radius:6px',
    'box-shadow:0 2px 8px rgba(0,0,0,.3)',
    'pointer-events:none',
    'user-select:none',
  ].join(';');

  document.body.appendChild(badge);
})();
