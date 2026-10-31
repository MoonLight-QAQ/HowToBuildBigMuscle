import axios from 'axios'
import { z } from 'zod'
import { ERROR_CODE, ERROR_MESSAGE } from '@/constants/error-code'
import type { ErrorCode } from '@/constants/error-code'
import { errorResponseSchema } from '@/api/schemas'
import { MOCK_SCENARIOS } from '@/types/api'
import type { RequestOptions } from '@/types/api'

export const REQUEST_TIMEOUT_MS = 10_000
export const MOCK_SCENARIO_HEADER = 'X-Mock-Scenario'

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number | undefined

  /**
   * ApiError creates a safe, normalized error for the data and state layers.
   * 中文：创建供数据层与状态层使用的统一错误，不保存原始请求或凭据。
   * @param code Normalized error code / 统一错误码。
   * @param message Safe user-facing explanation / 安全的用户提示。
   * @param status Optional HTTP status / 可选HTTP状态。
   * @returns Error instance / 错误实例。
   */
  constructor(code: ErrorCode, message = ERROR_MESSAGE[code], status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/**
 * acceptHttpStatus lets the wrapper inspect all HTTP response envelopes.
 * 中文：让统一封装检查所有HTTP响应及其业务包裹，而非提前丢失错误结构。
 * @returns Always true; HTTP failures are handled after parsing / 始终为真，HTTP失败随后处理。
 */
function acceptHttpStatus(): boolean {
  return true
}

const client = axios.create({ timeout: REQUEST_TIMEOUT_MS, validateStatus: acceptHttpStatus })

/**
 * createRequestHeaders adds scenario selection only when mocking is enabled.
 * 中文：仅在开启Mock时添加场景头，真实HTTP不携带演示场景。
 * @param options Cancellation and optional mock scenario / 取消与可选演示场景。
 * @param mockEnabled Explicit test override or environment flag / 测试显式值或环境开关。
 * @returns Safe request headers / 安全请求头；不发请求。
 */
export function createRequestHeaders(
  options: RequestOptions = {},
  mockEnabled = import.meta.env.VITE_USE_MOCK === 'true',
): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (mockEnabled && options.scenario && MOCK_SCENARIOS.includes(options.scenario)) {
    headers[MOCK_SCENARIO_HEADER] = options.scenario
  }
  return headers
}

/**
 * resolveApiBaseUrl resolves explicit API configuration or the current origin.
 * 中文：使用显式接口地址或当前页面来源，Node测试无页面时使用本地来源。
 * @returns Request base URL / 请求基础地址；不发请求。
 */
function resolveApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  return typeof location === 'undefined' ? 'http://localhost' : location.origin
}

/**
 * responseError validates a server error without exposing raw server messages.
 * 中文：校验服务端错误结构并生成固定提示，不回显原始消息或请求配置。
 * @param status HTTP status / HTTP状态。
 * @param body Unknown response body / 未校验响应。
 * @returns Normalized error / 统一错误；不修改共享状态。
 */
function responseError(status: number, body: unknown): ApiError {
  const parsed = errorResponseSchema.safeParse(body)
  if (!parsed.success) return new ApiError(ERROR_CODE.MALFORMED_RESPONSE, undefined, status)
  return new ApiError(parsed.data.code, undefined, status)
}

/**
 * normalizeError maps transport, cancellation and unknown failures consistently.
 * 中文：统一网络、超时、取消及未知错误，不保存或记录原始错误详情。
 * @param error Any caught failure / 任意捕获的失败。
 * @returns A safe ApiError; existing ApiError objects are preserved / 安全错误，已有统一错误保持不变。
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error) || (error instanceof Error && error.name === 'AbortError')) {
    return new ApiError(ERROR_CODE.CANCELLED)
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') return new ApiError(ERROR_CODE.CANCELLED)
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(ERROR_CODE.TIMEOUT)
    }
    if (error.response) return responseError(error.response.status, error.response.data)
    return new ApiError(ERROR_CODE.NETWORK_ERROR)
  }
  return new ApiError(ERROR_CODE.UNKNOWN_ERROR)
}

/**
 * getData reads and validates one success envelope before returning domain data.
 * 中文：读取并验证成功包裹及领域数据，结构错误不会伪装成成功。
 * @param path Contract read endpoint / 契约中的读取端点。
 * @param schema Runtime validator corresponding to generated types / 与生成类型对应的运行时校验器。
 * @param options Cancellation and mock-only scenario / 取消与仅供Mock的场景。
 * @returns Parsed domain data / 已解析领域数据。
 * @throws ApiError for HTTP, transport or contract failures / HTTP、网络或契约失败时抛统一错误。
 * Performs one GET request; no retries or authentication invention / 执行一次GET，不自动重试或臆造认证。
 */
export async function getData<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  try {
    const response = await client.get<unknown>(path, {
      baseURL: resolveApiBaseUrl(),
      headers: createRequestHeaders(options),
      signal: options.signal,
    })
    if (response.status < 200 || response.status >= 300) {
      throw responseError(response.status, response.data)
    }
    const businessError = errorResponseSchema.safeParse(response.data)
    if (businessError.success)
      throw new ApiError(businessError.data.code, undefined, response.status)
    const envelope = z
      .object({ ok: z.literal(true), data: schema })
      .strict()
      .safeParse(response.data)
    if (!envelope.success)
      throw new ApiError(ERROR_CODE.MALFORMED_RESPONSE, undefined, response.status)
    return envelope.data.data
  } catch (error) {
    throw normalizeError(error)
  }
}
