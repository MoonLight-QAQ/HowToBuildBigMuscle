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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // 第三方库单独打包：业务代码每次发版都会变，第三方库很少变，
          // 拆开后浏览器可以长期缓存它们，发版后只需重新下载业务代码
          groups: [
            {
              name: 'vue',
              test: /[\\/]node_modules[\\/](vue|@vue|pinia)[\\/]/,
              priority: 2,
            },
            {
              name: 'element-plus',
              test: /[\\/]node_modules[\\/](element-plus|@element-plus)[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
    // Element Plus 全量引入后（含它依赖的 dayjs、floating-ui 等）单个文件约 900 kB，
    // 超过默认的 500 kB 警告线。
    // 这是预期的结果，因此把警告线调高到 1000 kB；业务代码超过这个值时仍会警告
    chunkSizeWarningLimit: 1000,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 每个 SCSS 文件和 <style lang="scss"> 都自动引入主题变量，组件中不用再导入
        additionalData: '@use "@/styles/variables.scss" as *;\n',
      },
    },
  },
})
