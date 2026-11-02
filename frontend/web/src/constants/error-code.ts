import type { ErrorCode, ErrorKind } from '@/types/http'

export const ERROR_MESSAGES = {
  VALIDATION_FAILED: '参数校验失败，请检查输入',
  NEED_LOGIN: '登录已失效，请重新登录',
  FORBIDDEN: '没有权限执行此操作',
  NOT_FOUND: '数据不存在或已被删除',
  INVALID_STATUS: '当前状态不允许此操作，请刷新后重试',
  VERSION_CONFLICT: '数据已被他人修改，请刷新后重试',
  INTERNAL_ERROR: '服务器开小差了，请稍后重试',
  BAD_PASSWORD: '账号或密码错误',
  NAME_DUPLICATED: '名称已存在',
  CATEGORY_IN_USE: '类目仍在使用，无法删除',
  STOCK_BELOW_LOCKED: '账面库存不能小于已锁定的件数',
  LAST_SLOT: '至少需要保留一个送达时段',
  LISTING_NOT_ON_SALE: '帖子已不是在售状态，请刷新后重试',
  // 仅预留渠道接入错误，不决定退款审核状态。 / Reserved; never changes refund review state.
  REFUND_PAYOUT_FAILED: '退款渠道请求失败，请核实渠道进度',
  UPLOAD_NOT_ALLOWED: '图片类型或大小不符合要求',
} satisfies Record<ErrorCode, string>

export const CLIENT_ERROR_MESSAGES: Record<Exclude<ErrorKind, 'business'>, string> = {
  http: '请求失败，请稍后重试',
  network: '网络连接失败，请检查网络',
  timeout: '请求超时，请稍后重试',
  canceled: '请求已取消',
  protocol: '接口数据不符合约定，请联系管理员',
}

/** 按错误码返回安全文案，未知码使用通用提示。 / Map a code to safe text; unknown codes use a fallback.
 * 参数/Params: 服务端 code。返回/Returns: 中文文案，无副作用 / Chinese text, no side effects.
 */
export function getErrorMessage(code: string): string {
  return Object.hasOwn(ERROR_MESSAGES, code)
    ? ERROR_MESSAGES[code as ErrorCode]
    : CLIENT_ERROR_MESSAGES.http
}
