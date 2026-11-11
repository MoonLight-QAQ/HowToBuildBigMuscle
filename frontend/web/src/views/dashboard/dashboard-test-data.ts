import type { Summary } from '@/api/dashboard'

/** 创建虚构概览快照；输入字段覆盖，返回独立嵌套数据，无副作用。
 * / Create a fictional summary with optional overrides and independent nested data, without effects.
 */
export function createSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    pendingOrderCount: 3,
    deliveringOrderCount: 2,
    openRefundCount: 1,
    openReportCount: 4,
    cities: [
      {
        id: '9000000000000000040',
        nameZh: '演示线下城市',
        fulfillment: 'local',
        deliverableZoneNamesZh: ['演示可送大区'],
      },
      {
        id: '9000000000000000041',
        nameZh: '演示快递城市',
        fulfillment: 'post',
        deliverableZoneNamesZh: [],
      },
    ],
    localFeeCents: 600,
    postFeeCents: 800,
    freeShippingThresholdCents: 5000,
    ...overrides,
  }
}

/** 构建可控制时序的概览读取；无输入，返回Promise及结算方法，仅供生命周期测试。
 * / Create a controllable summary read with a promise and settlement methods for lifecycle tests.
 */
export function deferredSummary() {
  let resolve!: (summary: Summary) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<Summary>(
    /** 保存结算入口，不执行读写请求。 / Capture settlement functions without requests. */
    function capture(accept, decline) {
      resolve = accept
      reject = decline
    },
  )
  return { promise, resolve, reject }
}
