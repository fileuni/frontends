import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const nodeEnv = process.env.NODE_ENV ?? (process.argv.includes('build') ? 'production' : 'development');
const vditorDistDir = fileURLToPath(new URL('./node_modules/vditor/dist', import.meta.url));
const vditorPublicBase = 'vendor/vditor';
const vditorPublicPrefix = `/${vditorPublicBase}/dist/`;

const getContentType = (filePath) => {
  switch (path.extname(filePath).toLowerCase()) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
};

const emitVditorAssets = async (pluginContext, currentDir, outputBase) => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(currentDir, entry.name);
    const outputPath = `${outputBase}${entry.name}`;

    if (entry.isDirectory()) {
      await emitVditorAssets(pluginContext, sourcePath, `${outputPath}/`);
      continue;
    }

    pluginContext.emitFile({
      type: 'asset',
      fileName: outputPath,
      source: await fs.readFile(sourcePath),
    });
  }
};

const vditorLocalAssetsPlugin = () => ({
  name: 'fileuni-vditor-local-assets',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '';
      if (!pathname.startsWith(vditorPublicPrefix)) {
        next();
        return;
      }

      const relativePath = path.posix.normalize(pathname.slice(vditorPublicPrefix.length));
      if (relativePath.startsWith('..')) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const assetPath = path.join(vditorDistDir, relativePath);

      try {
        const stat = await fs.stat(assetPath);
        if (!stat.isFile()) {
          next();
          return;
        }

        res.setHeader('Content-Type', getContentType(assetPath));
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        createReadStream(assetPath).pipe(res);
      } catch {
        next();
      }
    });
  },
  async generateBundle() {
    await emitVditorAssets(this, vditorDistDir, `${vditorPublicBase}/dist/`);
  },
});

// https://astro.build/config
export default defineConfig({
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [react()],
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
    server: {
      // Avoid stale module cache in Tauri WebView dev mode.
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
          ws: true,
        },
        // WebDAV is mounted at `/dav` (configurable; docs default to `/@dav`).
        // In dev we proxy both so clients can probe via the Astro dev server origin.
        '/dav': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
        },
        '/@dav': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ['libphonenumber-js/max'],
      esbuildOptions: {
        define: {
          'process.env.NODE_ENV': JSON.stringify(nodeEnv),
        },
        loader: {
          '.keep': 'text',
        },
      },
    },
    plugins: [vditorLocalAssetsPlugin(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@fileuni/ts-shared/react-ui': fileURLToPath(new URL('../ts_shared/react-ui/index.ts', import.meta.url)),
        'react/jsx-dev-runtime': fileURLToPath(
          new URL('./node_modules/react/cjs/react-jsx-dev-runtime.development.js', import.meta.url),
        ),
      },
    }
  },
});
