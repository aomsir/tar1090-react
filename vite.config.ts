import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'https://example.com'
  const dbFolder = env.VITE_DB_FOLDER || 'db-0c1185b'
  const proxy = Object.fromEntries(
    ['/data', '/chunks', '/globe_history', `/${dbFolder}`].map((p) => [
      p,
      { target, changeOrigin: true, secure: true },
    ]),
  )
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/ol/')) {
              return 'vendor-ol'
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'vendor-recharts'
            }
            if (id.includes('node_modules/@heroui/')) {
              return 'vendor-heroui'
            }
          },
        },
      },
    },
    server: { host: '0.0.0.0', proxy },
    preview: { host: '0.0.0.0' },
  }
})
