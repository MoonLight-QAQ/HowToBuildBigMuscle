// 环境变量的类型声明，取值见 .env.development 和 .env.production。
// 新增环境变量时，同时在这里声明。

interface ImportMetaEnv {
  /** 接口前缀，如 /api/admin */
  readonly VITE_API_BASE_URL: string
  /** 是否启用 MSW 模拟接口。环境变量都是字符串，判断时写 === 'true' */
  readonly VITE_USE_MOCK: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
