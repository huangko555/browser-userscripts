# 浏览器脚本工作区 (browser-userscripts)

这是我所有**浏览器用户脚本 (油猴脚本 / userscript)** 的统一存放与修改基地。
配合 Claude Code 使用：**Claude 改文件，我回浏览器刷新一下就能看到效果，全程不用复制粘贴。**

> 每个脚本一个独立文件夹，里面放「脚本本身 `.user.js` + 一个 README」。

---

## 脚本清单

| 文件夹 | 脚本 | 说明 |
|---|---|---|
| [`fix-wider-bilibili/`](./fix-wider-bilibili/) | **[fix] Wider Bilibili 宽屏** | 基于开源 [Wider Bilibili](https://greasyfork.org/scripts/474507) 的本地修改版。核心改动：**让「网页全屏」按钮重新可用**(改为切换"预留高度归零")；另含番剧页 (Next.js 改版) 空白修复。详见该文件夹 README。 |
 | [`aggregate-search/`](./aggregate-search/) | **聚合搜索 V4** | 基于开源 [聚合搜索](https://greasyfork.org/zh-CN/scripts/436652)（作者 Liao Brant）的本地修改版。在百度/Bing/知乎/微信/贴吧/维基/B 站等搜索结果页左侧加「切换搜索」面板，带着当前关键词一键跳到别的站接着搜。详见该文件夹 README。 |
| [`link-test/`](./link-test/) | **链路测试** | 自检用小脚本：在任意网页右下角注入带版本号的蓝色标签，用来验证「改文件 → 油猴同步 → 刷新生效」这条链路是否打通。详见该文件夹 README。 |

---

## 核心工作方式：油猴「追踪外部编辑」

用的是 Violentmonkey(油猴) 的 **Track external edits(追踪外部编辑)** 机制：
脚本文件存在本地硬盘上，油猴"追踪"这个文件——文件一变，油猴里的脚本就自动同步。

参考文章：<https://violentmonkey.github.io/posts/how-to-edit-scripts-with-your-favorite-editor/>

### 一次性接入某个脚本 (每个脚本做一次)
1. 浏览器已安装 **Violentmonkey** 扩展。
2. 打开油猴控制台 (右上角油猴图标 → 控制台 / 设置页)。
3. 把对应的 `.user.js` 文件**拖到油猴设置页面上**。
4. 在弹出的安装界面里点 **「Track external edits / 追踪外部编辑」**(界面出现 "Stop tracking / 停止追踪" 字样，就说明追踪开着了)。

### 之后的日常
- 改脚本文件 → 回对应网页 **按 F5 刷新** → 看到效果。
- 不需要复制粘贴，不需要重新拖文件。
- 想暂停同步：油猴里点 "Stop tracking"。

> 备选方案：若某天追踪失效 (浏览器太旧等)，可改用"本地服务器"方式 (`http-server`)，还能让网页自动刷新。

---

## 目录结构约定

```
browser-userscripts/
├── README.md                       ← 本文件:整个工作区的说明 + 脚本清单
├── fix-wider-bilibili/             ← 每个脚本一个独立文件夹
│   ├── fix-wider-bilibili.user.js  ← 脚本本身
│   └── README.md                   ← 这个脚本是什么、改了什么、注意事项、怎么用
└── link-test/
    ├── link-test.user.js
    └── README.md
```

**新增 / 修改脚本的规矩：**
- 每个脚本单独一个文件夹，里面放「脚本本身 + 一个 README」。
- 修改自开源脚本的，文件名和脚本 `@name` 都加 `fix` / `[fix]` 前缀，便于和原版区分。
- 改自第三方脚本时，**移除原版的 `@updateURL` / `@downloadURL`**，防止油猴自动更新覆盖本地修改；并改 `@namespace` 让它和原版共存。
- 每个脚本的 README 里要写清：来源 / 原版地址、基于的版本、改了什么、已知注意事项、怎么用。

---

## 协议

各脚本若改自第三方，沿用其原始开源协议 (如 Wider Bilibili 为 MIT)，详见对应脚本头部的 `@license` 与文件夹内 README。
