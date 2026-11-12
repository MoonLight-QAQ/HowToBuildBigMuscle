import type { components } from '@/api/generated/admin'

export type ErrorCode = components['schemas']['ErrorCode']
export type FieldError = components['schemas']['FieldError']
export type ErrorKind = 'business' | 'http' | 'network' | 'timeout' | 'canceled' | 'protocol'

/**
 * 登录状态由 stores/auth 注入。通行证在 httpOnly cookie 中，由浏览器自动携带，请求层读不到也不处理。
 * Session state is injected by stores/auth; the credential lives in an httpOnly cookie.
 */
export interface AuthAdapter {
  /**
   * 当前会话代次：每次登录或清除登录状态时加 1。请求层用它判断 NEED_LOGIN 是否属于当前会话、是否已通知过。
   * Session generation, bumped on every login or clear; used to de-duplicate NEED_LOGIN.
   */
  getSessionGeneration(): number
  /** 清除失效登录并跳转登录页。 / Clear the expired session and navigate to login. */
  onNeedLogin(): void | Promise<void>
  /** 须先改密码：跳转改密码页。 / Navigate to the change-password page. */
  onPasswordChangeRequired(): void | Promise<void>
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
  /**
   * 为 true 时，收到 NEED_LOGIN、PASSWORD_CHANGE_REQUIRED 不通知登录适配器，由调用方自行处理。
   * 用于登录、/me、/logout 等本身就在处理登录状态的请求。
   */
  anonymous?: boolean
  parse: (data: unknown) => T
}
