import { expect, expectTypeOf, it } from 'vitest'
import { ApiError, isErrorCode } from '@/api/http'
import { CLIENT_ERROR_MESSAGES, ERROR_CODE, getErrorMessage } from './error-code'

/** 中文：校验可引用错误码与本地文案一致，无副作用。 English: Check each descriptor and safe message. */
it.each(Object.entries(ERROR_CODE))(
  '错误常量 %s 同时提供一致的 code 和文案',
  function testDescriptor(key, value) {
    expect(value.code).toBe(key)
    expect(value.message.trim()).not.toBe('')
    expect(getErrorMessage(value.code)).toBe(value.message)
  },
)

/** 中文：未知码和原型属性只返回通用提示。 English: Unknown and inherited keys use safe fallback text. */
it.each(['FUTURE_RULE', '__proto__', 'toString', ''])(
  '未知错误码 %j 使用安全提示',
  function testFallback(code) {
    expect(getErrorMessage(code)).toBe(CLIENT_ERROR_MESSAGES.http)
  },
)

/** 中文：匹配后收窄未知错误及精确码，无副作用。 English: Narrow an unknown error to its literal code. */
it('业务判断通过常量收窄错误类型', function testErrorNarrowing() {
  const error: unknown = new ApiError('business', 401, ERROR_CODE.BAD_PASSWORD.code)
  if (!isErrorCode(error, ERROR_CODE.BAD_PASSWORD)) throw new Error('expected-business-error')
  expectTypeOf(error).toExtend<ApiError>()
  expectTypeOf(error.code).toEqualTypeOf<'BAD_PASSWORD'>()
  expect(error.message).toBe(ERROR_CODE.BAD_PASSWORD.message)
})

/** 中文：拒绝不同业务码、客户端错误及冒充对象。 English: Reject mismatches, client errors and impostors. */
it.each([
  new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code),
  new ApiError('business', 409, 'FUTURE_RULE'),
  new ApiError('network'),
  new ApiError('http', 401, ERROR_CODE.BAD_PASSWORD.code),
  new Error(ERROR_CODE.BAD_PASSWORD.code),
  { code: ERROR_CODE.BAD_PASSWORD.code, kind: 'business' },
  null,
  undefined,
  [],
])('错误守卫拒绝不匹配输入 %#', function testNonmatchingError(error) {
  expect(isErrorCode(error, ERROR_CODE.BAD_PASSWORD)).toBe(false)
})
