# GitHub Pages 部署

## 本机 VOICEVOX 日语朗读

网站在浏览器中直接请求本机 `http://127.0.0.1:50021`，不经过网站服务器或第三方云服务。先启动 VOICEVOX / VOICEVOX Engine，再打开网页；顶部显示“VOICEVOX 已连接”后可选择 TTS 引擎与角色 / 风格。网页打开后才启动 Engine，可点击“重新检测 VOICEVOX”。未连接时浏览器语音仍可正常使用。三个选项（引擎、浏览器 voiceURI、VOICEVOX styleId）分别保存在当前网页 Origin 的 localStorage 中。

每课“学习环节 2：听对话”的对话上方可以按角色选择声优。所有“私”及“私→对方”共用跨课的“我”配置，其他角色按课次分别保存。浏览器和 VOICEVOX 的角色声音分别记住；未配置或保存的声音已不可用时使用页面顶部默认声音。连续播放在每句开始时重新读取角色配置，修改会用于后续句子。配置保存在 `seikatsu-nihongo:dialogue-voices-v1`，只保存 voiceURI/styleId。

初始化按 `/version`、`/speakers` 顺序检测与获取列表。合成按 `/audio_query`、`/synthesis` 顺序请求，speaker 使用动态返回的 style.id。歌唱专用风格无法用于这两个朗读 API，因此仅列出 talk 风格及旧版未提供 type 的风格。启动后安装/移除角色，可重新检测以刷新列表。

开发时可用 `http://localhost:<开发端口>` 打开网页。VOICEVOX Engine 的默认 `localapps` CORS 策略允许 localhost 相关来源；如仍失败，检查实际 Engine 配置及浏览器的本地网络访问权限。网页的 fetch 无法区分连接拒绝、CORS 拦截和本地网络限制，界面会列出排查项，不将所有网络错误误报为 Engine 未启动。

真实 HTTPS 网站访问本机 HTTP 服务可能受 CORS、安全上下文、混合内容或本地网络权限限制影响，不能保证所有浏览器直接连接成功。如需添加 Engine 允许来源，仅允许实际网页 Origin（例如 `https://lijinze0715-hub.github.io`，不要附带项目路径）。官方 Engine 支持 `--cors_policy_mode localapps --allow_origin <实际网页Origin>`；不要默认使用允许所有来源的 `all` 或 `*`。调整 Engine 的 CORS 不能绕过浏览器自身的访问限制。参见 [VOICEVOX Engine 官方 CORS 与启动说明](https://github.com/VOICEVOX/voicevox_engine/blob/master/README.md#cors-設定)。

不需要连接时可随时切回浏览器语音。切换引擎或停止播放会取消浏览器朗读、终止尚未完成的 VOICEVOX 请求并停止其音频；结束、取消和播放失败时均释放 Blob URL。客户端取消请求不保证 Engine 内部已经开始的计算也被终止，但过期结果不会播放。

在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。

将本次修改的工作流、构建脚本、配置与页面链接一起提交并推送到 `main`。`.github/workflows/deploy.yml` 会安装依赖，执行 `pnpm build:pages`，并将 `out/` 发布到 Pages。也可以在 Actions 页面手动运行工作流。

本仓库的默认项目地址为 https://lijinze0715-hub.github.io/seikatsu-nihongo/ 。最终地址以 Pages 设置和部署任务输出为准。

## 本地验证

```sh
pnpm build:pages
pnpm test
pnpm lint
```

`build:pages` 启用 Vinext 静态导出，整理目录首页，生成 `.nojekyll`，并检查首页、准备篇、20 课及旧链接页面和所有 HTML 中的本地资源、导航目标。构建结果保存在 `out/`，无需将产物提交到 Git。

工作流从 `actions/configure-pages` 读取站点路径，所以项目站点与根域名站点都可使用同一工作流。本地构建默认使用 `/seikatsu-nihongo`；测试其他路径可设置 `NEXT_PUBLIC_BASE_PATH`，根域名站点可设为空字符串。

静态导出使用单独的构建入口。原有 `pnpm dev`、`pnpm build` 和 Cloudflare 运行配置仍可使用。旧地址 `/lessons/1/`～`/lessons/20/` 和 `/levels/n5/` 在 Pages 上直接显示对应内容，在原服务器运行模式下继续重定向。

## 确认上线

在 Actions 中确认 `build` 和 `deploy` 都成功，再打开部署任务输出的网站地址。仅推送源码不代表部署已经成功。若仍显示旧 README，核对 Pages 的 Source 是否为 GitHub Actions，并确认最新成功运行使用了本工作流。
