// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw/http'
import type { HttpResponseResolver } from 'msw/http'
import { listCities } from '@/api/cities'
import { getDelivery } from '@/api/delivery'
import { ApiError, createRequestHeaders, MOCK_SCENARIO_HEADER, normalizeError } from '@/api/http'
import { listMallCategories } from '@/api/mall-categories'
import { formatMinorAmount } from '@/api/presentation'
import { listProducts } from '@/api/products'
import { handlers } from '@/mocks/handlers'
import { sampleProducts } from '@/mocks/data'
import type { ErrorCode } from '@/constants/error-code'
import type { ErrorResponse, MockScenario, Product, RequestOptions } from '@/types/api'

type ResolverInfo = Parameters<HttpResponseResolver>[0]
interface EndpointReader {
  name: string
  read: (options?: RequestOptions) => Promise<unknown>
}
interface ErrorCase {
  scenario: Exclude<MockScenario, 'success' | 'empty'>
  code: ErrorCode
}

const readers: EndpointReader[] = [
  { name: 'products', read: listProducts },
  { name: 'mall-categories', read: listMallCategories },
  { name: 'delivery', read: getDelivery },
  { name: 'cities', read: listCities },
]
const errorCases: ErrorCase[] = [
  { scenario: 'unauthorized', code: 'UNAUTHORIZED' },
  { scenario: 'forbidden', code: 'FORBIDDEN' },
  { scenario: 'validation', code: 'VALIDATION_ERROR' },
  { scenario: 'conflict', code: 'CONFLICT' },
  { scenario: 'network', code: 'NETWORK_ERROR' },
  { scenario: 'malformed', code: 'MALFORMED_RESPONSE' },
]
const server = setupServer(...handlers)
let observedScenario: string | null | undefined
let observedUrl = ''

/**
 * startServer installs only local synthetic handlers for the test suite.
 * 中文：为测试安装合成拦截器，不请求真实服务。
 * @returns Nothing / 无返回值；启动测试拦截。
 */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}

/**
 * configureEnvironment enables scenarios and a stable local API origin.
 * 中文：为每个测试启用场景并设置稳定的本地接口来源。
 * @returns Nothing / 无返回值；修改测试环境并清空捕获值。
 */
function configureEnvironment(): void {
  vi.stubEnv('VITE_USE_MOCK', 'true')
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost')
  observedScenario = undefined
  observedUrl = ''
}

/**
 * resetServer removes test-specific handlers and environment overrides.
 * 中文：清除单个测试的拦截规则与环境覆盖，避免泄漏到后续用例。
 * @returns Nothing / 无返回值；重置测试全局状态。
 */
function resetServer(): void {
  server.resetHandlers()
  vi.unstubAllEnvs()
}

/**
 * stopServer releases test interception after the suite.
 * 中文：测试组结束后释放网络拦截。
 * @returns Nothing / 无返回值；关闭测试拦截。
 */
function stopServer(): void {
  server.close()
}

beforeAll(startServer)
beforeEach(configureEnvironment)
afterEach(resetServer)
afterAll(stopServer)

/**
 * defineEndpointTests applies the same eight outcomes to each read endpoint.
 * 中文：为每个只读端点执行相同的八类场景验证。
 * @param reader Named endpoint operation / 端点命名读取方法。
 * @returns Nothing / 无返回值；注册测试，不修改应用业务状态。
 */
function defineEndpointTests(reader: EndpointReader): void {
  /**
   * readsSuccess verifies a typed, display-ready result for this endpoint.
   * 中文：验证当前端点返回已解析且可展示的数据。
   * @returns Test completion / 测试完成Promise；执行Mock读取。
   */
  async function readsSuccess(): Promise<void> {
    const data = await reader.read({ scenario: 'success' })
    if (reader.name === 'delivery') {
      expect(data).toMatchObject({ localFeeText: '6.00（币种待确认）' })
    } else {
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('total')
    }
  }

  /**
   * readsEmpty verifies that empty responses remain explicit and unfilled.
   * 中文：验证空态保持空值或空列表，不补伪造业务数字。
   * @returns Test completion / 测试完成Promise；执行Mock读取。
   */
  async function readsEmpty(): Promise<void> {
    const data = await reader.read({ scenario: 'empty' })
    expect(data).toEqual(reader.name === 'delivery' ? null : { items: [], total: 0 })
  }

  /**
   * rejectsFailure verifies normalized errors for HTTP, network and bad shapes.
   * 中文：验证HTTP、网络与结构失败均产生对应统一错误。
   * @param testCase Scenario and expected code / 场景与预期错误码。
   * @returns Test completion / 测试完成Promise；执行Mock读取并断言拒绝。
   */
  async function rejectsFailure(testCase: ErrorCase): Promise<void> {
    await expect(reader.read({ scenario: testCase.scenario })).rejects.toMatchObject({
      name: 'ApiError',
      code: testCase.code,
    })
  }

  it('returns validated success data', readsSuccess)
  it('preserves the correct empty representation', readsEmpty)
  it.each(errorCases)('$scenario becomes $code', rejectsFailure)
}

