export const ERROR_CODE = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
  HTTP_ERROR: 'HTTP_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHORIZED: '请先完成管理员登录。',
  FORBIDDEN: '当前管理员没有读取此内容的权限。',
  VALIDATION_ERROR: '请求参数未通过校验。',
  CONFLICT: '数据状态发生冲突，请重新读取。',
  INTERNAL_ERROR: '服务暂不可用，请稍后重试。',
  NETWORK_ERROR: '网络连接失败，请重试。',
  TIMEOUT: '请求超时，请重试。',
  CANCELLED: '请求已取消。',
  MALFORMED_RESPONSE: '响应格式不符合接口契约。',
  HTTP_ERROR: '请求未成功，请稍后重试。',
  UNKNOWN_ERROR: '读取失败，请稍后重试。',
}
