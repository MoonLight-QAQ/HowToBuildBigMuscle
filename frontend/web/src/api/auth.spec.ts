import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestOptions } from '@/types/http'
import { changePassword, getMe, login, logout, parseLoginResult, type LoginResult } from './auth'
import { http } from './http'

const result: LoginResult = {
  expiresAt: '2026-12-13T00:00:00Z',
  admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
}

/** 拦截请求层：记录调用的路径和选项，用解析器处理给定的 data；解析失败时返回被拒绝的 Promise，与真实请求层一致 */
function stubRequest(data: unknown) {
  return vi
    .spyOn(http, 'request')
    .mockImplementation(async (_path: string, options: RequestOptions<unknown>) =>
      options.parse(data),
    )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('auth 接口函数', () => {
  it('login：POST /login，不通知登录适配器，返回解析后的登录状态', async () => {
    const request = stubRequest({ ...result, token: 'should-be-dropped' })

    await expect(login({ account: 'staff', password: 'secret' })).resolves.toEqual(result)
    expect(request).toHaveBeenCalledWith(
      '/login',
      expect.objectContaining({
        method: 'POST',
        data: { account: 'staff', password: 'secret' },
        anonymous: true,
      }),
    )
  })

  it('getMe：GET /me，不通知登录适配器', async () => {
    const request = stubRequest(result)

    await expect(getMe()).resolves.toEqual(result)
    const [path, options] = request.mock.calls[0] ?? []
    expect(path).toBe('/me')
    expect(options).toMatchObject({ anonymous: true })
    expect(options?.method).toBeUndefined()
  })

  it('logout：POST /logout，data 必须为 null', async () => {
    const request = stubRequest(null)

    await expect(logout()).resolves.toBeUndefined()
    expect(request).toHaveBeenCalledWith(
      '/logout',
      expect.objectContaining({ method: 'POST', anonymous: true }),
    )

    stubRequest({})
    await expect(logout()).rejects.toThrow()
  })

  it('changePassword：POST /password，登录失效时交给请求层处理', async () => {
    const request = stubRequest(null)
    const body = { oldPassword: 'old', newPassword: 'a-much-stronger-pass' }

    await expect(changePassword(body)).resolves.toBeUndefined()
    const [path, options] = request.mock.calls[0] ?? []
    expect(path).toBe('/password')
    expect(options).toMatchObject({ method: 'POST', data: body })
    expect(options?.anonymous).toBeFalsy()

    stubRequest({ ok: true })
    await expect(changePassword(body)).rejects.toThrow()
  })
})

describe('parseLoginResult', () => {
  it('只保留契约中的字段', () => {
    expect(
      parseLoginResult({
        ...result,
        token: 'leaked',
        extra: 1,
        admin: { ...result.admin, role: 'root' },
      }),
    ).toEqual(result)
  })

  it.each([
    ['null', null],
    ['缺少 expiresAt', { admin: result.admin }],
    ['admin 为 null', { expiresAt: result.expiresAt, admin: null }],
    ['admin 不是对象', { expiresAt: result.expiresAt, admin: 'staff' }],
    ['id 不是字符串', { ...result, admin: { ...result.admin, id: 1 } }],
    ['缺少 mustChangePassword', { ...result, admin: { id: '1', account: 'staff' } }],
    [
      'mustChangePassword 不是布尔值',
      { ...result, admin: { ...result.admin, mustChangePassword: 'no' } },
    ],
  ])('%s 时抛错', (_, value) => {
    expect(() => parseLoginResult(value)).toThrow('invalid-login-result')
  })
})
