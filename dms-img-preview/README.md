# DMS 图片 URL 悬停预览

Violentmonkey 用户脚本。在阿里云 DMS(`dms.aliyun.com`) 查询结果中，按住 **Alt** 悬停含图片 URL 的单元格，即可直接弹窗预览；看到需要的图片后，双击 **Alt** 可在新窗口打开最近预览的 URL。

## 安装

1. 浏览器装 Violentmonkey 扩展
2. 浏览器扩展管理页打开「开发者模式」
3. Violentmonkey 控制台 → 新建脚本 → 把 `dms-img-preview.user.js` 内容粘进去保存
4. 进入该脚本编辑页 → 右上角菜单 → **跟踪本地文件** → 选本目录下的 `dms-img-preview.user.js`
5. 之后改本地文件 + 刷新 DMS 页面就能看到效果

## 使用

| 操作 | 结果 |
|---|---|
| 按住 Alt + 鼠标移到 cell | 旁边浮窗显示图片 |
| 鼠标继续移动 | 浮窗跟随，内容随单元格切换 |
| 松开 Alt | 浮窗消失 |
| 看到目标图片后双击 Alt | 在新窗口打开最近预览的图片 URL |
| Hover 完整 URL 的 cell | 立即显示 (0 延迟) |
| Hover 截断 cell(含"内容已被截断"提示) | 自动展开抓取 (~500ms~2s)，缓存后再 hover 立即显示 |

## 控制台命令

- `__dmsClearCache()` —— 手动清空 URL 缓存 (数据更新后想强制重抓时用)

## 调试

如果某个单元格识别不出来或者抓取不稳定，把脚本里 `const DEBUG = false` 改成 `true`，刷新页面，控制台会输出 `[dms-preview]` 开头的日志。

## 已知限制

- **OSS 防盗链**：部分图片服务器拒绝来自 `dms.aliyun.com` 的 referer，脚本已加 `referrerPolicy="no-referrer"` 绕过，但仍有可能加载失败，浮窗会提示
- **OSS 签名过期**：URL 带 `?Expires=...` 且已过期时，图片加载失败属正常
- **截断单元格首次 hover 有 ~500ms~2s 延迟**：DMS 弹窗 render 耗时，脚本压不下来。同一格再次 hover 走缓存，立即显示
- **DMS 改版风险**：截断抓取依赖 DMS 弹窗结构和"内容已被截断"提示文本，DMS 大改版可能失效

## 关键参数 (脚本顶部)

- `IMG_URL_RE`：图片 URL 正则。后缀目前支持 `jpg/jpeg/png/gif/webp/bmp/svg`，要加别的格式在这里改
- `TRUNCATION_MARKER`：DMS 截断提示文本，DMS 改了文案要在这里同步
