import axios from 'axios'
import { CLIENT_ERROR_MESSAGES, getErrorMessage } from '@/constants/error-code'
import type { AuthAdapter, ErrorKind, FieldError, HttpOptions, RequestOptions } from '@/types/http'

/** 只保留可交给页面的错误，不保留 token、请求对象或原始响应。 / Safe UI error without request secrets. */
export class ApiError extends Error {
  readonly kind: ErrorKind
  readonly code: string | null
  readonly status: number | null
  readonly details: FieldError[]

  /** 创建归一化错误。 / Construct a normalized error.
   * 参数/Params: 分类、HTTP状态及已校验业务错误 / kind, HTTP status, validated business error.
   * 返回/Returns: 错误实例，无日志或网络副作用 / Error instance; no logging or network effects.
   */
  constructor(
    kind: ErrorKind,
    status: number | null = null,
    code: string | null = null,
    details: FieldError[] = [],
  ) {
    super(
      code === null
        ? CLIENT_ERROR_MESSAGES[kind as Exclude<ErrorKind, 'business'>]
        : getErrorMessage(code),
    )
    this.name = 'ApiError'
    this.kind = kind
    this.code = code
    this.status = status
    this.details = details
  }
}

/** 判断未知值是否普通数据对象。 / Narrow unknown input to an object.
 * 参数/Params: 任意数据。返回/Returns: 是否非数组非空对象，无副作用 / Object predicate, no side effects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 校验字段错误结构。 / Validate one field error.
 * 参数/Params: 未知字段错误。返回/Returns: 类型判定，无副作用 / Type predicate, no side effects.
 */
function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string'
}

/** 接收所有HTTP状态后统一按契约判断。 / Inspect every HTTP status in the contract layer.
 * 参数/Params: 无。返回/Returns: true；不把状态直接当作成功 / True, not a success decision.
 */
function inspectEveryStatus(): boolean {
  return true
}

/** 默认失效处理仅跳转；登录状态稍后由 W-01c 接入。 / Default navigation until W-01c installs its adapter.
 * 参数/Params: 无。返回/Returns: void；浏览器中可能导航 / May navigate the browser to login.
 */
function navigateToLogin(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

/** JSON 管理接口客户端；业务模块必须传入数据解析器。 / JSON admin client with mandatory module parsing. */
export class HttpClient {
  private readonly client
  private auth: AuthAdapter | null
  private invalidToken: string | null | undefined

  /** 创建独立客户端。 / Create an isolated client.
   * 参数/Params: API前缀、超时毫秒及登录适配器 / API base, timeout in ms, session adapter.
   * 返回/Returns: 客户端；不发请求、不存储token / Client; no requests or token persistence.
   */
  constructor(options: HttpOptions = {}) {
    this.auth = options.auth ?? null
    this.client = axios.create({
      baseURL: options.baseURL ?? import.meta.env.VITE_API_BASE_URL,
      timeout: options.timeoutMs ?? 15_000,
      responseType: 'json',
      transitional: { silentJSONParsing: false },
      validateStatus: inspectEveryStatus,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      maxRedirects: 0,
    })
  }

  /** 接入或移除登录状态，不依赖具体 store/router。 / Install or remove the store/router adapter.
   * 参数/Params: 适配器或null。返回/Returns: void；重置失效通知记录 / Reset expired-session notification.
   */
  setAuth(auth: AuthAdapter | null): void {
    this.auth = auth
    this.invalidToken = undefined
  }

  /** 请求并校验包装、解析data；失败抛ApiError，不重试写入。 / Request, unwrap and parse data; never auto-retry.
   * 参数/Params: 相对资源路径、方法/参数/取消信号和解析器 / Relative path, request options and parser.
   * 返回/Returns: 已验证数据。副作用/Effects: 网络请求；有效会话失效时通知登录适配器 / Network and expiry notification.
   */
  async request<T>(path: string, options: RequestOptions<T>): Promise<T> {
    // 限定资源路径，避免Bearer被发送到任意地址。 / Keep bearer credentials within the configured API.
    if (!/^\/(?!\/)/.test(path) || /[\\?#]/.test(path)) throw new ApiError('protocol')
    try {
      for (const segment of path.split('/')) {
        if (
          decodeURIComponent(segment).includes('..') ||
          /[\\/]/.test(decodeURIComponent(segment))
        ) {
          throw new ApiError('protocol')
        }
      }
    } catch {
      throw new ApiError('protocol')
    }
    const auth = this.auth
    let token: string | null
    try {
      token = options.anonymous ? null : (auth?.getToken() ?? null)
    } catch {
      throw new ApiError('protocol')
    }
    try {
      const response = await this.client.request<unknown>({
        url: path,
        method: options.method ?? 'GET',
        params: options.params,
        data: options.data,
        signal: options.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const body = response.data
      const contentType = response.headers['content-type']
      if (
        typeof contentType !== 'string' ||
        !/application\/(?:[\w.+-]+\+)?json(?:;|$)/i.test(contentType)
      ) {
        throw new ApiError(
          response.status >= 200 && response.status < 300 ? 'protocol' : 'http',
          response.status,
        )
      }
      if (isRecord(body) && body.ok === false) {
        if (
          typeof body.code !== 'string' ||
          !/^[A-Z][A-Z0-9_]*$/.test(body.code) ||
          typeof body.message !== 'string' ||
          (body.details !== undefined &&
            (!Array.isArray(body.details) || !body.details.every(isFieldError)))
        ) {
          throw new ApiError('protocol', response.status)
        }
        if (body.code === 'NEED_LOGIN' && !options.anonymous) await this.notifyExpired(auth, token)
        throw new ApiError(
          'business',
          response.status,
          body.code,
          body.details as FieldError[] | undefined,
        )
      }
      if (response.status < 200 || response.status >= 300)
        throw new ApiError('http', response.status)
      if (
        !isRecord(body) ||
        body.ok !== true ||
        !Object.hasOwn(body, 'data') ||
        (body.data !== null && !Array.isArray(body.data) && !isRecord(body.data))
      ) {
        throw new ApiError('protocol', response.status)
      }
      try {
        return options.parse(body.data)
      } catch {
        throw new ApiError('protocol', response.status)
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (axios.isCancel(error)) throw new ApiError('canceled')
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
          throw new ApiError('timeout')
        if (error.code === 'ERR_BAD_RESPONSE') {
          const status = error.response?.status ?? null
          throw new ApiError(
            status !== null && (status < 200 || status >= 300) ? 'http' : 'protocol',
            status,
          )
        }
      }
      throw new ApiError('network')
    }
  }

  /** 仅通知仍有效的同一会话，并去重并发失效响应。 / Notify once for the same current session.
   * 参数/Params: 请求时的适配器与token快照 / Adapter and token captured at dispatch.
   * 返回/Returns: void；可能清理登录并导航，适配器失败不掩盖原始业务错误 / Session/navigation effects; preserve API failure.
   */
  private async notifyExpired(auth: AuthAdapter | null, token: string | null): Promise<void> {
    try {
      if (auth !== this.auth || (auth?.getToken() ?? null) !== token || this.invalidToken === token)
        return
      this.invalidToken = token
      if (auth) await auth.onNeedLogin()
      else navigateToLogin()
    } catch {
      // UI接入失败仍保留NEED_LOGIN，不泄露适配器错误。 / Preserve NEED_LOGIN without exposing adapter errors.
    }
  }
}

export const http = new HttpClient()
