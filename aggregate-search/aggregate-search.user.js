// ==UserScript==
// @name         聚合搜索V4
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  整合百度、Google、微信、Bing、知乎、知网空间搜索，提高搜索效率。在原作者基础上自行修改了部分内容，原作者链接：https://greasyfork.org/zh-CN/scripts/436652
// @author       Liao Brant

// @match        *://www.baidu.com/s*
// @match        *://www.baidu.com/baidu*
// @match        *://weixin.sogou.com/weixin*
// @match        *://*.bing.com/search*
// @match        *://tieba.baidu.com/f/search/*
// @match        *://www.zhihu.com/search*

// @match        *://search.bilibili.com/*
// @match        *://zh.wikipedia.org/w/index.php?search=*

// @grant        unsafeWindow
// @grant        window.onload
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-body

// @license     MIT
// ==/UserScript==

// @require      https://greasyfork.org/zh-CN/scripts/436652

// 搜索网址配置
const urlMapping = [
  {
    name: "百度",
    searchUrl: "https://www.baidu.com/s?wd=",
    keyName: "wd",
    testUrl: /https:\/\/www.baidu.com\/s.*/,
  },
  {
    name: "Bing",
    searchUrl: "https://www.bing.com/search?q=",
    keyName: "q",
    testUrl: /https:\/\/(www|cn)\.bing\.com\/search.*/,
  },
//{
//  name: "Google",
//  searchUrl: "https://www.google.com/search?q=",
//  keyName: "q",
//  testUrl: /https:\/\/www.google.com\/search.*/,
//},
  {
    name: "知乎",
    searchUrl: "https://www.zhihu.com/search?type=content&q=",
    keyName: "q",
    testUrl: /https:\/\/www.zhihu.com\/search.*/,
  },


  {
    name: "微信文章",
    searchUrl: "https://weixin.sogou.com/weixin?type=2&s_from=input&query=",
    keyName: "query",
    testUrl: /https:\/\/weixin.sogou.com\/weixin.*/,
  },

  {
    name: "百度贴吧",
    searchUrl: "https://tieba.baidu.com/f/search/res?ie=utf-8&qw=",
    keyName: "qw",
    testUrl: /https:\/\/tieba.baidu.com\/f\/search\/res.*/,
  },
  {
    name: "中文维基",
    searchUrl: "https://zh.wikipedia.org/w/index.php?search=",
    keyName: "search",
    testUrl: /https:\/\/zh.wikipedia.org\/w\/index.php.*/,
  },
  {
    name: "Bilibili",
    searchUrl: "https://search.bilibili.com/all?vt=06981212&keyword=",
    keyName: "keyword",
    testUrl: /https:\/\/search.bilibili.com\/all.*/,
  },
//  {
//    name: "BingG",
//    searchUrl: "https://www.bing.com/search?ensearch=0&q=",
//    keyName: "q",
//    testUrl: /https:\/\/www.bing.com\/search.*/,
//  },
]
// JS获取url参数
function getQueryVariable(variable) {
  let query = window.location.search.substring(1);
  let pairs = query.split("&");
  for (let pair of pairs) {
    let [key, value] = pair.split("=");
    if (key == variable) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// 从url中获取搜索关键词
function getKeywords() {
  let keywords = "";
  for (let item of urlMapping) {
    if (item.testUrl.test(window.location.href)) {
      keywords = getQueryVariable(item.keyName);
      break;
    }
  }
  console.log(keywords);
  return keywords;
}

// 域名
const hostname = window.location.hostname;

let isBlank = GM_getValue("isBlank");

console.log("新标签页打开？", isBlank);
if (isBlank === undefined) {
  GM_setValue("isBlank", false);
  isBlank = false;
}

// 改变打开搜索引擎的方式
const engine = document.getElementsByClassName("search-engine-a");
function triggerAttribute(value) {
  for (const item of engine) {
    item.target = value;
  }
}

// 适配火狐浏览器的百度搜索
const isFirefox = () => {
  if (navigator.userAgent.indexOf("Firefox") > 0) {
    console.warn("[ Firefox ] 🚀");
    urlMapping[0].searchUrl = "https://www.baidu.com/baidu?wd=";
    urlMapping[0].testUrl = /https:\/\/www.baidu.com\/baidu.*/;
  } else {
    return;
  }
};

// 添加节点
function addBox() {
  isFirefox();
  // 主元素
  const div = document.createElement("div");
  div.id = "search-app-box";
  div.style =
    "position: fixed; top: 160px; left: 1px; width: 80px; background-color: #EEEEEE; font-size: 12px;z-index: 99999;border-radius: 8px;";
  document.body.insertAdjacentElement("afterBegin", div);

  let title = document.createElement("span");
  title.innerText = "切换搜索";
  title.style = `
    display: block;
    text-align: center;
    margin-top: 10px;
    margin-bottom: 5px;
    font-size: 14px;
    font-weight: bold;
    -webkit-user-select:none;
    -moz-user-select:none;
    -ms-user-select:none;
    user-select:none;
    color: #666666;
    `;

  title.style.textDecoration = isBlank ? "underline" : "";
  title.ondblclick = () => {
    title.style.textDecoration = !isBlank ? "underline" : "";
    GM_setValue("isBlank", !isBlank);
    isBlank = !isBlank;
    triggerAttribute(isBlank ? "_blank" : "");
  };
  div.appendChild(title);

  // 搜索列表
  for (let index in urlMapping) {
    let item = urlMapping[index];

    // 样式
    let style =
      "display: block; padding: 10px 0; text-decoration: none; text-align: center;";

    // 判断是否为当前网站
const isCurrentSite = (() => {
  // 特殊处理 Bing：只要域名包含 bing.com 就算当前网站
  if (item.name === "Bing" && hostname.includes("bing.com")) {
    return true;
  }
  // 其他网站保持原来的判断方式
  return item.searchUrl.includes(hostname);
})();

    // 根据是否为当前网站设置不同的默认样式 - 修改为白色字体+深灰色背景
    let defaultStyle = style;
    if (isCurrentSite) {
      defaultStyle +=
        "color: #ffffff !important; " + // 白色字体
        "background-color: #A7A7A7 !important; " + // 深灰色背景
        "border-radius: 8px !important;"; // 圆角
    } else {
      defaultStyle += "color: #333333 !important;"; // 其他网站：灰色文字
    }

    let hoverStyle =
      style + "font-weight: normal !important; " + "color: #ffffff !important; background-color: #00b176;border-radius: 8px;";

    let a = document.createElement("a");
    a.innerText = item.name;
    a.style = defaultStyle;
    a.className = "search-engine-a";
    a.href = item.searchUrl + getKeywords();
    if (!item.searchUrl.includes(hostname) && isBlank) {
      a.target = "_blank";
    }

    // 鼠标移入移除效果，相当于hover
    a.onmouseenter = function () {
      this.style = hoverStyle;
    };
    a.onmouseleave = function () {
      this.style = defaultStyle;
    };
    div.appendChild(a);
  }
}

(function () {
  "use strict";
  window.onload = addBox();
})();
