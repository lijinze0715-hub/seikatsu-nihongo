# 网站结构

网站保留原有 Vinext/React 静态运行方式。`content/n5.json` 和 `content/preparation.json` 保存课程数据，界面组件不直接维护课文。

- `src/modules/catalog/domain/n5-course.ts` 定义 N5 课程结构及顺序约束。
- `src/modules/catalog/infrastructure/n5-json-repository.ts` 从 JSON 读取课程。
- `src/modules/catalog/application/n5-service.ts` 提供课程与课次查询。
- `src/bootstrap/catalog.ts` 装配数据来源，并提供准备篇。
- `app/` 渲染首页、目录、课文及准备篇。
- `src/modules/learning/` 与 `hooks/use-learning-progress.ts` 保存设备本地的阅读进度。新 N5 课次使用独立身份，避免把旧课程的完成记录误认为新稿的学习成果；准备篇进度继续沿用。

`scripts/validate-content.mjs` 在构建前检查数据的结构和栏目完整性。N4、N3 的课程数据和页面已移除，旧地址由不存在的动态课程返回 404。
