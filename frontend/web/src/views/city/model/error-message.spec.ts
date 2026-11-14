/**
 * error-message.ts 的单元测试。
 *
 * 其他模块照着写时：复制 error-message.ts 后，这个测试也一起复制。
 */
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'
import { toErrorMessage } from './error-message'

describe('toErrorMessage', () => {
  it('ApiError 使用它的 message', () => {
    const error = new ApiError('business', 409, 'NAME_DUPLICATED')
    expect(toErrorMessage(error)).toBe(error.message)
  })

  it('其他错误使用通用提示', () => {
    expect(toErrorMessage(new Error('boom'))).toBe(CLIENT_ERROR_MESSAGES.http)
    expect(toErrorMessage('boom')).toBe(CLIENT_ERROR_MESSAGES.http)
  })
})
