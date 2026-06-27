// ==UserScript==
// @name         [fix] Bilibili追番追剧-移除预告PV
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  改自 MrLv 同名脚本。移除追番动态里的预告/PV/OP等非正片卡片（去除jQuery依赖 + 修复B站改版后class变化导致失效）
// @author       MrLv (原作) / 本地修改版
// @match        https://t.bilibili.com/*
// @icon         https://www.google.com/s2/favicons?domain=bilibili.com
// @grant        none
// @license MIT
// ==/UserScript==

(function () {
    'use strict';

    // 命中这些关键字的番剧卡片会被整张移除
    var str = ["预告", "倒计时", "定档", "OP", "op", "ED", "ed", "PV", "pv"];

    function clean() {
        // class 用"包含匹配",B站给标题加了 fs-medium 也照样命中
        var titles = document.querySelectorAll('[class*="bili-dyn-card-pgc__title"]');
        for (var i = 0; i < titles.length; i++) {
            var text = titles[i].textContent || '';

            var hit = false;
            for (var j = 0; j < str.length; j++) {
                if (text.indexOf(str[j]) >= 0) { hit = true; break; }
            }
            if (!hit) continue;

            // 从标题向上找到整张动态卡片,隐藏它
            var card = titles[i].closest('.bili-dyn-list__item');
            if (card) card.style.display = 'none';
        }
    }

    setInterval(clean, 500);
})()
