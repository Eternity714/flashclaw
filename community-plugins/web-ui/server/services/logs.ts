/**
 * 日志服务
 */

import { existsSync, readFileSync, watch, FSWatcher, statSync, openSync, readSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// 动态获取 FlashClaw 路径
function getFlashClawHome(): string {
  return process.env.FLASHCLAW_HOME || join(homedir(), '.flashclaw');
}

const paths = {
  logFile: () => join(getFlashClawHome(), 'logs', 'flashclaw.log'),
};

export interface LogLine {
  level: 'info' | 'warn' | 'error' | 'debug';
  time: string;
  message: string;
  raw: string;
}

// pino 日志级别数字映射
const PINO_LEVELS: Record<number, LogLine['level']> = {
  10: 'debug', // trace
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'error', // fatal
};

// 文本日志级别模式（兼容非 JSON 格式）
const LEVEL_PATTERNS: Record<string, RegExp> = {
  error: /\b(ERROR|error|Error)\b/,
  warn: /\b(WARN|warn|Warning)\b/,
  debug: /\b(DEBUG|debug)\b/,
  info: /\b(INFO|info)\b/,
};

/**
 * 解析日志行（支持 pino JSON 格式和纯文本格式）
 */
function parseLogLine(line: string): LogLine {
  const trimmed = line.trim();
  if (!trimmed) {
    return { level: 'info', time: '', message: '', raw: line };
  }

  // 尝试解析 pino JSON 格式
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      const level = PINO_LEVELS[json.level] || 'info';
      
      // 格式化时间
      let time = '';
      if (json.time) {
        try {
          const date = new Date(json.time);
          time = date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch {
          time = String(json.time);
        }
      }
      
      // 构建消息内容
      let message = json.msg || '';
      const module = json.module ? `[${json.module}]` : '';
      
      // 添加额外字段（排除标准字段）
      const extraFields: string[] = [];
      for (const [key, value] of Object.entries(json)) {
        if (!['level', 'time', 'msg', 'module', 'pid', 'hostname'].includes(key)) {
          extraFields.push(`${key}=${JSON.stringify(value)}`);
        }
      }
      
      if (module) {
        message = `${module} ${message}`;
      }
      if (extraFields.length > 0) {
        message = `${message} ${extraFields.join(' ')}`;
      }
      
      return { level, time, message, raw: line };
    } catch {
      // JSON 解析失败，回退到文本解析
    }
  }

  // 文本格式解析
  let level: LogLine['level'] = 'info';
  for (const [lvl, pattern] of Object.entries(LEVEL_PATTERNS)) {
    if (pattern.test(line)) {
      level = lvl as LogLine['level'];
      break;
    }
  }

  // 提取时间戳（常见格式）
  const timeMatch = line.match(/\d{2}:\d{2}:\d{2}/) || line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  const time = timeMatch ? timeMatch[0] : new Date().toLocaleTimeString('zh-CN');

  return {
    level,
    time,
    message: line,
    raw: line,
  };
}

/**
 * 检查日志文件是否存在
 */
export function logFileExists(): boolean {
  return existsSync(paths.logFile());
}

/**
 * 获取最近的日志
 */
export function getRecentLogs(limit = 100): LogLine[] {
  const logFile = paths.logFile();
  if (!existsSync(logFile)) {
    // 开发模式下没有日志文件，返回提示信息
    return [{
      level: 'info',
      time: new Date().toLocaleTimeString('zh-CN'),
      message: '开发模式：日志输出到控制台，未写入文件。生产环境运行 `flashclaw start` 后可查看日志。',
      raw: '',
    }];
  }

  try {
    const content = readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const recentLines = lines.slice(-limit);
    return recentLines.map(parseLogLine);
  } catch {
    return [];
  }
}

/**
 * 监听日志文件变化
 * @param callback 新日志行回调
 * @returns 停止监听的函数
 */
export function watchLogs(callback: (line: LogLine) => void): () => void {
  const logFile = paths.logFile();
  if (!existsSync(logFile)) {
    return () => {};
  }

  let lastSize = 0;
  let watcher: FSWatcher | null = null;

  try {
    // 获取初始文件大小
    const stats = statSync(logFile);
    lastSize = stats.size;

    watcher = watch(logFile, (eventType) => {
      if (eventType !== 'change') return;

      try {
        const newStats = statSync(logFile);
        if (newStats.size > lastSize) {
          // 读取新增的内容
          const fd = openSync(logFile, 'r');
          const buffer = Buffer.alloc(newStats.size - lastSize);
          readSync(fd, buffer, 0, buffer.length, lastSize);
          closeSync(fd);

          const newContent = buffer.toString('utf-8');
          const newLines = newContent.split('\n').filter(Boolean);
          
          for (const line of newLines) {
            callback(parseLogLine(line));
          }
        }
        lastSize = newStats.size;
      } catch {
        // 忽略读取错误
      }
    });
  } catch {
    // 忽略监听错误
  }

  return () => {
    if (watcher) {
      watcher.close();
    }
  };
}
