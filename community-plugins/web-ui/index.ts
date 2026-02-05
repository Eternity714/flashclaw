/**
 * FlashClaw Web UI 插件
 * 提供 Web 管理界面，支持实时监控、日志查看、任务和插件管理
 */

import type { ToolPlugin, ToolContext, ToolResult, ToolSchema, PluginConfig } from '../../src/plugins/types.js';
import { createApp } from './server/app.js';
import type { Server } from 'http';

// 服务器实例
let server: Server | null = null;
let serverUrl: string | null = null;

// 配置
let config = {
  port: 3000,
  host: '127.0.0.1',
  token: '',
};

/**
 * 打开浏览器（跨平台）
 */
async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  const platform = process.platform;
  
  let command: string;
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  
  exec(command, (err) => {
    if (err) {
      console.log(`⚡ Web UI: 无法自动打开浏览器，请手动访问 ${url}`);
    }
  });
}

// 工具 Schema
const webuiStatusSchema: ToolSchema = {
  name: 'webui_status',
  description: '获取 Web UI 运行状态和访问地址',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

const plugin: ToolPlugin = {
  name: 'web-ui',
  version: '1.0.0',
  description: 'FlashClaw Web 管理界面',

  tools: [webuiStatusSchema],

  async init(pluginConfig: PluginConfig): Promise<void> {
    // 读取配置
    config.port = Number(pluginConfig.port) || 3000;
    config.host = String(pluginConfig.host || '127.0.0.1');
    config.token = String(pluginConfig.token || '');

    // 创建并启动服务器
    const app = createApp({ token: config.token });
    
    const { serve } = await import('@hono/node-server');
    
    server = serve({
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
    }, (info) => {
      serverUrl = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${info.port}`;
      console.log(`⚡ Web UI 已启动: ${serverUrl}`);
      
      // 如果设置了 WEBUI_OPEN 环境变量，自动打开浏览器
      if (process.env.WEBUI_OPEN === '1' || process.env.WEBUI_OPEN === 'true') {
        openBrowser(serverUrl);
      }
    });
  },

  async execute(toolName: string, params: unknown, context: ToolContext): Promise<ToolResult> {
    if (toolName === 'webui_status') {
      return {
        success: true,
        data: {
          running: !!server,
          url: serverUrl,
          host: config.host,
          port: config.port,
          hasAuth: !!config.token,
        },
      };
    }

    return {
      success: false,
      error: `未知工具: ${toolName}`,
    };
  },

  async cleanup(): Promise<void> {
    if (server) {
      server.close();
      server = null;
      serverUrl = null;
      console.log('⚡ Web UI 已停止');
    }
  },
};

export default plugin;
