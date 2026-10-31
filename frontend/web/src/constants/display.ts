import type { MockScenario } from '@/types/api'

export const NAVIGATION_ITEMS = [
  { path: '/products', label: '商品' },
  { path: '/mall-categories', label: '商城类目' },
  { path: '/delivery', label: '配送' },
  { path: '/cities', label: '城市' },
] as const

export const MOCK_SCENARIOS: ReadonlyArray<{ value: MockScenario; label: string }> = [
  { value: 'success', label: '正常数据' },
  { value: 'empty', label: '暂无数据' },
  { value: 'unauthorized', label: '会话失效' },
  { value: 'forbidden', label: '没有权限' },
  { value: 'validation', label: '参数错误' },
  { value: 'conflict', label: '数据冲突' },
  { value: 'network', label: '网络失败' },
  { value: 'malformed', label: '响应格式异常' },
]
