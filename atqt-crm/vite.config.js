import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // 將所有 /api/bingx 開頭的請求轉發至 BingX Open API
      // 解決本機端開發的 CORS 跨網域問題
      '/api/bingx': {
        target: 'https://open-api.bingx.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/bingx/, ''),
        secure: true,
      },
    },
  },
})
