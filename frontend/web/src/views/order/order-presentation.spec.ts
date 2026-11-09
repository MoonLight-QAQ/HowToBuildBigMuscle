import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import type { OrderStatus } from '@/api/order'
import {
  arriveLabel,
  canMarkArrived,
  canStartDelivery,
  deliveryWindow,
  orderErrorMessage,
  startDeliveryLabel,
} from './order-presentation'
import { createOrder } from './order-test-data'

/** 验证订单操作矩阵及安全显示；不发请求。 / Verify action matrices and safe presentation without requests. */
describe('order presentation', function orderPresentationSuite() {
  const actionMatrix: { status: OrderStatus; canStart: boolean; canArrive: boolean }[] = [
    { status: 'unpaid', canStart: false, canArrive: false },
    { status: 'pending', canStart: true, canArrive: true },
    { status: 'delivering', canStart: false, canArrive: true },
    { status: 'done', canStart: false, canArrive: false },
    { status: 'refunding', canStart: false, canArrive: false },
    { status: 'refunded', canStart: false, canArrive: false },
    { status: 'cancelled', canStart: false, canArrive: false },
  ]
  /** 对照PRD的七行验收矩阵验证权限。 / Check permissions against the seven-row PRD acceptance matrix. */
  it.each(actionMatrix)('gates actions for $status', function checkActions(testCase) {
    expect(canStartDelivery(testCase.status)).toBe(testCase.canStart)
    expect(canMarkArrived(testCase.status)).toBe(testCase.canArrive)
  })
  /** 配送方式和直接送达使用正确操作文案。 / Fulfillment and direct arrival use the correct action labels. */
  it('labels local, postal and direct arrival actions', function checkLabels() {
    expect(startDeliveryLabel('local')).toBe('开始配送')
    expect(startDeliveryLabel('post')).toBe('标记已寄出')
    expect(arriveLabel('pending')).toBe('直接标记已送达')
    expect(arriveLabel('delivering')).toBe('标记已送达')
  })
  /** 时段按城市时区显示，快递不泄漏本地时段。 / Render the city timezone and omit local slots for postal orders. */
  it('renders saved slots with daylight saving and postal differences', function checkSlots() {
    expect(deliveryWindow(createOrder())).toBe('2026-11-02 18:00:00 至 2026-11-02 20:00:00')
    expect(deliveryWindow(createOrder({ fulfillment: 'post' }))).toBe('快递')
    expect(deliveryWindow(createOrder({ slotStartAt: null }))).toBe('—')
  })
  /** 只输出安全错误映射，不回显未知异常消息。 / Render safe mapped errors instead of arbitrary exception text. */
  it('shows safe errors', function checkErrors() {
    expect(orderErrorMessage(new ApiError('business', 409, ERROR_CODE.VERSION_CONFLICT.code))).toBe(
      ERROR_CODE.VERSION_CONFLICT.message,
    )
    expect(orderErrorMessage(new Error('private contact phone'))).not.toContain('private contact')
  })
})
