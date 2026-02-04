# 更新日志

本项目的所有重要变更都会记录在此文件。
格式参考 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
并遵循 [语义化版本](https://semver.org/spec/v2.0.0.html)。

## [1.0.0] - 2026-02-04

### 新增
- 核心 Agent 运行时（Claude API 接入与 Token 统计）
- CLI 启动与插件管理命令
- 插件系统（热加载与安装/更新）
- 飞书渠道集成
- 定时任务工具（创建/查询/暂停/恢复/取消）
- 记忆工具（remember/recall，支持用户/会话级）
- 网页抓取工具
- 社区插件示例（hello-world、web-fetch、browser-control）

### 安全
- Web 抓取的输入校验与 SSRF 防护
- 插件与配置路径的安全处理

