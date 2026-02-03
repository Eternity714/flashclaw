/**
 * Hello World 测试插件
 * 用于验证 FlashClaw 插件安装功能
 */

import type { ToolPlugin, ToolContext, ToolResult } from 'flashclaw';

const plugin: ToolPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: '测试插件 - 向用户打招呼',
  type: 'tool',

  tools: [
    {
      name: 'say_hello',
      description: '向指定的人打招呼',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '要打招呼的人的名字',
          },
          language: {
            type: 'string',
            enum: ['zh', 'en', 'ja'],
            description: '语言：zh=中文, en=英文, ja=日文',
            default: 'zh',
          },
        },
        required: ['name'],
      },

      async execute(
        params: { name: string; language?: string },
        context: ToolContext
      ): Promise<ToolResult> {
        const { name, language = 'zh' } = params;

        const greetings: Record<string, string> = {
          zh: `你好，${name}！欢迎使用 FlashClaw ⚡`,
          en: `Hello, ${name}! Welcome to FlashClaw ⚡`,
          ja: `こんにちは、${name}さん！FlashClaw へようこそ ⚡`,
        };

        const message = greetings[language] || greetings['zh'];

        return {
          success: true,
          data: { message, name, language },
          message,
        };
      },
    },
  ],

  // 插件加载时调用
  async onLoad() {
    console.log('[hello-world] 插件已加载');
  },

  // 插件卸载时调用
  async onUnload() {
    console.log('[hello-world] 插件已卸载');
  },
};

export default plugin;
