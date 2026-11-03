// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import type { components } from '@/api/generated/admin'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const { handlers } = await import('./index')
const server = setupServer(...handlers)

// 中文：启用测试拦截；无输入/输出，只改变测试环境。
// English: Enable interception; no inputs/output, test effects only.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

// 中文：每例清除运行时 handler；无输入/输出，仅重置测试状态。
// English: Clear runtime handlers per case; no inputs/output, test reset only.
afterEach(() => server.resetHandlers())

// 中文：恢复网络与全局变量；无输入/输出，清理测试副作用。
// English: Restore networking and globals; no inputs/output, cleans up test effects.
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

// 中文：验证管理接口的安全兜底；无输入/输出，仅发出被拦截的测试请求。
// English: Verify the admin fallback; no inputs/output, intercepted test requests only.
describe('MSW handler 汇总', () => {
  // 中文：未注册接口明确返回失败；无输入/输出，不触达实际后端。
  // English: Unregistered requests fail explicitly; no inputs/output, no real backend access.
  it('未注册的管理接口返回符合契约的 500', async () => {
    const response = await fetch(`${baseURL}/__test__/missing?private=hidden`, {
      headers: { Authorization: 'Bearer test-only' },
    })
    const body: components['schemas']['ErrorResponse'] = await response.json()
    expect(response.status).toBe(500)
    expect(body).toEqual({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: '模拟接口尚未注册，请检查模块配置',
    })
    expect(JSON.stringify(body)).not.toMatch(/hidden|test-only|__test__/)
  })

  // 中文：后续模块可优先匹配；无输入/输出，只增加本例测试 handler。
  // English: Future modules can take precedence; no inputs/output, adds a test-only handler.
  it('模块 handler 可以在兜底之前响应', async () => {
    server.use(
      // 中文：返回测试成功包装；无输入，返回 JSON，无外部副作用。
      // English: Return a test success envelope; no inputs, JSON result, no external effects.
      http.get(`${baseURL}/__test__/ready`, () => HttpResponse.json({ ok: true, data: null })),
    )
    const response = await fetch(`${baseURL}/__test__/ready`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, data: null })
  })

  // 中文：写操作不能被兜底伪装成功；无输入/输出，无真实写入。
  // English: Fallback writes must never look successful; no inputs/output or real writes.
  it('未注册的写操作也明确失败', async () => {
    const response = await fetch(`${baseURL}/__test__/missing`, { method: 'POST' })
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false, code: 'INTERNAL_ERROR' })
  })
})
