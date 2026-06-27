# [fix] Bilibili 追番追剧-移除预告 PV

**适用平台**：B 站动态页 (`https://t.bilibili.com/*`)

## 功能

在追番 / 追剧动态列表里，自动隐藏包含以下关键字的番剧卡片：

> 预告、倒计时、定档、OP、op、ED、ed、PV、pv

每 500ms 扫一次，懒加载出来的新卡片也会被清掉。

## 用法

1. 安装脚本（Violentmonkey 追踪外部编辑）
2. 打开 `https://t.bilibili.com/`，切到追番 / 追剧动态
3. 非正片卡片自动消失，无需任何操作

## 说明

- 改自 MrLv 的同名老脚本，去除 jQuery 依赖，修复 B 站改版后 class 命名变化导致失效的问题
- 移除了原版 `@updateURL` / `@downloadURL`，防止被自动更新覆盖
- 关键字列表在脚本顶部 `str` 数组，可自行增删
