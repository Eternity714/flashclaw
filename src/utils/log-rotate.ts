// src/utils/log-rotate.ts
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

interface RotateOptions {
  maxSize?: number;      // 最大文件大小（字节），默认 10MB
  maxFiles?: number;     // 最多保留文件数，默认 5
  compress?: boolean;    // 是否压缩旧日志，默认 false
}

const defaultOptions: Required<RotateOptions> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  compress: false,
};

/**
 * 检查并执行日志轮转
 */
export function rotateLogIfNeeded(logPath: string, options: RotateOptions = {}): void {
  const opts = { ...defaultOptions, ...options };
  
  if (!fs.existsSync(logPath)) {
    return;
  }
  
  const stats = fs.statSync(logPath);
  
  if (stats.size < opts.maxSize) {
    return;
  }
  
  logger.info({ logPath, size: stats.size }, '⚡ 执行日志轮转...');
  
  const dir = path.dirname(logPath);
  const ext = path.extname(logPath);
  const base = path.basename(logPath, ext);
  
  // 删除最旧的日志
  for (let i = opts.maxFiles - 1; i >= 1; i--) {
    const oldPath = path.join(dir, `${base}.${i}${ext}`);
    const newPath = path.join(dir, `${base}.${i + 1}${ext}`);
    
    if (i === opts.maxFiles - 1 && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    } else if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  }
  
  // 重命名当前日志
  const rotatedPath = path.join(dir, `${base}.1${ext}`);
  fs.renameSync(logPath, rotatedPath);
  
  // 创建新的空日志文件
  fs.writeFileSync(logPath, '');
  
  logger.info({ rotatedTo: rotatedPath }, '⚡ 日志轮转完成');
}

/**
 * 清理旧日志文件
 */
export function cleanOldLogs(logDir: string, maxAgeDays: number = 7): void {
  if (!fs.existsSync(logDir)) {
    return;
  }
  
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  
  const files = fs.readdirSync(logDir);
  
  for (const file of files) {
    if (!file.endsWith('.log')) continue;
    
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      logger.info({ file }, '⚡ 删除过期日志');
    }
  }
}

/**
 * 获取日志目录大小
 */
export function getLogDirSize(logDir: string): number {
  if (!fs.existsSync(logDir)) {
    return 0;
  }
  
  let totalSize = 0;
  const files = fs.readdirSync(logDir);
  
  for (const file of files) {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  }
  
  return totalSize;
}