describe.each(readers)('$name read API', defineEndpointTests)

/**
 * capturesProductRequest records only headers and path for a synthetic request.
 * 中文：仅记录合成请求的场景头和路径，用于验证真实模式与基础地址行为。
 * @param info MSW request context / MSW请求上下文。
 * @returns Typed product response / 商品响应；只修改测试捕获变量。
 */
function capturesProductRequest(info: ResolverInfo): Response {
  observedScenario = info.request.headers.get(MOCK_SCENARIO_HEADER)
  observedUrl = info.request.url
  return HttpResponse.json({ ok: true, data: sampleProducts })
}

/**
 * doesNotLeakScenarioHeaders checks the pure header policy in both modes.
 * 中文：验证纯请求头策略只在Mock开启时携带场景。
 * @returns Nothing / 无返回值；仅执行断言。
 */
function doesNotLeakScenarioHeaders(): void {
  expect(createRequestHeaders({ scenario: 'forbidden' }, false)).not.toHaveProperty(
    MOCK_SCENARIO_HEADER,
  )
  expect(createRequestHeaders({ scenario: 'forbidden' }, true)).toHaveProperty(
    MOCK_SCENARIO_HEADER,
    'forbidden',
  )
}

/**
 * realModeOmitsScenario proves the transport does not emit preview headers.
 * 中文：通过实际封装请求证明真实模式不发送演示场景头。
 * @returns Test completion / 测试完成Promise；执行受测试拦截的读取。
 */
async function realModeOmitsScenario(): Promise<void> {
  vi.stubEnv('VITE_USE_MOCK', 'false')
  server.use(http.get('*/api/admin/products', capturesProductRequest))
  await listProducts({ scenario: 'forbidden' })
  expect(observedScenario).toBeNull()
}

/**
 * configuredOriginKeepsOneEndpoint verifies the base origin and complete path.
 * 中文：验证显式接口来源与完整端点组合后只有一份/api/admin前缀。
 * @returns Test completion / 测试完成Promise；请求被MSW拦截，不访问外部主机。
 */
async function configuredOriginKeepsOneEndpoint(): Promise<void> {
  vi.stubEnv('VITE_API_BASE_URL', 'https://admin.example.invalid')
  server.use(http.get('*/api/admin/products', capturesProductRequest))
  await listProducts()
  expect(observedUrl).toBe('https://admin.example.invalid/api/admin/products')
}

/**
 * cancelledReadRejects verifies AbortSignal propagation to Axios.
 * 中文：验证取消信号传入传输层后返回CANCELLED。
 * @returns Test completion / 测试完成Promise；取消请求，不写业务数据。
 */
async function cancelledReadRejects(): Promise<void> {
  const controller = new AbortController()
  controller.abort()
  await expect(listProducts({ signal: controller.signal })).rejects.toMatchObject({
    code: 'CANCELLED',
  })
}

/**
 * mapsTimeoutAndUnknown verifies safe normalization without raw error messages.
 * 中文：验证超时和未知错误归一化，不向展示层泄漏原始错误内容。
 * @returns Nothing / 无返回值；仅执行断言。
 */
function mapsTimeoutAndUnknown(): void {
  expect(normalizeError({ isAxiosError: true, code: 'ETIMEDOUT' }).code).toBe('TIMEOUT')
  expect(normalizeError({ isAxiosError: true, code: 'ECONNABORTED' }).code).toBe('TIMEOUT')
  const unknown = normalizeError(new Error('synthetic internal detail'))
  expect(unknown.code).toBe('UNKNOWN_ERROR')
  expect(unknown.message).not.toContain('synthetic internal detail')
  const existing = new ApiError('FORBIDDEN')
  expect(normalizeError(existing)).toBe(existing)
}

/**
 * returnsBusinessFailure creates a deliberate ok-false response with HTTP 200.
 * 中文：构造HTTP成功但业务失败的响应，验证包裹语义。
 * @returns Synthetic response / 合成响应；无业务副作用。
 */
