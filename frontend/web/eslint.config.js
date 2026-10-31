import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'public/mockServiceWorker.js', 'src/api/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },
  {
    files: ['**/*.spec.ts'],
    // Tests need independent mounted fixtures. / 测试文件需要多个独立挂载的组件夹具。
    rules: { 'vue/one-component-per-file': 'off' },
  },
  prettier,
)
