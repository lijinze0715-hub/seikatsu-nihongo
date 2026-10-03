# 课程数据

`n5-source.txt` 是第 1～20 课的唯一可编辑内容来源。`n5.json` 由 `scripts/import-n5.mjs` 生成。每课保存引言、八个编号环节、两个附录和两项测试，共十二个栏目。栏目正文按原稿顺序存为 `blocks`，保留逐行对话、例题、答案、词汇、跟读稿及说明。第 7、8 环节仍是“暂搁置”占位，不计入学习进度。旧的桌面导出不作为当前版本来源。

`preparation.json` 保留假名与基础发音准备篇。课程数据不再包含 N4 或 N3。

修改课程后运行 `node scripts/import-n5.mjs content/n5-source.txt` 和 `node scripts/sync-course-docs.mjs`，再运行 `npm run validate:content`、`npm test` 与 `npm run build:pages`。根目录 `README.md` 自动收录 `review-notes.md`、准备篇及20课完整修正版。内容检查会验证 TXT、JSON 与 README 没有漂移；测试核对词汇、题目答案、角色和语体对照与正文是否一致。修正文稿时也要同步两版跟读及相关例题。文档中的参考链接保存在 `n5.json` 的 `references` 中。

站点朗读调用访客设备的日语系统语音，不替代真人示范音频。跟读录音只在浏览器内暂存；切换句子、版本、学习环节或离开页面后清除。
