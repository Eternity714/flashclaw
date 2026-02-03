# Hello World 插件

> FlashClaw 测试插件 - 用于验证插件安装功能

## 安装

```bash
flashclaw plugins install GuLu9527/flashclaw-plugin-hello
```

## 功能

提供一个简单的 `say_hello` 工具，向用户打招呼。

### say_hello

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 要打招呼的人的名字 |
| language | string | ❌ | 语言：zh/en/ja，默认 zh |

**示例对话：**

```
用户：用日语跟小明打个招呼
AI：こんにちは、小明さん！FlashClaw へようこそ ⚡
```

## 开发

这是一个最小化的 FlashClaw 插件示例，展示了：

1. `plugin.json` - 插件清单文件
2. `index.ts` - 插件入口，导出 ToolPlugin 对象
3. `tools` 数组 - 定义 AI 可用的工具
4. `onLoad/onUnload` - 生命周期钩子

## 许可证

MIT
