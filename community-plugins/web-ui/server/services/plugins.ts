/**
 * 插件管理服务
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// 动态获取 FlashClaw 路径
function getFlashClawHome(): string {
  return process.env.FLASHCLAW_HOME || join(homedir(), '.flashclaw');
}

const paths = {
  pluginsConfig: () => join(getFlashClawHome(), 'config', 'plugins.json'),
  userPlugins: () => join(getFlashClawHome(), 'plugins'),
};

// 获取内置插件目录
function getBuiltinPluginsDir(): string {
  // 从全局变量获取（如果有）
  const globalPluginsDir = (global as any).__flashclaw_builtin_plugins_dir;
  if (globalPluginsDir) return globalPluginsDir;
  
  // 否则使用项目根目录的 plugins 目录
  // 这个路径在开发时有效
  const possiblePaths = [
    join(process.cwd(), 'plugins'),
    join(process.cwd(), 'dist', 'plugins'),
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  
  return possiblePaths[0];
}

export interface PluginInfo {
  name: string;
  version: string;
  type: string;
  description: string;
  author?: string;
  enabled: boolean;
  isBuiltin: boolean;
}

interface PluginsConfig {
  plugins: Record<string, { enabled: boolean }>;
  hotReload?: boolean;
}

/**
 * 获取插件配置
 */
function getPluginsConfig(): PluginsConfig {
  const configFile = paths.pluginsConfig();
  if (existsSync(configFile)) {
    try {
      return JSON.parse(readFileSync(configFile, 'utf-8'));
    } catch {
      // 忽略解析错误
    }
  }
  return { plugins: {} };
}

/**
 * 保存插件配置
 */
function savePluginsConfig(config: PluginsConfig): void {
  const configFile = paths.pluginsConfig();
  mkdirSync(dirname(configFile), { recursive: true });
  writeFileSync(configFile, JSON.stringify(config, null, 2));
}

/**
 * 获取所有插件
 */
export function getPlugins(): PluginInfo[] {
  const plugins: PluginInfo[] = [];
  const config = getPluginsConfig();

  // 扫描内置插件目录
  const builtinDir = getBuiltinPluginsDir();
  if (existsSync(builtinDir)) {
    const entries = readdirSync(builtinDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginInfo = loadPluginManifest(join(builtinDir, entry.name), true, config);
        if (pluginInfo) plugins.push(pluginInfo);
      }
    }
  }

  // 扫描用户插件目录
  const userDir = paths.userPlugins();
  if (existsSync(userDir)) {
    const entries = readdirSync(userDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginInfo = loadPluginManifest(join(userDir, entry.name), false, config);
        if (pluginInfo) plugins.push(pluginInfo);
      }
    }
  }

  return plugins;
}

/**
 * 加载插件清单
 */
function loadPluginManifest(
  pluginPath: string,
  isBuiltin: boolean,
  config: PluginsConfig
): PluginInfo | null {
  const manifestPath = join(pluginPath, 'plugin.json');
  if (!existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const enabled = config.plugins[manifest.name]?.enabled !== false;

    return {
      name: manifest.name,
      version: manifest.version || '1.0.0',
      type: manifest.type || 'tool',
      description: manifest.description || '',
      author: manifest.author,
      enabled,
      isBuiltin,
    };
  } catch {
    return null;
  }
}

/**
 * 启用插件
 */
export function enablePlugin(name: string): boolean {
  const config = getPluginsConfig();
  if (!config.plugins[name]) {
    config.plugins[name] = { enabled: true };
  } else {
    config.plugins[name].enabled = true;
  }
  savePluginsConfig(config);
  return true;
}

/**
 * 禁用插件
 */
export function disablePlugin(name: string): boolean {
  const config = getPluginsConfig();
  if (!config.plugins[name]) {
    config.plugins[name] = { enabled: false };
  } else {
    config.plugins[name].enabled = false;
  }
  savePluginsConfig(config);
  return true;
}

/**
 * 切换插件状态
 */
export function togglePlugin(name: string): boolean {
  const plugins = getPlugins();
  const plugin = plugins.find(p => p.name === name);
  if (!plugin) return false;

  if (plugin.enabled) {
    return disablePlugin(name);
  } else {
    return enablePlugin(name);
  }
}
