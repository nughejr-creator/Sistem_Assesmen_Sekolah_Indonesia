import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function sendOtpDevPlugin(): Plugin {
  return {
    name: 'send-otp-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/send-otp', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const handlerModule = await import('./api/send-otp.js');
            const mockRes = {
              statusCode: 200,
              headers: {} as Record<string, string>,
              setHeader(k: string, v: string) { this.headers[k] = v; },
              status(code: number) { this.statusCode = code; return this; },
              end() {
                res.writeHead(this.statusCode, this.headers);
                res.end();
              },
              json(payload: any) {
                res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.headers });
                res.end(JSON.stringify(payload));
              }
            };
            await handlerModule.default({ ...req, body: data } as any, mockRes as any);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), sendOtpDevPlugin()],
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/SASI_CBT_SERVER_PORTABLE/**', '**/*.rar', '**/dist/**']
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-xlsx': ['xlsx'],
          'vendor-katex': ['katex'],
          'vendor-supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
});