function returnsBusinessFailure(): Response {
  const body: ErrorResponse = { ok: false, code: 'CONFLICT', message: '演示业务冲突。' }
  return HttpResponse.json(body)
}

/**
 * rejectsBusinessFailure prevents HTTP 200 from hiding an ok-false result.
 * 中文：验证HTTP200不能把业务失败当成成功。
 * @returns Test completion / 测试完成Promise；执行受拦截读取。
 */
async function rejectsBusinessFailure(): Promise<void> {
  server.use(http.get('*/api/admin/products', returnsBusinessFailure))
  await expect(listProducts()).rejects.toMatchObject({ code: 'CONFLICT', status: 200 })
}

/**
 * returnsAuthoritativeStock deliberately differs from client-side subtraction.
 * 中文：构造与浏览器减法不同的服务端值，专门验证不会在前端重算。
 * @returns Synthetic response / 合成响应；不改变共享样例。
 */
function returnsAuthoritativeStock(): Response {
  const first = sampleProducts.items[0]
  if (!first) throw new Error('Missing synthetic product fixture')
  const product: Product = { ...first, availableStock: 5 }
  return HttpResponse.json({ ok: true, data: { items: [product], total: 1 } })
}

/**
 * preservesServerStock proves that only the supplied availableStock is shown.
 * 中文：验证可售字段直接映射服务端值，未从账面与锁定计算。
 * @returns Test completion / 测试完成Promise；读取合成服务响应。
 */
async function preservesServerStock(): Promise<void> {
  server.use(http.get('*/api/admin/products', returnsAuthoritativeStock))
  const data = await listProducts()
  expect(data.items[0]?.availableStock).toBe(5)
  expect(data.items[0]?.priceText).toBe('39.00（币种待确认）')
}

/**
 * returnsWrongField creates an invalid scalar despite an otherwise valid body.
 * 中文：在其他结构正确的响应中放入错误字段类型，验证真实运行时检查。
 * @returns Invalid synthetic response / 无效合成响应；不改变共享样例。
 */
function returnsWrongField(): Response {
  const first = sampleProducts.items[0]
  if (!first) throw new Error('Missing synthetic product fixture')
  return HttpResponse.json({
    ok: true,
    data: { items: [{ ...first, priceMinor: '3900' }], total: 1 },
  })
}

/**
 * rejectsWrongField prevents TypeScript declarations from replacing validation.
 * 中文：验证类型声明不会让错误的运行时金额字段蒙混通过。
 * @returns Test completion / 测试完成Promise；读取无效合成响应并断言拒绝。
 */
async function rejectsWrongField(): Promise<void> {
  server.use(http.get('*/api/admin/products', returnsWrongField))
  await expect(listProducts()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
}

/**
 * formatsExactMinorUnits verifies integer formatting at precision boundaries.
 * 中文：验证整数分在精度边界仍逐分准确，不经浮点除法丢分。
 * @param minor Input minor units / 输入整数分。
 * @param expected Exact display / 精确展示文本。
 * @returns Nothing / 无返回值；仅断言。
 */
function formatsExactMinorUnits(minor: number, expected: string): void {
  expect(formatMinorAmount(minor, null)).toBe(`${expected}（币种待确认）`)
}

/**
 * rejectsInvalidMinorUnits verifies explicit numeric preconditions.
 * 中文：验证金额格式化明确拒绝负数、非整数及不安全整数。
 * @param minor Invalid amount / 无效金额。
 * @returns Nothing / 无返回值；仅断言RangeError。
 */
function rejectsInvalidMinorUnits(minor: number): void {
  expect(formatMinorAmount.bind(null, minor, null)).toThrow(RangeError)
}

it('adds scenario headers only for explicit mock mode', doesNotLeakScenarioHeaders)
it('omits scenario headers in actual transport when mocking is disabled', realModeOmitsScenario)
it('combines an explicit origin with exactly one endpoint path', configuredOriginKeepsOneEndpoint)
it('propagates request cancellation', cancelledReadRejects)
it('normalizes timeout and unknown failures safely', mapsTimeoutAndUnknown)
it('rejects business errors even when HTTP status is 200', rejectsBusinessFailure)
it('preserves server-provided available stock', preservesServerStock)
it('rejects malformed scalar fields at runtime', rejectsWrongField)
it.each([
  [0, '0.00'],
  [1, '0.01'],
  [100, '1.00'],
  [Number.MAX_SAFE_INTEGER, '90071992547409.91'],
] as const)('formats %s minor units exactly', formatsExactMinorUnits)
it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
  'rejects invalid minor amount %s',
  rejectsInvalidMinorUnits,
)
