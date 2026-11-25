import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function studioigorBoardPlugin(): Plugin {
  const studioRoot = path.resolve(__dirname, '.studioigor');
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };

  return {
    name: 'studioigor-board-dev',
    configureServer(server) {
      server.middlewares.use('/api/feedback', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const sub = JSON.parse(body || '{}');
            sub.ts = new Date().toISOString();
            const referer = req.headers.referer || '';
            const match = referer.match(/\/_studioigor\/boards\/([^/]+)\//);
            const boardName = match ? match[1] : 'style-r1';
            const fbPath = path.join(studioRoot, 'boards', boardName, 'feedback.json');
            let hist: {submissions: unknown[]; latest?: unknown} = {submissions: []};
            if (fs.existsSync(fbPath)) {
              try {
                hist = JSON.parse(fs.readFileSync(fbPath, 'utf-8'));
              } catch {
                hist = {submissions: []};
              }
            }
            if (!Array.isArray(hist.submissions)) hist.submissions = [];
            hist.submissions.push(sub);
            hist.latest = sub;
            fs.mkdirSync(path.dirname(fbPath), {recursive: true});
            fs.writeFileSync(fbPath, JSON.stringify(hist, null, 2) + '\n', 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":true}');
          } catch {
            res.statusCode = 400;
            res.end('{"ok":false}');
          }
        });
      });

      server.middlewares.use('/_studioigor', (req, res, next) => {
        const cleanUrl = (req.url || '/').split('?')[0];
        const target = path.resolve(studioRoot, '.' + cleanUrl);
        if (!target.startsWith(studioRoot) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
          return next();
        }
        const ext = path.extname(target).toLowerCase();
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(target).pipe(res);
      });
    },
  };
}

function singleFileIifePlugin(): Plugin {
  return {
    name: 'single-file-iife-html',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const distHtmlPath = path.join(distDir, 'index.html');
      const assetsDir = path.join(distDir, 'assets');
      const rootHtmlPath = path.resolve(__dirname, 'gateledger.html');
      if (!fs.existsSync(distHtmlPath)) return;

      let html = fs.readFileSync(distHtmlPath, 'utf-8');
      let cssCode = '';
      let jsCode = '';

      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir).sort();
        for (const file of files) {
          const full = path.join(assetsDir, file);
          if (file.endsWith('.css')) {
            cssCode += fs.readFileSync(full, 'utf-8') + '\n';
          } else if (file.endsWith('.js')) {
            jsCode += fs.readFileSync(full, 'utf-8') + '\n';
          }
        }
      }

      // Strip external module/asset script and stylesheet tags
      html = html.replace(/<script\b[^>]*src=["'][^"']*assets\/[^"']*["'][^>]*><\/script>\s*/gi, '');
      html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*assets\/[^"']*["'][^>]*>\s*/gi, '');
      html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, '');

      if (cssCode.trim()) {
        const safeCss = cssCode.replace(/<\/style/gi, '<\\/style');
        html = html.replace('</head>', () => `  <style>\n${safeCss}\n  </style>\n</head>`);
      }
      if (jsCode.trim()) {
        const safeJs = jsCode.replace(/<\/script/gi, '<\\/script');
        html = html.replace('</body>', () => `  <script>\n${safeJs}\n  </script>\n</body>`);
      }

      fs.writeFileSync(distHtmlPath, html, 'utf-8');
      fs.writeFileSync(rootHtmlPath, html, 'utf-8');
      if (fs.existsSync(assetsDir)) {
        fs.rmSync(assetsDir, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), studioigorBoardPlugin(), singleFileIifePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 100000000,
      rollupOptions: {
        output: {
          format: 'iife' as const,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

