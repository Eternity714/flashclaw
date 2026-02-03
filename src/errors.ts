// src/errors.ts
export class FlashClawError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'FlashClawError';
  }
}

export class PluginError extends FlashClawError {
  constructor(message: string, public pluginName: string) {
    super(message, 'PLUGIN_ERROR', false);
    this.name = 'PluginError';
  }
}

export class ApiError extends FlashClawError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'API_ERROR', true);
    this.name = 'ApiError';
  }
}

export class ConfigError extends FlashClawError {
  constructor(message: string, public key?: string) {
    super(message, 'CONFIG_ERROR', false);
    this.name = 'ConfigError';
  }
}

export class ChannelError extends FlashClawError {
  constructor(message: string, public channel: string) {
    super(message, 'CHANNEL_ERROR', true);
    this.name = 'ChannelError';
  }
}
