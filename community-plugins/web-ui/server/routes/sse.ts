/**
 * SSE (Server-Sent Events) 路由
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { watchLogs, logFileExists } from '../services/logs.js';

export const sseRoutes = new Hono();

/**
 * 转义 HTML
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 实时日志流
sseRoutes.get('/logs', async (c) => {
  return streamSSE(c, async (stream) => {
    let cleanup: (() => void) | null = null;

    try {
      // 检查日志文件是否存在
      if (!logFileExists()) {
        // 开发模式下没有日志文件，发送提示后保持连接
        await stream.writeSSE({
          data: `<div class="log-line log-info">开发模式：日志输出到控制台，实时流不可用。</div>`,
          event: 'message',
        });
      }
      
      // 开始监听日志
      cleanup = watchLogs((log) => {
        const levelClass = `log-${log.level}`;
        const html = `<div class="log-line ${levelClass}" data-level="${log.level}"><span style="color: var(--pico-muted-color);">[${escapeHtml(log.time)}]</span> ${escapeHtml(log.message)}</div>`;
        
        stream.writeSSE({
          data: html,
          event: 'message',
        }).catch(() => {
          // 连接已关闭
        });
      });

      // 保持连接
      // 每 30 秒发送一个心跳以保持连接
      while (true) {
        await stream.writeSSE({
          data: '',
          event: 'heartbeat',
        }).catch(() => {
          // 连接已关闭
          throw new Error('Connection closed');
        });
        await stream.sleep(30000);
      }
    } catch {
      // 连接关闭或出错
    } finally {
      if (cleanup) {
        cleanup();
      }
    }
  });
});

// 状态变化流（可选）
sseRoutes.get('/status', async (c) => {
  return streamSSE(c, async (stream) => {
    try {
      // 每 5 秒推送一次状态
      while (true) {
        const { getServiceStatus } = await import('../services/status.js');
        const status = getServiceStatus();
        
        await stream.writeSSE({
          data: JSON.stringify(status),
          event: 'status',
        }).catch(() => {
          throw new Error('Connection closed');
        });
        
        await stream.sleep(5000);
      }
    } catch {
      // 连接关闭
    }
  });
});
