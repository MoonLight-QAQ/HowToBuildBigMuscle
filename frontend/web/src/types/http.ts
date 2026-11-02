import type { components } from '@/api/generated/admin'

export type ErrorCode = components['schemas']['ErrorCode']
export type FieldError = components['schemas']['FieldError']
export type ErrorKind = 'business' | 'http' | 'network' | 'timeout' | 'canceled' | 'protocol'

/** 登录状态由 W-01c 注入，不在请求层持久化 token。 / W-01c owns session storage. */
export interface AuthAdapter {
  /** 读取当前管理员 token，无登录时返回 null。 / Read the current admin token or null. */
  getToken(): string | null
  /** 清除失效登录并跳转登录页。 / Clear the expired session and navigate to login. */
  onNeedLogin(): void | Promise<void>
}

export interface HttpOptions {
  baseURL?: string
  timeoutMs?: number
  auth?: AuthAdapter
}

/** parse 负责模块数据校验与转换；失败抛错。 / The module parser validates/transforms data or throws. */
export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | boolean | undefined>
  data?: unknown
  signal?: AbortSignal
  anonymous?: boolean
  parse: (data: unknown) => T
}
