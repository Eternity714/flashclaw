# 发布流程

## 发布前检查

- `npm run typecheck`
- `npm test`
- `npm run build`
- 更新 `CHANGELOG.md`
- 更新 `docs/PLUGINS_CHANGELOG.md`（如有插件变更）
- 确认 `package.json` 版本号正确
- 运行 `flashclaw doctor` 确认环境正常
- 验证 `README.md` 中的说明与当前行为一致

## 发布步骤

1. 更新版本号（`package.json`）
2. 更新 `CHANGELOG.md`
3. 更新 `docs/PLUGINS_CHANGELOG.md`（内置/社区插件变更）
4. 提交版本变更
  `git commit -m "chore: bump version to X.Y.Z"`
5. 打标签
  `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
6. 推送提交与标签
  `git push && git push --tags`
7. 打包构建
  `npm run build`
8. 发布到 npm
  `npm publish`
9. 创建 GitHub Release（填写更新日志）

## 版本号规则

- Patch（1.0.X）：问题修复
- Minor（1.X.0）：向后兼容的新功能
- Major（X.0.0）：不向后兼容的变更

