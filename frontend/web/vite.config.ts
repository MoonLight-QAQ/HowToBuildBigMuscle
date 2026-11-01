import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // @ 指向 src/，与 tsconfig.app.json 中的 paths 保持一致
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
