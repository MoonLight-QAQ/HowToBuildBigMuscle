import type { ErrorCode, ErrorKind } from '@/types/http'

export const ERROR_CODE = {
  VALIDATION_FAILED: { code: 'VALIDATION_FAILED', message: '参数校验失败，请检查输入' },
  NEED_LOGIN: { code: 'NEED_LOGIN', message: '登录已失效，请重新登录' },
  FORBIDDEN: { code: 'FORBIDDEN', message: '没有权限执行此操作' },
  NOT_FOUND: { code: 'NOT_FOUND', message: '数据不存在或已被删除' },
  INVALID_STATUS: { code: 'INVALID_STATUS', message: '当前状态不允许此操作，请刷新后重试' },
  VERSION_CONFLICT: { code: 'VERSION_CONFLICT', message: '数据已被他人修改，请刷新后重试' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '服务器开小差了，请稍后重试' },
  BAD_PASSWORD: { code: 'BAD_PASSWORD', message: '账号或密码错误' },
  TOO_MANY_ATTEMPTS: { code: 'TOO_MANY_ATTEMPTS', message: '尝试次数过多，请稍后再试' },
  PASSWORD_CHANGE_REQUIRED: { code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
  WEAK_PASSWORD: { code: 'WEAK_PASSWORD', message: '新密码至少 12 位，且不能是常见密码或旧密码' },
  NAME_DUPLICATED: { code: 'NAME_DUPLICATED', message: '名称已存在' },
  CATEGORY_IN_USE: { code: 'CATEGORY_IN_USE', message: '类目仍在使用，无法删除' },
  STOCK_BELOW_LOCKED: { code: 'STOCK_BELOW_LOCKED', message: '账面库存不能小于已锁定的件数' },
  LAST_SLOT: { code: 'LAST_SLOT', message: '至少需要保留一个送达时段' },
  SUBURB_IN_OTHER_ZONE: {
    code: 'SUBURB_IN_OTHER_ZONE',
    message: '该 suburb 已属于其他配送大区，请先移出',
  },
  SUBURB_STATE_MISMATCH: {
    code: 'SUBURB_STATE_MISMATCH',
    message: 'suburb 所在的州与城市所属的州不一致',
  },
  LISTING_NOT_ON_SALE: { code: 'LISTING_NOT_ON_SALE', message: '帖子已不是在售状态，请刷新后重试' },
  // 仅预留渠道接入错误，不决定退款审核状态。 / Reserved; never changes refund review state.
  REFUND_PAYOUT_FAILED: {
    code: 'REFUND_PAYOUT_FAILED',
    message: '退款渠道请求失败，请核实渠道进度',
  },
  UPLOAD_NOT_ALLOWED: { code: 'UPLOAD_NOT_ALLOWED', message: '图片类型或大小不符合要求' },
} as const satisfies { [Code in ErrorCode]: { readonly code: Code; readonly message: string } }

export type ErrorDefinition = (typeof ERROR_CODE)[ErrorCode]

export const CLIENT_ERROR_MESSAGES: Record<Exclude<ErrorKind, 'business'>, string> = {
  http: '请求失败，请稍后重试',
  network: '网络连接失败，请检查网络',
  timeout: '请求超时，请稍后重试',
  canceled: '请求已取消',
  protocol: '接口数据不符合约定，请联系管理员',
}

/** /logout 失败且不能确认会话已结束时的提示（网络错误、超时、5xx 等） */
export const LOGOUT_UNCONFIRMED_MESSAGE = '退出失败，登录可能仍然有效，请检查网络后重试'

/** 改密码时旧密码错误（BAD_PASSWORD）的提示。登录时同一个错误码提示「账号或密码错误」 */
export const OLD_PASSWORD_WRONG_MESSAGE = '旧密码错误'

/** 按错误码返回安全文案，未知码使用通用提示。 / Map a code to safe text; unknown codes use a fallback.
 * 参数/Params: 服务端 code。返回/Returns: 中文文案，无副作用 / Chinese text, no side effects.
 */
export function getErrorMessage(code: string): string {
  return Object.hasOwn(ERROR_CODE, code)
    ? ERROR_CODE[code as ErrorCode].message
    : CLIENT_ERROR_MESSAGES.http
}
