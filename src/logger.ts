/**
 * FlashClaw 统一日志模块
 * 使用 pino 提供结构化日志，同时输出到控制台和文件
 */

import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { paths } from './paths.js';

// 确保日志目录存在
function ensureLogDir(): void {
  const logFile = paths.logFile();
  const logDir = dirname(logFile);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

// 创建 logger 实例
function createMainLogger(): pino.Logger {
  const level = process.env.LOG_LEVEL || 'info';
  
  // 开发模式：只输出到控制台
  if (process.env.NODE_ENV === 'development' || process.env.LOG_FILE === 'false') {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    });
  }
  
  // 生产模式：同时输出到控制台和文件
  ensureLogDir();
  const logFile = paths.logFile();
  
  return pino({
    level,
    transport: {
      targets: [
        // 控制台输出（带颜色）
        {
          target: 'pino-pretty',
          options: { colorize: true },
          level,
        },
        // 文件输出（结构化 JSON 格式，便于解析）
        {
          target: 'pino/file',
          options: { destination: logFile, mkdir: true },
          level,
        },
      ],
    },
  });
}

// 创建全局 logger 实例
export const logger = createMainLogger();

// 导出子 logger 工厂函数
export function createLogger(name: string): pino.Logger {
  return logger.child({ module: name });
}

export default logger;
