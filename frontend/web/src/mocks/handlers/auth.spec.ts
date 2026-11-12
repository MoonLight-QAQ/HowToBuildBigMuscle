// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { LOGIN_LOCK, MOCK_ADMIN_ACCOUNTS } from '@/mocks/data/auth'

const baseURL = 'http://localhost/api/admin'
vi.stubEnv('VITE_API_BASE_URL', baseURL)
const { authHandlers, isWeakPassword, resetAuthMock } = await import('./auth')
const server = setupServer(...authHandlers)

const [staff, newbie] = MOCK_ADMIN_ACCOUNTS as [
  (typeof MOCK_ADMIN_ACCOUNTS)[number],
  (typeof MOCK_ADMIN_ACCOUNTS)[number],
]
const START = Date.parse('2026-11-13T00:00:00Z')
let currentTime = START

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  currentTime = START
  resetAuthMock({ now: () => currentTime })
})
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function login(account: string, password: string): Promise<Response> {
  return post('/login', { account, password })
}

describe('POST /login', () => {
  it('账号密码正确时返回登录状态，之后 /me 也返回同一账号', async () => {
    const response = await login(staff.admin.account, staff.password)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      ok: true,
      data: {
        expiresAt: new Date(START + 30 * 24 * 60 * 60 * 1000).toISOString(),
        admin: staff.admin,
      },
    })

    const me = await fetch(`${baseURL}/me`)
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual(body)
  })

  it('密码错误和账号不存在都返回 BAD_PASSWORD', async () => {
    for (const response of [
      await login(staff.admin.account, 'wrong'),
      await login('nobody', 'x'),
    ]) {
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        ok: false,
        code: 'BAD_PASSWORD',
        message: '账号或密码错误',
      })
    }
  })

  it('缺少字段返回 VALIDATION_FAILED', async () => {
    const response = await post('/login', { account: staff.admin.account })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' })
  })

  it('15 分钟内失败 5 次后锁定，锁定期间密码正确也不放行，并带 Retry-After', async () => {
    for (let i = 1; i < LOGIN_LOCK.maxFailures; i += 1) {
      expect((await login(staff.admin.account, 'wrong')).status).toBe(401)
    }
    const fifth = await login(staff.admin.account, 'wrong')
    expect(fifth.status).toBe(429)
    expect(fifth.headers.get('Retry-After')).toBe(String(LOGIN_LOCK.lockMs / 1000))
    expect(await fifth.json()).toMatchObject({ ok: false, code: 'TOO_MANY_ATTEMPTS' })

    currentTime += 60_000
    const correct = await login(staff.admin.account, staff.password)
    expect(correct.status).toBe(429)
    expect(correct.headers.get('Retry-After')).toBe(String(LOGIN_LOCK.lockMs / 1000 - 60))

    currentTime = START + LOGIN_LOCK.lockMs
    expect((await login(staff.admin.account, staff.password)).status).toBe(200)
  })

  it('账号不存在也计数并锁定', async () => {
    for (let i = 1; i < LOGIN_LOCK.maxFailures; i += 1) await login('nobody', 'x')
    expect((await login('nobody', 'x')).status).toBe(429)
  })

  it('失败间隔超过 15 分钟时重新计数', async () => {
    for (let i = 1; i < LOGIN_LOCK.maxFailures; i += 1) await login(staff.admin.account, 'wrong')
    currentTime += LOGIN_LOCK.windowMs
    expect((await login(staff.admin.account, 'wrong')).status).toBe(401)
  })

  it('登录成功后失败次数清零', async () => {
    for (let i = 1; i < LOGIN_LOCK.maxFailures; i += 1) await login(staff.admin.account, 'wrong')
    expect((await login(staff.admin.account, staff.password)).status).toBe(200)
    expect((await login(staff.admin.account, 'wrong')).status).toBe(401)
  })
})

describe('GET /me 与 POST /logout', () => {
  it('未登录时 /me 和 /logout 都返回 NEED_LOGIN', async () => {
    for (const response of [await fetch(`${baseURL}/me`), await post('/logout')]) {
      expect(response.status).toBe(401)
      expect(await response.json()).toMatchObject({ ok: false, code: 'NEED_LOGIN' })
    }
  })

  it('退出登录后 /me 返回 NEED_LOGIN', async () => {
    await login(staff.admin.account, staff.password)
    const logout = await post('/logout')
    expect(await logout.json()).toEqual({ ok: true, data: null })
    expect((await fetch(`${baseURL}/me`)).status).toBe(401)
  })

  it('通行证过期后 /me 返回 NEED_LOGIN', async () => {
    await login(staff.admin.account, staff.password)
    currentTime += 30 * 24 * 60 * 60 * 1000
    expect((await fetch(`${baseURL}/me`)).status).toBe(401)
  })
})

describe('POST /password', () => {
  const strongPassword = 'a-much-stronger-pass'

  it('未登录返回 NEED_LOGIN', async () => {
    const response = await post('/password', { oldPassword: 'x', newPassword: strongPassword })
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'NEED_LOGIN' })
  })

  it('旧密码错误返回 BAD_PASSWORD（旧密码错误）', async () => {
    await login(newbie.admin.account, newbie.password)
    const response = await post('/password', { oldPassword: 'wrong', newPassword: strongPassword })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      ok: false,
      code: 'BAD_PASSWORD',
      message: '旧密码错误',
    })
  })

  it.each([
    ['少于 12 位', 'short-pass'],
    ['常见密码（不区分大小写）', 'PASSWORD1234'],
    ['与旧密码相同', newbie.password],
  ])('新密码%s时返回 WEAK_PASSWORD', async (_, newPassword) => {
    await login(newbie.admin.account, newbie.password)
    const response = await post('/password', { oldPassword: newbie.password, newPassword })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, code: 'WEAK_PASSWORD' })
  })

  it('改好后会话作废、mustChangePassword 变为 false，只能用新密码登录', async () => {
    await login(newbie.admin.account, newbie.password)
    const response = await post('/password', {
      oldPassword: newbie.password,
      newPassword: strongPassword,
    })
    expect(await response.json()).toEqual({ ok: true, data: null })
    expect((await fetch(`${baseURL}/me`)).status).toBe(401)

    expect((await login(newbie.admin.account, newbie.password)).status).toBe(401)
    const relogin = await login(newbie.admin.account, strongPassword)
    expect(await relogin.json()).toMatchObject({
      ok: true,
      data: { admin: { mustChangePassword: false } },
    })
  })

  it('resetAuthMock 恢复初始账号', async () => {
    await login(newbie.admin.account, newbie.password)
    await post('/password', { oldPassword: newbie.password, newPassword: strongPassword })
    resetAuthMock({ now: () => currentTime })
    expect((await login(newbie.admin.account, newbie.password)).status).toBe(200)
  })
})

describe('isWeakPassword', () => {
  it('12 位以上、不常见、与旧密码不同时通过', () => {
    expect(isWeakPassword('abcdefghijk1', 'old')).toBe(false)
    expect(isWeakPassword('abcdefghijk', 'old')).toBe(true)
  })
})
