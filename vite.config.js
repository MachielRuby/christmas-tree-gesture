import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    https: false, // localhost 不需要 HTTPS
    open: true,   // 自动打开浏览器
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
})
