import axios from 'axios'
import {
  CLIENT_ERROR_MESSAGES,
  ERROR_CODE,
  getErrorMessage,
  type ErrorDefinition,
} from '@/constants/error-code'
import type { AuthAdapter, ErrorKind, FieldError, HttpOptions, RequestOptions } from '@/types/http'

/** 只保留可交给页面的错误，不保留请求对象或原始响应。 / Safe UI error without request secrets. */
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

/** 按契约常量判断业务错误，并收窄错误码。 / Match a contract descriptor and narrow the error code.
 * 参数/Params: 未知错误及 ERROR_CODE 中的一项 / Unknown error and an ERROR_CODE entry.
 * 返回/Returns: 是否匹配的 ApiError，无副作用 / ApiError type predicate, no side effects.
 */
export function isErrorCode<Definition extends ErrorDefinition>(
  error: unknown,
  expected: Definition,
): error is ApiError & { readonly code: Definition['code'] } {
  return error instanceof ApiError && error.kind === 'business' && error.code === expected.code
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

/** 未接入登录适配器时的默认失效处理：仅跳转。 / Default navigation when no adapter is installed.
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
  /** 已通知过 NEED_LOGIN 的会话代次；未接入适配器时记为 null。 / Generation already notified; null without adapter. */
  private notifiedGeneration: number | null | undefined

  /** 创建独立客户端。 / Create an isolated client.
   * 参数/Params: API前缀、超时毫秒及登录适配器 / API base, timeout in ms, session adapter.
   * 返回/Returns: 客户端；不发请求。通行证在 httpOnly cookie 中，同域请求由浏览器自动携带 / Client; cookie sent by the browser.
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
    this.notifiedGeneration = undefined
  }

  /** 请求并校验包装、解析data；失败抛ApiError，不重试写入。 / Request, unwrap and parse data; never auto-retry.
   * 参数/Params: 相对资源路径、方法/参数/取消信号和解析器 / Relative path, request options and parser.
   * 返回/Returns: 已验证数据。副作用/Effects: 网络请求；会话失效或须改密码时通知登录适配器 / Network and session notifications.
   */
  async request<T>(path: string, options: RequestOptions<T>): Promise<T> {
    // 限定资源路径，请求只发往配置的接口前缀。 / Keep requests within the configured API prefix.
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
    // 记下发请求时的会话代次，收到 NEED_LOGIN 时据此判断是否属于当前会话。 / Snapshot the session generation.
    let generation: number | null
    try {
      generation = options.anonymous ? null : (auth?.getSessionGeneration() ?? null)
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
        if (!options.anonymous) {
          if (body.code === ERROR_CODE.NEED_LOGIN.code) await this.notifyExpired(auth, generation)
          else if (body.code === ERROR_CODE.PASSWORD_CHANGE_REQUIRED.code)
            await this.notifyPasswordChangeRequired(auth)
        }
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

  /** 仅通知仍是当前会话的失效，并按会话代次去重并发失效响应。 / Notify once per current session generation.
   * 参数/Params: 请求时的适配器与会话代次快照 / Adapter and generation captured at dispatch.
   * 返回/Returns: void；可能清理登录并导航，适配器失败不掩盖原始业务错误 / Session/navigation effects; preserve API failure.
   */
  private async notifyExpired(auth: AuthAdapter | null, generation: number | null): Promise<void> {
    try {
      if (
        auth !== this.auth ||
        (auth?.getSessionGeneration() ?? null) !== generation ||
        this.notifiedGeneration === generation
      )
        return
      this.notifiedGeneration = generation
      if (auth) await auth.onNeedLogin()
      else navigateToLogin()
    } catch {
      // UI接入失败仍保留NEED_LOGIN，不泄露适配器错误。 / Preserve NEED_LOGIN without exposing adapter errors.
    }
  }

  /** 须先改密码时通知适配器跳转；未接入适配器时不处理。 / Ask the adapter to open the change-password page.
   * 参数/Params: 请求时的适配器 / Adapter captured at dispatch.
   * 返回/Returns: void；可能导航，适配器失败不掩盖原始业务错误 / Navigation effects; preserve API failure.
   */
  private async notifyPasswordChangeRequired(auth: AuthAdapter | null): Promise<void> {
    try {
      if (auth && auth === this.auth) await auth.onPasswordChangeRequired()
    } catch {
      // 同上，保留原始业务错误。 / Preserve the original business error.
    }
  }
}

export const http = new HttpClient()
