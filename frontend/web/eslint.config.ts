import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,vue}'],
  },

  // 构建产物和自动生成的文件不检查
  globalIgnores(['dist/**', 'src/api/generated/**', 'public/mockServiceWorker.js']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  // 把 AGENTS.md 中的规则变成自动检查
  {
    name: 'app/project-rules',
    rules: {
      // 不要使用 any
      '@typescript-eslint/no-explicit-any': 'error',
      // 只用 <script setup>，不用选项式 API
      'vue/component-api-style': ['error', ['script-setup']],
      // 组件脚本必须用 TypeScript
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
    },
  },

  // 关闭所有与格式有关的规则，格式只交给 Prettier
  skipFormatting,
)
