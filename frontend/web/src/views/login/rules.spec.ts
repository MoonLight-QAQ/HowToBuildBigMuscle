import { describe, expect, it } from 'vitest'
import type { LoginResult } from '@/api/auth'
import { ApiError } from '@/api/http'
import {
  getChangePasswordErrorMessage,
  getLoginErrorMessage,
  getPostLoginPath,
  NEW_PASSWORD_MISMATCH_MESSAGE,
  validateNewPasswordConfirm,
} from './rules'

const business = (code: string, status = 400) => new ApiError('business', status, code)

describe('getLoginErrorMessage', () => {
  it.each([
    ['BAD_PASSWORD', business('BAD_PASSWORD', 401), '账号或密码错误'],
    ['TOO_MANY_ATTEMPTS', business('TOO_MANY_ATTEMPTS', 429), '尝试次数过多，请稍后再试'],
    ['网络错误', new ApiError('network'), '网络连接失败，请检查网络'],
    ['非 ApiError', new Error('boom'), '请求失败，请稍后重试'],
  ])('%s', (_, error, message) => {
    expect(getLoginErrorMessage(error)).toBe(message)
  })
})

describe('getChangePasswordErrorMessage', () => {
  it.each([
    ['BAD_PASSWORD 提示旧密码错误', business('BAD_PASSWORD', 401), '旧密码错误'],
    ['WEAK_PASSWORD', business('WEAK_PASSWORD'), '新密码至少 12 位，且不能是常见密码或旧密码'],
    ['超时', new ApiError('timeout'), '请求超时，请稍后重试'],
    ['非 ApiError', 'oops', '请求失败，请稍后重试'],
  ])('%s', (_, error, message) => {
    expect(getChangePasswordErrorMessage(error)).toBe(message)
  })
})

describe('validateNewPasswordConfirm', () => {
  it('一致时通过，不一致时返回提示', () => {
    expect(validateNewPasswordConfirm('same-password', 'same-password')).toBeNull()
    expect(validateNewPasswordConfirm('same-password', 'other')).toBe(NEW_PASSWORD_MISMATCH_MESSAGE)
  })
})

describe('getPostLoginPath', () => {
  const result = (mustChangePassword: boolean): LoginResult => ({
    expiresAt: '2026-12-13T00:00:00Z',
    admin: { id: '9000000000000000001', account: 'staff', mustChangePassword },
  })

  it('须先改密码时去改密码页，忽略 redirect', () => {
    expect(getPostLoginPath(result(true), '/orders')).toBe('/change-password')
  })

  it('否则回到 redirect 指定的站内页面', () => {
    expect(getPostLoginPath(result(false), '/orders?status=paid')).toBe('/orders?status=paid')
  })

  it('redirect 缺失或不是站内路径时回首页', () => {
    expect(getPostLoginPath(result(false), undefined)).toBe('/')
    expect(getPostLoginPath(result(false), 'https://evil.example.com')).toBe('/')
  })
})
