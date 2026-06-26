# 浏览器脚本工作区 (browser-userscripts)

我自用的**浏览器用户脚本 (油猴 / userscript)** 集合。每个脚本一个文件夹，内含脚本本身和说明。

## 脚本清单

| 文件夹 | 脚本 | 说明 |
|---|---|---|
| [`fix-wider-bilibili/`](./fix-wider-bilibili/) | **[fix] Wider Bilibili 宽屏** | 改自 [Wider Bilibili](https://greasyfork.org/scripts/474507)。让 B 站「网页全屏」按钮重新可用，顺带修番剧页空白。 |
| [`aggregate-search/`](./aggregate-search/) | **聚合搜索 V4** | 改自 [聚合搜索](https://greasyfork.org/zh-CN/scripts/436652)。搜索结果页左侧加切换面板，带关键词一键跳到其他搜索引擎。 |
| [`dms-img-preview/`](./dms-img-preview/) | **DMS 图片 URL 悬停预览** | 阿里云 DMS 查询结果里，按住 Alt 悬停含图片 URL 的单元格直接弹窗预览；截断单元格也能自动展开抓取。 |
| [`feishu-img-preview/`](./feishu-img-preview/) | **飞书图片大图预览** | 飞书文档 / 多维表格中，按住 Alt 悬停图片弹大图浮窗；多维表格隐藏原生小预览、显示更大版本。 |
| [`link-test/`](./link-test/) | **链路测试** | 在任意网页右下角注入带版本号的小标签，验证"改文件 → 油猴同步 → 刷新生效"链路通不通。 |

## 工作方式：油猴「追踪外部编辑」

Violentmonkey 的 **Track external edits** 功能让油猴追踪本地文件，文件一改自动同步，无需手动复制粘贴。

参考：<https://violentmonkey.github.io/posts/how-to-edit-scripts-with-your-favorite-editor/>

**一次性接入 (每个脚本做一次)**

1. 浏览器已装 **Violentmonkey** 扩展
2. 打开油猴控制台
3. 把 `.user.js` 文件拖到油猴设置页
4. 安装界面里点 **「Track external edits / 追踪外部编辑」**

**之后**：改文件 → F5 刷新对应网页 → 看到效果。

## 目录约定

```
browser-userscripts/
├── README.md
└── <script-name>/
    ├── <script-name>.user.js
    └── README.md             # 来源、改了什么、注意事项、用法
```

修改自第三方脚本时：
- 文件名和 `@name` 加 `fix` / `[fix]` 前缀
- 移除原版的 `@updateURL` / `@downloadURL`，防止被自动更新覆盖
- 改 `@namespace` 让本地版与原版共存

## 协议

改自第三方脚本的沿用其原始开源协议，详见对应文件夹 README。
