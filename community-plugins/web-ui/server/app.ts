/**
 * Web UI Hono 应用
 */

import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { pagesRoutes } from './routes/pages.js';
import { apiRoutes } from './routes/api.js';
import { sseRoutes } from './routes/sse.js';

interface AppOptions {
  token?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono();

  // 可选的 Token 认证中间件
  if (options.token) {
    app.use('*', async (c, next) => {
      // 跳过静态资源
      if (c.req.path.startsWith('/public/') || c.req.path.startsWith('/assets/')) {
        return next();
      }

      const authHeader = c.req.header('Authorization');
      const cookieToken = c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1];
      const queryToken = c.req.query('token');

      if (
        authHeader === `Bearer ${options.token}` ||
        cookieToken === options.token ||
        queryToken === options.token
      ) {
        return next();
      }

      // 登录页面
      if (c.req.path === '/login' && c.req.method === 'GET') {
        return c.html(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>登录 - FlashClaw</title>
            <link rel="stylesheet" href="/public/style.css">
          </head>
          <body class="auth-body">
            <main class="auth-container">
              <div class="auth-card">
                <div class="auth-brand">
                  <img src="/assets/flashclaw-icon.png" alt="FlashClaw" class="brand-icon">
                  <div class="auth-title">FlashClaw Web UI</div>
                </div>
                <form method="POST" action="/login" class="auth-form">
                  <label class="field-label" for="token">访问密钥</label>
                  <input id="token" type="password" name="token" placeholder="请输入访问密钥" required>
                  <button type="submit" class="primary">登录</button>
                </form>
              </div>
            </main>
          </body>
          </html>
        `);
      }

      // 登录提交
      if (c.req.path === '/login' && c.req.method === 'POST') {
        const body = await c.req.parseBody();
        if (body.token === options.token) {
          c.header('Set-Cookie', `token=${options.token}; Path=/; HttpOnly; SameSite=Strict`);
          return c.redirect('/');
        }
        return c.redirect('/login?error=1');
      }

      return c.redirect('/login');
    });
  }

  // 静态文件
  app.use('/public/*', serveStatic({ root: './community-plugins/web-ui/' }));
  app.use('/assets/*', serveStatic({ root: './' }));

  // API 路由
  app.route('/api', apiRoutes);

  // SSE 路由
  app.route('/sse', sseRoutes);

  // 页面路由
  app.route('/', pagesRoutes);

  return app;
}
